from backend.database import SessionLocal
from backend.models import Product, Tenant
db = SessionLocal()
tenant = db.query(Tenant).first()
if tenant:
    print(f"Tenant: {tenant.name} - ID: {tenant.id}")
    products = db.query(Product).filter(Product.tenant_id == tenant.id).all()
    print(f"Total products: {len(products)}")
    for p in products:
        print(f"ID: {p.id}, Name: {p.name}, Stock: {p.stock}, Active: {p.is_active}")
else:
    print("No tenants found.")
