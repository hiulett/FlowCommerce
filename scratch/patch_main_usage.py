import re

with open("backend/main.py", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update /api/super/ai-usage
old_usage = """@app.get("/api/super/ai-usage")
def get_ai_usage_stats(db: Session = Depends(get_db)):
    from sqlalchemy import func
    from backend.models import AITenantUsage, Tenant
    # Group by tenant
    results = db.query(
        AITenantUsage.tenant_id,
        Tenant.name,
        func.sum(AITenantUsage.input_tokens).label("total_input"),
        func.sum(AITenantUsage.output_tokens).label("total_output"),
        func.sum(AITenantUsage.total_cost).label("total_cost")
    ).join(Tenant, Tenant.id == AITenantUsage.tenant_id).group_by(AITenantUsage.tenant_id, Tenant.name).all()
    
    usage_list = []
    for r in results:
        usage_list.append({
            "tenant_id": str(r.tenant_id),
            "tenant_name": r.name,
            "input_tokens": int(r.total_input or 0),
            "output_tokens": int(r.total_output or 0),
            "total_cost": float(r.total_cost or 0.0)
        })
    return usage_list"""

new_usage = """@app.get("/api/super/ai-usage")
def get_ai_usage_stats(period: str = "monthly", db: Session = Depends(get_db)):
    from sqlalchemy import func
    from backend.models import AITenantUsage, Tenant
    from datetime import datetime, timedelta
    
    query = db.query(
        AITenantUsage.tenant_id,
        Tenant.name,
        Tenant.ai_spending_limit,
        func.sum(AITenantUsage.input_tokens).label("total_input"),
        func.sum(AITenantUsage.output_tokens).label("total_output"),
        func.sum(AITenantUsage.total_cost).label("total_cost")
    ).join(Tenant, Tenant.id == AITenantUsage.tenant_id)
    
    now = datetime.utcnow()
    if period == "weekly":
        start_date = now - timedelta(days=7)
        query = query.filter(AITenantUsage.created_at >= start_date)
    elif period == "biweekly":
        start_date = now - timedelta(days=14)
        query = query.filter(AITenantUsage.created_at >= start_date)
    elif period == "monthly":
        start_date = now - timedelta(days=30)
        query = query.filter(AITenantUsage.created_at >= start_date)
        
    results = query.group_by(AITenantUsage.tenant_id, Tenant.name, Tenant.ai_spending_limit).all()
    
    usage_list = []
    for r in results:
        cost = float(r.total_cost or 0.0)
        limit = float(r.ai_spending_limit) if r.ai_spending_limit else None
        is_near_limit = False
        if limit and cost >= limit * 0.9:
            is_near_limit = True
            
        usage_list.append({
            "tenant_id": str(r.tenant_id),
            "tenant_name": r.name,
            "ai_spending_limit": limit,
            "input_tokens": int(r.total_input or 0),
            "output_tokens": int(r.total_output or 0),
            "total_cost": cost,
            "is_near_limit": is_near_limit
        })
    return usage_list"""
content = content.replace(old_usage, new_usage)

# 2. Update Tenant settings
old_tenant_update = """class TenantSettingsUpdate(BaseModel):
    whatsapp_phone_id: str = None
    whatsapp_access_token: str = None
    ai_system_prompt: str = None"""
new_tenant_update = """class TenantSettingsUpdate(BaseModel):
    whatsapp_phone_id: str = None
    whatsapp_access_token: str = None
    ai_system_prompt: str = None
    ai_spending_limit: float = None"""
content = content.replace(old_tenant_update, new_tenant_update)

# Also update the settings endpoint logic where TenantSettingsUpdate is used
settings_search = """        if data.ai_system_prompt is not None:
            tenant.ai_system_prompt = data.ai_system_prompt"""
settings_replace = """        if data.ai_system_prompt is not None:
            tenant.ai_system_prompt = data.ai_system_prompt
        if data.ai_spending_limit is not None:
            tenant.ai_spending_limit = data.ai_spending_limit"""
content = content.replace(settings_search, settings_replace)

# 3. Add to /api/super/tenants return schema if applicable
# Let's verify where tenants are returned

with open("backend/main.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated backend API")
