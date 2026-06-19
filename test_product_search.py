import sys
import os
# Add the workspace directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from sqlalchemy.orm import Session
from sqlalchemy import and_
from backend.database import SessionLocal
from backend.models import Product, Tenant

def test():
    db = SessionLocal()
    tenant = db.query(Tenant).first()
    if not tenant:
        print("No tenant found.")
        return
        
    print(f"Tenant: {tenant.name} ({tenant.id})")
    
    # List all products for this tenant
    products = db.query(Product).filter(Product.tenant_id == tenant.id).all()
    print(f"Total products: {len(products)}")
    for p in products:
        print(f"- '{p.name}' | Active: {p.is_active} | Stock: {p.stock} | Desc: {p.description}")
        
    # Test ilike search
    search_term = "Atlas golden light"
    match = db.query(Product).filter(
        and_(
            Product.tenant_id == tenant.id,
            Product.name.ilike(f"%{search_term}%"),
            Product.is_active == True
        )
    ).first()
    print(f"\nSearch for '{search_term}': {match.name if match else 'Not found'}")
    
    search_term2 = "Balbo roja"
    match2 = db.query(Product).filter(
        and_(
            Product.tenant_id == tenant.id,
            Product.name.ilike(f"%{search_term2}%"),
            Product.is_active == True
        )
    ).first()
    print(f"Search for '{search_term2}': {match2.name if match2 else 'Not found'}")

if __name__ == '__main__':
    test()
