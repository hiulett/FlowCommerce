from backend.database import SessionLocal
from backend.models import Product

db = SessionLocal()
tenant_id = "40446806-0107-6201-9310-c9943efb3870"
products = db.query(Product).filter(Product.tenant_id == tenant_id).all()

print(f"Total products for tenant: {len(products)}")
for p in products:
    print(f"- {p.name}: active={p.is_active}, stock={p.stock}")

db.close()
