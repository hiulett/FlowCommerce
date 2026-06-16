from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any

app = FastAPI(
    title="FlowCommerce API",
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

# Mock de endpoints para WhatsApp Webhook
@app.get("/webhooks/whatsapp")
def verify_webhook(hub_mode: str = None, hub_challenge: int = None, hub_verify_token: str = None):
    # Endpoint de verificación requerido por Meta
    verify_token = "flowcommerce_token_123"
    if hub_mode == "subscribe" and hub_verify_token == verify_token:
        return hub_challenge
    raise HTTPException(status_code=403, detail="Invalid verification token")

@app.post("/webhooks/whatsapp")
def receive_message(payload: Dict[str, Any]):
    # Endpoint para recibir los webhooks de mensajes
    return {"status": "received", "message_id": payload.get("entry", [{}])[0].get("changes", [{}])[0].get("value", {}).get("messages", [{}])[0].get("id")}
