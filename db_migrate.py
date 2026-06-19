import sys
import os

# Agrega la ruta base al sys.path para poder importar modulos de backend
sys.path.append(r"C:\WorkSpace\FlowCommerce")

from backend.database import SessionLocal
from sqlalchemy import text

def alter_orders_table():
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE orders ADD COLUMN is_simulated BOOLEAN DEFAULT FALSE;"))
        db.commit()
        print("Migracion exitosa: columna is_simulated agregada a orders.")
    except Exception as e:
        print(f"Error (es posible que la columna ya exista): {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == '__main__':
    alter_orders_table()
