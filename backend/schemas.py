from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class WhatsAppText(BaseModel):
    body: str

class WhatsAppLocation(BaseModel):
    latitude: float
    longitude: float
    name: Optional[str] = None
    address: Optional[str] = None

class WhatsAppContactInfo(BaseModel):
    wa_id: str
    profile: Dict[str, Any]

class WhatsAppMessage(BaseModel):
    from_: str = Field(..., alias="from")
    id: str
    timestamp: str
    type: str
    text: Optional[WhatsAppText] = None
    location: Optional[WhatsAppLocation] = None
    audio: Optional[Dict[str, Any]] = None
    image: Optional[Dict[str, Any]] = None

class WhatsAppChangeValue(BaseModel):
    messaging_product: str
    metadata: Dict[str, Any]
    contacts: Optional[List[WhatsAppContactInfo]] = None
    messages: Optional[List[WhatsAppMessage]] = None

class WhatsAppChange(BaseModel):
    value: WhatsAppChangeValue
    field: str

class WhatsAppEntry(BaseModel):
    id: str
    changes: List[WhatsAppChange]

class WhatsAppWebhookPayload(BaseModel):
    object: str
    entry: List[WhatsAppEntry]
