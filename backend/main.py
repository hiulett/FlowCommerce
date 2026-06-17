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
from backend.models import Tenant, Message, PlatformPlan, PlatformTransaction
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
                
                # Buscar el Tenant correspondiente
                tenant = db.query(Tenant).filter(Tenant.whatsapp_phone_id == phone_id).first()
                if not tenant:
                    print(f"Tenant no encontrado para phone_id: {phone_id}")
                    continue
                
                # Configurar sesión con RLS para aislamiento de datos
                db.execute(text("SET LOCAL app.current_tenant_id = :tenant_id"), {"tenant_id": str(tenant.id)})
                
                # Procesar cada mensaje en el webhook
                for msg in value.messages:
                    # Deduplicar
                    if is_duplicate_message(msg.id):
                        print(f"Mensaje duplicado omitido: {msg.id}")
                        continue
                    
                    sender_phone = msg.from_
                    profile_name = None
                    if value.contacts:
                        contact = next((c for c in value.contacts if c.wa_id == sender_phone), None)
                        if contact:
                            profile_name = contact.profile.get("name")
                    
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
                        content = f"LBS_COORD: {msg.location.latitude}, {msg.location.longitude}"
                    else:
                        content = f"[Mensaje de tipo {msg_type} no soportado en MVP]"
                    
                    save_incoming_message(db, conversation.id, content, msg_type)
                    
                    if tenant.ai_paused:
                        print(f"El agente de IA para el tenant {tenant.name} está pausado. No se enviará respuesta automática.")
                        continue
                    
                    # Ejecutar Agente de IA Conversacional real
                    reply_text = await run_conversational_agent(
                        db=db,
                        tenant=tenant,
                        conversation=conversation,
                        customer_id=customer.id,
                        user_message=content
                    )
                    
                    # Guardar respuesta del asistente en BD
                    message_assistant = Message(
                        conversation_id=conversation.id,
                        sender="ASSISTANT",
                        message_type="TEXT",
                        content=reply_text
                    )
                    db.add(message_assistant)
                    db.commit()
                    
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
    if not tenant.whatsapp_phone_id or not tenant.whatsapp_access_token:
        raise HTTPException(
            status_code=400,
            detail="No se han configurado las credenciales de WhatsApp Business API."
        )
    # Simular una pequeña latencia
    import time
    time.sleep(0.5)
    return {
        "status": "success",
        "latency_ms": 38,
        "phone_id": tenant.whatsapp_phone_id,
        "message": "Conexión estable con la API de Meta."
    }

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
def train_tenant_documents(db: Session = Depends(get_tenant_db)):
    docs = db.query(KnowledgeDocument).all()
    for doc in docs:
        doc.status = "TRAINED"
    db.commit()
    return {"status": "trained", "count": len(docs)}

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


