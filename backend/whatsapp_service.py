import httpx
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from backend.config import settings
from backend.models import Tenant, Customer, Conversation, Message
import uuid

async def send_whatsapp_message(phone_id: str, access_token: str, to: str, text: str):
    """
    Envía un mensaje de texto de WhatsApp a un cliente mediante la API de Graph de Meta.
    """
    url = f"https://graph.facebook.com/{settings.META_API_VERSION}/{phone_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "text",
        "text": {
            "preview_url": False,
            "body": text
        }
    }

    print(f"[WHATSAPP] Enviando mensaje de salida a {to} a través del Phone ID {phone_id}...")
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            print(f"[WHATSAPP] Error al enviar mensaje a {to}: HTTP {response.status_code} - {response.text}")
            return None
        res_data = response.json()
        msg_id = res_data.get("messages", [{}])[0].get("id", "N/A")
        print(f"[WHATSAPP] Mensaje enviado con éxito a {to}. ID de mensaje de Meta: {msg_id}")
        return res_data

def get_or_create_customer(db: Session, tenant_id: uuid.UUID, phone_number: str, profile_name: Optional[str] = None) -> Customer:
    """
    Busca o registra un cliente en base de datos por su número de teléfono.
    """
    customer = db.query(Customer).filter(
        Customer.tenant_id == tenant_id,
        Customer.phone_number == phone_number
    ).first()

    if not customer:
        customer = Customer(
            tenant_id=tenant_id,
            phone_number=phone_number,
            full_name=profile_name
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
    elif profile_name and not customer.full_name:
        customer.full_name = profile_name
        db.commit()
        db.refresh(customer)

    return customer

def get_or_create_conversation(db: Session, tenant_id: uuid.UUID, customer_id: uuid.UUID) -> Conversation:
    """
    Busca o crea una conversación activa para el cliente.
    """
    conversation = db.query(Conversation).filter(
        Conversation.tenant_id == tenant_id,
        Conversation.customer_id == customer_id
    ).first()

    if not conversation:
        conversation = Conversation(
            tenant_id=tenant_id,
            customer_id=customer_id
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    else:
        conversation.last_interaction = datetime.utcnow()
        db.commit()

    return conversation

def save_incoming_message(db: Session, conversation_id: uuid.UUID, content: str, msg_type: str = "TEXT") -> Message:
    """
    Guarda un mensaje entrante del cliente en la base de datos.
    """
    message = Message(
        conversation_id=conversation_id,
        sender="CUSTOMER",
        message_type=msg_type,
        content=content
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
