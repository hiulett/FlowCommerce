from fastapi import FastAPI, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from typing import Dict, Any

from backend.config import settings
from backend.database import get_db, SessionLocal
from backend.schemas import WhatsAppWebhookPayload
from backend.redis_client import is_duplicate_message
from backend.models import Tenant
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
@app.get("/webhooks/whatsapp")
def verify_webhook(
    request: Request,
    hub_mode: str = None, 
    hub_challenge: int = None, 
    hub_verify_token: str = None
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
                    
                    # MOCK IA RESPUESTA (Hito 2 integrará RAG & Gemini)
                    # Envía eco de vuelta o mensaje de prueba
                    reply_text = f"Hola {profile_name or 'Cliente'}. He recibido tu mensaje: '{content}'. FlowCommerce IA está inicializándose."
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
