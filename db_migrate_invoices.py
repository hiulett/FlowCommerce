import psycopg2
import os

# Usaremos un connection string por defecto, asumiendo que el script correrá local en el container o host con acceso
DB_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:apchpl1718s**@localhost:5432/flowcommerce")

def migrate():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    try:
        # Add finance settings to tenants
        cur.execute("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tax_active BOOLEAN DEFAULT FALSE;")
        cur.execute("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tax_percentage NUMERIC(5, 2) DEFAULT 0.00;")
        cur.execute("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS base_delivery_fee NUMERIC(10, 2) DEFAULT 0.00;")
        
        # Create invoices table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS invoices (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                invoice_number VARCHAR(50) NOT NULL,
                status VARCHAR(30) DEFAULT 'PENDING',
                subtotal NUMERIC(10, 2) DEFAULT 0.00,
                tax_amount NUMERIC(10, 2) DEFAULT 0.00,
                delivery_fee NUMERIC(10, 2) DEFAULT 0.00,
                total_amount NUMERIC(10, 2) DEFAULT 0.00,
                issued_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                due_date TIMESTAMP WITHOUT TIME ZONE,
                payment_method VARCHAR(50)
            );
        """)

        # Add unique constraint to invoice_number per tenant
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'uq_tenant_invoice_number'
                ) THEN
                    ALTER TABLE invoices ADD CONSTRAINT uq_tenant_invoice_number UNIQUE (tenant_id, invoice_number);
                END IF;
            END
            $$;
        """)

        conn.commit()
        print("Migration successful.")
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
