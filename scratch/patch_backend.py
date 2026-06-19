import re

with open("backend/main.py", "r", encoding="utf-8") as f:
    content = f.read()

# Add AIKeyUpdate model
model_add = """class AIKeyUpdate(BaseModel):
    provider: Optional[str] = None
    name: Optional[str] = None
    api_key: Optional[str] = None
    model_name: Optional[str] = None
    supports_tools: Optional[bool] = None
    tasks: Optional[str] = None
    spending_limit: Optional[float] = None

@app.get("/api/super/ai-keys")"""
content = content.replace('@app.get("/api/super/ai-keys")', model_add)

# Add PUT endpoint
put_endpoint = """@app.put("/api/super/ai-keys/{key_id}")
def update_super_ai_key(key_id: str, data: AIKeyUpdate, db: Session = Depends(get_db)):
    from backend.models import PlatformAIKey
    from backend.ai_balancer import encrypt_key
    key_uuid = uuid.UUID(key_id)
    key_record = db.query(PlatformAIKey).filter(PlatformAIKey.id == key_uuid).first()
    if not key_record:
        raise HTTPException(status_code=404, detail="AI Key not found")
        
    if data.provider is not None:
        key_record.provider = data.provider
    if data.name is not None:
        key_record.name = data.name
    if data.api_key:
        key_record.api_key = encrypt_key(data.api_key)
    if data.model_name is not None:
        key_record.model_name = data.model_name
    if data.supports_tools is not None:
        key_record.supports_tools = data.supports_tools
    if data.tasks is not None:
        key_record.tasks = data.tasks
    if data.spending_limit is not None:
        key_record.spending_limit = data.spending_limit
        
    db.commit()
    db.refresh(key_record)
    return {
        "id": str(key_record.id),
        "provider": key_record.provider,
        "name": key_record.name,
        "model_name": key_record.model_name,
        "supports_tools": key_record.supports_tools,
        "tasks": key_record.tasks,
        "spending_limit": float(key_record.spending_limit) if key_record.spending_limit is not None else None,
        "current_spend": float(key_record.current_spend) if key_record.current_spend is not None else 0.0,
        "is_active": key_record.is_active
    }

@app.put("/api/super/ai-keys/{key_id}/toggle")"""
content = content.replace('@app.put("/api/super/ai-keys/{key_id}/toggle")', put_endpoint)

with open("backend/main.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated backend/main.py")
