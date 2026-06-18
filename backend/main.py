from fastapi import FastAPI, Depends, HTTPException, status, Request, BackgroundTasks, Query
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from typing import Dict, Any

from backend.config import settings
from backend.database import get_db, SessionLocal
from backend.schemas import WhatsAppWebhookPayload
from backend.redis_client import is_duplicate_message
from backend.models import Tenant, Message, PlatformPlan, PlatformTransaction, KnowledgeDocument
from backend.agent import run_conversational_agent
from backend.whatsapp_service import (
    get_or_create_customer,
    get_or_create_conversation,
    save_incoming_message,
    send_whatsapp_message
)

app = FastAPI(
    title="FlowCommerce API Gateway",
    description="SaaS Multi-Tenant de Ventas Automatizadas por WhatsApp e IA",
    version="1.0.0"
)

@app.on_event("startup")
def startup_db_migration():
    print("[MIGRATION] Running startup database migrations...")
    from backend.database import Base, engine
    # Crear tablas que no existan
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(30) DEFAULT 'DELIVERY';"))
        db.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;"))
        db.commit()
        print("[MIGRATION] Startup database migrations completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"[MIGRATION] Error running startup database migrations: {e}")
    finally:
        db.close()



# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "FlowCommerce API Gateway",
        "documentation": "/docs"
    }

# Endpoint de verificación requerido por Meta (WhatsApp API Setup)
@app.get("/webhooks/whatsapp", response_class=PlainTextResponse)
def verify_webhook(
    request: Request,
    hub_mode: str = Query(None, alias="hub.mode"), 
    hub_challenge: str = Query(None, alias="hub.challenge"), 
    hub_verify_token: str = Query(None, alias="hub.verify_token")
):
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        return hub_challenge
    raise HTTPException(status_code=403, detail="Invalid verification token")

async def process_whatsapp_event(payload: WhatsAppWebhookPayload):
    """
    Procesa de forma asíncrona el mensaje entrante de WhatsApp,
    usando Row-Level Security (RLS) y guardando los logs correspondientes.
    """
    db = SessionLocal()
    try:
        for entry in payload.entry:
            for change in entry.changes:
                value = change.value
                if not value.messages:
                    continue
                
                # Obtener metadatos del destinatario
                phone_id = value.metadata.get("phone_number_id")
                print(f"[WEBHOOK] Evento de WhatsApp recibido. Metadata Phone ID: {phone_id}")
                
                # Buscar el Tenant correspondiente
                tenant = db.query(Tenant).filter(Tenant.whatsapp_phone_id == phone_id).first()
                if not tenant:
                    print(f"[WEBHOOK] Tenant no encontrado para phone_id: {phone_id}")
                    continue
                
                print(f"[WEBHOOK] Asociado al Tenant: {tenant.name} (ID: {tenant.id})")
                
                # Configurar sesión con RLS para aislamiento de datos
                print(f"[RLS] Estableciendo app.current_tenant_id = {tenant.id} en la sesión de base de datos")
                db.execute(text("SET LOCAL app.current_tenant_id = :tenant_id"), {"tenant_id": str(tenant.id)})
                
                # Procesar cada mensaje en el webhook
                for msg in value.messages:
                    # Deduplicar
                    if is_duplicate_message(msg.id):
                        print(f"[WEBHOOK] Mensaje duplicado omitido: {msg.id}")
                        continue
                    
                    sender_phone = msg.from_
                    profile_name = None
                    if value.contacts:
                        contact = next((c for c in value.contacts if c.wa_id == sender_phone), None)
                        if contact:
                            profile_name = contact.profile.get("name")
                    
                    print(f"[WEBHOOK] Procesando mensaje ID {msg.id} de cliente {sender_phone} ({profile_name or 'Sin Nombre'})")
                    
                    # Registrar/Actualizar cliente
                    customer = get_or_create_customer(db, tenant.id, sender_phone, profile_name)
                    
                    # Registrar/Obtener conversación
                    conversation = get_or_create_conversation(db, tenant.id, customer.id)
                    
                    # Guardar mensaje
                    content = ""
                    msg_type = msg.type.upper()
                    if msg.text:
                        content = msg.text.body
                    elif msg.location:
                        lat = msg.location.latitude
                        lon = msg.location.longitude
                        content = f"Ubicación recibida: Lat {lat}, Lon {lon}"
                        
                        # Buscar el último pedido activo del cliente para asociarle la ubicación
                        from backend.models import Order
                        active_order = db.query(Order).filter(
                            Order.customer_id == customer.id,
                            Order.status.in_(["PENDING_PAYMENT", "NEW", "PREPARING"])
                        ).order_by(Order.created_at.desc()).first()
                        
                        if active_order:
                            active_order.latitude = lat
                            active_order.longitude = lon
                            db.commit()
                            print(f"[DB] Ubicación guardada con éxito en el Pedido ID: {active_order.id}")
                    else:
                        content = f"[Mensaje de tipo {msg_type} no soportado en MVP]"
                    
                    save_incoming_message(db, conversation.id, content, msg_type)
                    print(f"[DB] Guardado mensaje entrante de {sender_phone} ({msg_type}): '{content}'")
                    
                    if tenant.ai_paused:
                        print(f"[IA] El agente de IA para el tenant {tenant.name} está pausado. Omitiendo respuesta automática.")
                        continue
                    
                    if msg_type == "LOCATION":
                        reply_text = "¡Ubicación de entrega registrada correctamente! 📍 Hemos asociado tu ubicación al pedido en preparación para que nuestro repartidor pueda llegar sin problemas. ¡Muchas gracias!"
                    else:
                        # Ejecutar Agente de IA Conversacional real
                        print(f"[IA] Iniciando agente conversacional para cliente {sender_phone}...")
                        reply_text = await run_conversational_agent(
                            db=db,
                            tenant=tenant,
                            conversation=conversation,
                            customer_id=customer.id,
                            user_message=content
                        )
                    print(f"[IA] Agente conversacional completado con respuesta: '{reply_text}'")
                    
                    # Guardar respuesta del asistente en BD
                    message_assistant = Message(
                        conversation_id=conversation.id,
                        sender="ASSISTANT",
                        message_type="TEXT",
                        content=reply_text
                    )
                    db.add(message_assistant)
                    db.commit()
                    print(f"[DB] Guardada respuesta del asistente en base de datos.")
                    
                    # Enviar mensaje oficial al WhatsApp
                    await send_whatsapp_message(
                        phone_id=tenant.whatsapp_phone_id,
                        access_token=tenant.whatsapp_access_token,
                        to=sender_phone,
                        text=reply_text
                    )
    except Exception as e:
        print(f"Error procesando evento de WhatsApp: {str(e)}")
        db.rollback()
    finally:
        db.close()

# Endpoint para recibir los webhooks de mensajes
@app.post("/webhooks/whatsapp")
def receive_message(payload: WhatsAppWebhookPayload, background_tasks: BackgroundTasks):
    # Encolar procesamiento asíncrono y retornar 200 de inmediato
    background_tasks.add_task(process_whatsapp_event, payload)
    return {"status": "received"}

# ─── Super Admin Endpoints ───────────────────────────────────────────────────
from pydantic import BaseModel
import uuid

class SuperTenantUpdate(BaseModel):
    name: str = None
    owner_name: str = None
    owner_email: str = None
    plan: str = None
    status: str = None

class SuperPlanUpdate(BaseModel):
    price: float
    max_msgs: int

@app.get("/api/super/tenants")
def get_super_tenants(db: Session = Depends(get_db)):
    tenants = db.query(Tenant).all()
    return tenants

@app.put("/api/super/tenants/{tenant_id}")
def update_super_tenant(tenant_id: str, data: SuperTenantUpdate, db: Session = Depends(get_db)):
    tenant_uuid = uuid.UUID(tenant_id)
    tenant = db.query(Tenant).filter(Tenant.id == tenant_uuid).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if data.name is not None:
        tenant.name = data.name
    if data.owner_name is not None:
        tenant.owner_name = data.owner_name
    if data.owner_email is not None:
        tenant.owner_email = data.owner_email
    if data.plan is not None:
        tenant.plan = data.plan
    if data.status is not None:
        tenant.status = data.status
    db.commit()
    db.refresh(tenant)
    return tenant

@app.get("/api/super/plans")
def get_super_plans(db: Session = Depends(get_db)):
    plans = db.query(PlatformPlan).all()
    return plans

@app.put("/api/super/plans/{key}")
def update_super_plan(key: str, data: SuperPlanUpdate, db: Session = Depends(get_db)):
    plan = db.query(PlatformPlan).filter(PlatformPlan.key == key).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan.price = data.price
    plan.max_msgs = data.max_msgs
    db.commit()
    db.refresh(plan)
    return plan

@app.get("/api/super/billing")
def get_super_billing(db: Session = Depends(get_db)):
    logs = db.query(PlatformTransaction).order_by(PlatformTransaction.date.desc()).all()
    return logs

@app.put("/api/super/billing/{tx_id}/refund")
def refund_super_transaction(tx_id: str, db: Session = Depends(get_db)):
    tx_uuid = uuid.UUID(tx_id)
    tx = db.query(PlatformTransaction).filter(PlatformTransaction.id == tx_uuid).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    tx.status = "REFUNDED"
    db.commit()
    db.refresh(tx)
    return tx

class AIKeyCreate(BaseModel):
    provider: str
    name: str
    api_key: str
    model_name: str
    supports_tools: bool = True

@app.get("/api/super/ai-keys")
def get_super_ai_keys(db: Session = Depends(get_db)):
    from backend.models import PlatformAIKey
    keys = db.query(PlatformAIKey).all()
    # Mask API key for security in responses
    response_keys = []
    for k in keys:
        response_keys.append({
            "id": str(k.id),
            "provider": k.provider,
            "name": k.name,
            "api_key": "********",
            "model_name": k.model_name,
            "supports_tools": k.supports_tools,
            "is_active": k.is_active,
            "failed_attempts": k.failed_attempts,
            "cool_down_until": k.cool_down_until,
            "last_used": k.last_used,
            "created_at": k.created_at
        })
    return response_keys

@app.post("/api/super/ai-keys")
def create_super_ai_key(data: AIKeyCreate, db: Session = Depends(get_db)):
    from backend.models import PlatformAIKey
    from backend.ai_balancer import encrypt_key
    encrypted = encrypt_key(data.api_key)
    new_key = PlatformAIKey(
        provider=data.provider,
        name=data.name,
        api_key=encrypted,
        model_name=data.model_name,
        supports_tools=data.supports_tools,
        is_active=True
    )
    db.add(new_key)
    db.commit()
    db.refresh(new_key)
    return {
        "id": str(new_key.id),
        "provider": new_key.provider,
        "name": new_key.name,
        "model_name": new_key.model_name,
        "supports_tools": new_key.supports_tools,
        "is_active": new_key.is_active
    }

@app.put("/api/super/ai-keys/{key_id}/toggle")
def toggle_super_ai_key(key_id: str, db: Session = Depends(get_db)):
    from backend.models import PlatformAIKey
    key_uuid = uuid.UUID(key_id)
    key_record = db.query(PlatformAIKey).filter(PlatformAIKey.id == key_uuid).first()
    if not key_record:
        raise HTTPException(status_code=404, detail="AI Key not found")
    key_record.is_active = not key_record.is_active
    db.commit()
    db.refresh(key_record)
    return {"status": "success", "is_active": key_record.is_active}

@app.delete("/api/super/ai-keys/{key_id}")
def delete_super_ai_key(key_id: str, db: Session = Depends(get_db)):
    from backend.models import PlatformAIKey
    key_uuid = uuid.UUID(key_id)
    key_record = db.query(PlatformAIKey).filter(PlatformAIKey.id == key_uuid).first()
    if not key_record:
        raise HTTPException(status_code=404, detail="AI Key not found")
    db.delete(key_record)
    db.commit()
    return {"status": "success", "message": "AI Key deleted"}

# ─── Tenant Admin Endpoints (Multi-Tenant with RLS) ───────────────────────────
from backend.database import get_tenant_db
from backend.models import Customer, Order, OrderItem, Payment, KnowledgeDocument, Product

class TenantSettingsUpdate(BaseModel):
    whatsapp_phone_id: str = None
    whatsapp_access_token: str = None
    ai_system_prompt: str = None

class DocumentCreateUpdate(BaseModel):
    title: str
    type: str
    content: str = ""

class OrderStatusUpdate(BaseModel):
    status: str

class BroadcastPayload(BaseModel):
    message: str

@app.get("/api/tenant/settings")
def get_tenant_settings(db: Session = Depends(get_tenant_db)):
    tenant = db.query(Tenant).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant context not found")
    return {
        "whatsapp_phone_id": tenant.whatsapp_phone_id or "",
        "whatsapp_access_token": tenant.whatsapp_access_token or "",
        "ai_system_prompt": tenant.ai_system_prompt or "",
        "ai_paused": tenant.ai_paused or False
    }

@app.put("/api/tenant/settings")
def update_tenant_settings(data: TenantSettingsUpdate, db: Session = Depends(get_tenant_db)):
    tenant = db.query(Tenant).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant context not found")
    if data.whatsapp_phone_id is not None:
        tenant.whatsapp_phone_id = data.whatsapp_phone_id
    if data.whatsapp_access_token is not None:
        tenant.whatsapp_access_token = data.whatsapp_access_token
    if data.ai_system_prompt is not None:
        tenant.ai_system_prompt = data.ai_system_prompt
    db.commit()
    db.refresh(tenant)
    return tenant

@app.post("/api/tenant/settings/toggle-ai")
def toggle_ai(db: Session = Depends(get_tenant_db)):
    tenant = db.query(Tenant).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant context not found")
    tenant.ai_paused = not tenant.ai_paused
    db.commit()
    db.refresh(tenant)
    return {"status": "success", "ai_paused": tenant.ai_paused}

@app.post("/api/tenant/settings/test-meta")
def test_meta_api(db: Session = Depends(get_tenant_db)):
    tenant = db.query(Tenant).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant context not found")
    phone_id = settings.WHATSAPP_PHONE_ID or tenant.whatsapp_phone_id
    access_token = settings.WHATSAPP_ACCESS_TOKEN or tenant.whatsapp_access_token
    if not phone_id or not access_token:
        raise HTTPException(
            status_code=400,
            detail="No se han configurado las credenciales de WhatsApp Business API."
        )
    
    import requests
    import time
    
    start_time = time.time()
    url = f"https://graph.facebook.com/{settings.META_API_VERSION}/{phone_id}"
    params = {"access_token": access_token}
    
    try:
        response = requests.get(url, params=params, timeout=10)
        latency_ms = int((time.time() - start_time) * 1000)
        
        if response.status_code == 200:
            data = response.json()
            phone_num = data.get("display_phone_number", "Número de prueba")
            return {
                "status": "success",
                "latency_ms": latency_ms,
                "phone_id": phone_id,
                "message": f"Conexión exitosa con Meta Cloud API. Número registrado: {phone_num}"
            }
        else:
            try:
                err_data = response.json()
                err_msg = err_data.get("error", {}).get("message", "Error de credenciales en Meta API.")
            except Exception:
                err_msg = f"HTTP {response.status_code}"
            
            raise HTTPException(
                status_code=400,
                detail=f"Fallo de autenticación con Meta: {err_msg}"
            )
    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error de red al conectar con Meta: {str(e)}"
        )

class TestMessagePayload(BaseModel):
    recipient_phone: str

@app.post("/api/tenant/settings/test-message")
async def test_whatsapp_messaging(data: TestMessagePayload, db: Session = Depends(get_tenant_db)):
    tenant = db.query(Tenant).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant context not found")
    
    phone_id = settings.WHATSAPP_PHONE_ID or tenant.whatsapp_phone_id
    access_token = settings.WHATSAPP_ACCESS_TOKEN or tenant.whatsapp_access_token
    if not phone_id or not access_token:
        raise HTTPException(
            status_code=400,
            detail="No se han configurado las credenciales de WhatsApp Business API."
        )
    
    from backend.whatsapp_service import send_whatsapp_message
    
    test_text = "Esta es una prueba de mensajería real desde FlowCommerce para verificar tu conexión de salida."
    res = await send_whatsapp_message(
        phone_id=phone_id,
        access_token=access_token,
        to=data.recipient_phone,
        text=test_text
    )
    
    if res and "messages" in res:
        return {
            "status": "success",
            "message": f"Mensaje de prueba enviado con éxito a {data.recipient_phone}.",
            "message_id": res["messages"][0]["id"]
        }
    else:
        raise HTTPException(
            status_code=400,
            detail="Error al enviar el mensaje de prueba a través de Meta API."
        )

@app.post("/api/tenant/broadcast")
def send_mass_broadcast(data: BroadcastPayload, db: Session = Depends(get_tenant_db)):
    tenant = db.query(Tenant).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant context not found")
    
    customers = db.query(Customer).all()
    sent_count = 0
    
    for customer in customers:
        from backend.whatsapp_service import get_or_create_conversation
        conversation = get_or_create_conversation(db, tenant.id, customer.id)
        
        msg = Message(
            conversation_id=conversation.id,
            sender="ASSISTANT",
            message_type="TEXT",
            content=data.message
        )
        db.add(msg)
        sent_count += 1
        
    db.commit()
    return {
        "status": "success",
        "sent_count": sent_count,
        "message": f"Difusión enviada con éxito a {sent_count} clientes."
    }

@app.get("/api/tenant/documents")
def get_tenant_documents(db: Session = Depends(get_tenant_db)):
    docs = db.query(KnowledgeDocument).order_by(KnowledgeDocument.last_updated.desc()).all()
    return docs

@app.post("/api/tenant/documents")
def create_tenant_document(data: DocumentCreateUpdate, db: Session = Depends(get_tenant_db)):
    tenant = db.query(Tenant).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant context not found")
    word_count = len([w for w in data.content.split() if w])
    doc = KnowledgeDocument(
        tenant_id=tenant.id,
        title=data.title,
        type=data.type,
        content=data.content,
        word_count=word_count,
        status="PENDING"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@app.put("/api/tenant/documents/{doc_id}")
def update_tenant_document(doc_id: str, data: DocumentCreateUpdate, db: Session = Depends(get_tenant_db)):
    doc_uuid = uuid.UUID(doc_id)
    doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == doc_uuid).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.title = data.title
    doc.type = data.type
    doc.content = data.content
    doc.word_count = len([w for w in data.content.split() if w])
    db.commit()
    db.refresh(doc)
    return doc

@app.delete("/api/tenant/documents/{doc_id}")
def delete_tenant_document(doc_id: str, db: Session = Depends(get_tenant_db)):
    doc_uuid = uuid.UUID(doc_id)
    doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == doc_uuid).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()
    return {"status": "deleted"}

@app.post("/api/tenant/documents/train")
async def train_tenant_documents(db: Session = Depends(get_tenant_db)):
    from decimal import Decimal
    from backend.ai_service import parse_catalog_document_to_products, get_embedding
    from backend.models import Product, Category, Tenant
    
    tenant = db.query(Tenant).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant context not found")

    docs = db.query(KnowledgeDocument).all()
    for doc in docs:
        doc.status = "TRAINED"
    db.commit()

    # Buscar documentos de tipo CATALOG o con título "menu"
    catalog_docs = db.query(KnowledgeDocument).filter(KnowledgeDocument.type == "CATALOG").all()
    if not catalog_docs:
        catalog_docs = db.query(KnowledgeDocument).filter(KnowledgeDocument.title.ilike("%menu%")).all()

    parsed_count = 0
    if catalog_docs:
        extracted_products = []
        for doc in catalog_docs:
            if doc.content:
                parsed = await parse_catalog_document_to_products(doc.content)
                extracted_products.extend(parsed)
        
        if extracted_products:
            active_product_names = []
            for item in extracted_products:
                name = item.get("name")
                if not name:
                    continue
                active_product_names.append(name.lower())
                
                description = item.get("description", "")
                price = item.get("price", 0.0)
                stock = item.get("stock", 10)
                category_name = item.get("category", "General")
                
                # Obtener o crear categoría
                category = db.query(Category).filter(
                    Category.tenant_id == tenant.id,
                    Category.name.ilike(category_name)
                ).first()
                if not category:
                    category = Category(tenant_id=tenant.id, name=category_name)
                    db.add(category)
                    db.commit()
                    db.refresh(category)
                
                # Generar embedding del producto
                embedding_vector = await get_embedding(f"{name} {description}")
                
                # Upsert producto
                prod = db.query(Product).filter(
                    Product.tenant_id == tenant.id,
                    Product.name.ilike(name)
                ).first()
                
                if prod:
                    prod.description = description
                    prod.price = Decimal(str(price))
                    prod.stock = stock
                    prod.category_id = category.id
                    prod.is_active = True
                    prod.embedding = embedding_vector
                else:
                    prod = Product(
                        tenant_id=tenant.id,
                        category_id=category.id,
                        name=name,
                        description=description,
                        price=Decimal(str(price)),
                        stock=stock,
                        is_active=True,
                        embedding=embedding_vector
                    )
                    db.add(prod)
                db.commit()
                parsed_count += 1
            
            # Desactivar productos anteriores que no están en el nuevo catálogo
            if active_product_names:
                old_products = db.query(Product).filter(
                    Product.tenant_id == tenant.id,
                    Product.is_active == True
                ).all()
                for p in old_products:
                    if p.name.lower() not in active_product_names:
                        p.is_active = False
                db.commit()

    return {"status": "trained", "count": len(docs), "products_extracted": parsed_count}


@app.get("/api/tenant/orders")
def get_tenant_orders(db: Session = Depends(get_tenant_db)):
    orders = db.query(Order).order_by(Order.created_at.desc()).all()
    result = []
    for o in orders:
        items = []
        for item in o.items:
            product_name = item.product.name if item.product else "Producto Desconocido"
            items.append({
                "name": product_name,
                "quantity": item.quantity,
                "price": float(item.price)
            })
        payment_method = o.payment.gateway if o.payment else "Efectivo"
        
        short_id = str(o.id).split("-")[-1][:4]
        if "0000000000001" in str(o.id):
            short_id = str(o.id).split("00000000")[-1]

        result.append({
            "id": short_id,
            "uuid": str(o.id),
            "customerName": o.customer.full_name if o.customer else "Cliente",
            "phone": o.customer.phone_number if o.customer else "",
            "paymentMethod": payment_method,
            "total": float(o.total_amount),
            "status": o.status,
            "createdAt": o.created_at.isoformat(),
            "items": items
        })
    return result

@app.put("/api/tenant/orders/{order_id}/status")
def update_tenant_order_status(order_id: str, data: OrderStatusUpdate, db: Session = Depends(get_tenant_db)):
    order = None
    try:
        order_uuid = uuid.UUID(order_id)
        order = db.query(Order).filter(Order.id == order_uuid).first()
    except ValueError:
        orders = db.query(Order).all()
        for o in orders:
            if str(o.id).endswith(order_id):
                order = o
                break
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.status = data.status
    db.commit()
    db.refresh(order)
    return {"status": "success", "order_id": str(order.id), "new_status": order.status}

@app.post("/api/tenant/orders/{order_id}/invoice")
async def send_order_invoice(order_id: str, db: Session = Depends(get_tenant_db)):
    order = None
    try:
        order_uuid = uuid.UUID(order_id)
        order = db.query(Order).filter(Order.id == order_uuid).first()
    except ValueError:
        orders = db.query(Order).all()
        for o in orders:
            if str(o.id).endswith(order_id):
                order = o
                break
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    tenant = db.query(Tenant).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant context not found")
        
    customer = order.customer
    if not customer:
        raise HTTPException(status_code=400, detail="El pedido no tiene un cliente asociado.")
        
    # Construir cuerpo de la factura
    short_order_id = str(order.id).split("-")[-1][:6].upper()
    date_str = order.created_at.strftime("%Y-%m-%d %H:%M")
    
    invoice_text = (
        f"====================================\n"
        f"🧾 FACTURA DE VENTA - {tenant.name.upper()}\n"
        f"====================================\n"
        f"Factura #: FACT-{short_order_id}\n"
        f"Fecha: {date_str}\n"
        f"Cliente: {customer.full_name or 'Cliente Anónimo'}\n"
        f"Teléfono: {customer.phone_number}\n"
        f"------------------------------------\n"
        f"Cant. Producto        P.Unit  Subtotal\n"
        f"------------------------------------\n"
    )
    
    for item in order.items:
        prod_name = item.product.name[:20]
        subtotal = item.quantity * item.price
        invoice_text += f"{item.quantity}x    {prod_name:<17} ${item.price:<6} ${subtotal:.2f}\n"
        
    payment_method = order.payment.gateway if order.payment else "Efectivo"
    
    invoice_text += (
        f"------------------------------------\n"
        f"TOTAL PAGADO: ${order.total_amount:.2f}\n"
        f"Método de Pago: {payment_method}\n"
        f"Estado: {order.status}\n"
        f"------------------------------------\n"
        f"¡Gracias por su compra en FlowCommerce!\n"
        f"===================================="
    )
    
    # Enviar por WhatsApp
    phone_id = settings.WHATSAPP_PHONE_ID or tenant.whatsapp_phone_id
    access_token = settings.WHATSAPP_ACCESS_TOKEN or tenant.whatsapp_access_token
    if not phone_id or not access_token:
        raise HTTPException(
            status_code=400,
            detail="No se han configurado las credenciales de WhatsApp Business API."
        )
        
    from backend.whatsapp_service import send_whatsapp_message
    
    res = await send_whatsapp_message(
        phone_id=phone_id,
        access_token=access_token,
        to=customer.phone_number,
        text=invoice_text
    )
    
    if res and "messages" in res:
        return {
            "status": "success",
            "message": "Factura enviada correctamente por WhatsApp.",
            "invoice": invoice_text
        }
    else:
        raise HTTPException(
            status_code=400,
            detail="Error al enviar la factura por WhatsApp a través de Meta API."
        )

@app.get("/api/tenant/customers")
def get_tenant_customers(db: Session = Depends(get_tenant_db)):
    customers = db.query(Customer).all()
    result = []
    for c in customers:
        orders_count = db.query(Order).filter(Order.customer_id == c.id).count()
        last_order = db.query(Order).filter(Order.customer_id == c.id).order_by(Order.created_at.desc()).first()
        last_date = last_order.created_at.isoformat().split("T")[0] if last_order else "-"
        total_spent = sum([float(o.total_amount) for o in db.query(Order).filter(Order.customer_id == c.id, Order.status != "CANCELLED").all()])
        
        result.append({
            "id": str(c.id),
            "name": c.full_name or "Cliente Anónimo",
            "phone": c.phone_number,
            "ordersCount": orders_count,
            "totalSpent": total_spent,
            "lastOrder": last_date
        })
    return result

@app.get("/api/tenant/conversations")
def get_tenant_conversations(db: Session = Depends(get_tenant_db)):
    from backend.models import Conversation, Message, Customer
    conversations = db.query(Conversation).order_by(Conversation.last_interaction.desc()).all()
    result = []
    for conv in conversations:
        customer = db.query(Customer).filter(Customer.id == conv.customer_id).first()
        last_msg = db.query(Message).filter(Message.conversation_id == conv.id).order_by(Message.created_at.desc()).first()
        
        result.append({
            "id": str(conv.id),
            "customer_id": str(conv.customer_id),
            "customer_name": customer.full_name if customer else "Cliente Anónimo",
            "customer_phone": customer.phone_number if customer else "",
            "last_interaction": conv.last_interaction.isoformat(),
            "last_message": last_msg.content if last_msg else "",
            "last_message_sender": last_msg.sender if last_msg else "",
            "last_message_time": last_msg.created_at.isoformat() if last_msg else conv.last_interaction.isoformat()
        })
    return result

@app.get("/api/tenant/conversations/{conversation_id}/messages")
def get_conversation_messages(conversation_id: str, db: Session = Depends(get_tenant_db)):
    from backend.models import Conversation, Message
    conv_uuid = uuid.UUID(conversation_id)
    conv = db.query(Conversation).filter(Conversation.id == conv_uuid).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    messages = db.query(Message).filter(Message.conversation_id == conv_uuid).order_by(Message.created_at.asc()).all()
    result = []
    for msg in messages:
        result.append({
            "id": str(msg.id),
            "sender": msg.sender,
            "message_type": msg.message_type,
            "content": msg.content,
            "created_at": msg.created_at.isoformat()
        })
    return result

class OperatorReplyPayload(BaseModel):
    reply: str

@app.post("/api/tenant/conversations/{conversation_id}/reply")
async def send_operator_reply(conversation_id: str, data: OperatorReplyPayload, db: Session = Depends(get_tenant_db)):
    from backend.models import Conversation, Message, Customer, Tenant
    from datetime import datetime
    conv_uuid = uuid.UUID(conversation_id)
    conv = db.query(Conversation).filter(Conversation.id == conv_uuid).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    customer = db.query(Customer).filter(Customer.id == conv.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    tenant = db.query(Tenant).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant context not found")
        
    phone_id = settings.WHATSAPP_PHONE_ID or tenant.whatsapp_phone_id
    access_token = settings.WHATSAPP_ACCESS_TOKEN or tenant.whatsapp_access_token
    if not phone_id or not access_token:
        raise HTTPException(
            status_code=400,
            detail="No se han configurado las credenciales de WhatsApp Business API."
        )
        
    from backend.whatsapp_service import send_whatsapp_message
    
    res = await send_whatsapp_message(
        phone_id=phone_id,
        access_token=access_token,
        to=customer.phone_number,
        text=data.reply
    )
    
    if res and "messages" in res:
        msg = Message(
            conversation_id=conv.id,
            sender="ASSISTANT",
            message_type="TEXT",
            content=data.reply
        )
        db.add(msg)
        conv.last_interaction = datetime.utcnow()
        db.commit()
        db.refresh(msg)
        return {
            "status": "success",
            "message": {
                "id": str(msg.id),
                "sender": msg.sender,
                "message_type": msg.message_type,
                "content": msg.content,
                "created_at": msg.created_at.isoformat()
            }
        }
    else:
        raise HTTPException(
            status_code=400,
            detail="Error al enviar el mensaje de respuesta a través de Meta API."
        )


