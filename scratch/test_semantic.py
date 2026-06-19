from backend.database import SessionLocal
from backend.models import Product, Tenant
from backend.ai_service import get_embedding

db = SessionLocal()
tenant_id = "40446806-0107-6201-9310-c9943efb3870"
t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
print(f"Tenant: {t.name}")

prods = db.query(Product).filter(Product.tenant_id == tenant_id).all()
print(f"Total products: {len(prods)}")
for p in prods:
    print(f" - {p.name}: active={p.is_active}, stock={p.stock}, has_embedding={p.embedding is not None}")

from sqlalchemy import and_

query_embedding = get_embedding("hola")

print("--- Fallback search ---")
fb_results = db.query(Product).filter(
    Product.tenant_id == tenant_id,
    Product.is_active == True
).limit(5).all()
print(f"Fallback results: {len(fb_results)}")

print("--- PGVector search ---")
try:
    results = db.query(Product).filter(
        and_(
            Product.tenant_id == tenant_id,
            Product.is_active == True
        )
    ).order_by(
        Product.embedding.cosine_distance(query_embedding)
    ).limit(5).all()
    print(f"PGVector results: {len(results)}")
except Exception as e:
    print(f"Exception: {e}")

db.close()
