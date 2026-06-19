from backend.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE tenants ADD COLUMN business_rules TEXT;"))
        conn.commit()
        print("Added business_rules column.")
    except Exception as e:
        print(f"Error business_rules: {e}")
        
    try:
        conn.execute(text("ALTER TABLE tenants ADD COLUMN sales_techniques TEXT;"))
        conn.commit()
        print("Added sales_techniques column.")
    except Exception as e:
        print(f"Error sales_techniques: {e}")
