import os
from sqlalchemy.sql import text
from backend.database import engine, Base, SessionLocal
from backend.models import Tenant, User, PlatformPlan, PlatformTransaction, Customer, Order, OrderItem, Payment, KnowledgeDocument, Product
import uuid

def init_database():
    """
    Inicializa físicamente la base de datos en el contenedor PostgreSQL local:
    1. Crea las extensiones requeridas en la base de datos.
    2. Crea todas las tablas mediante SQLAlchemy.
    3. Ejecuta el script backend/init_db.sql para configurar RLS y pgvector.
    4. Inserte datos mock iniciales (Tenant de pruebas y Usuario admin).
    """
    print("Creando extensiones SQL en Postgres...")
    db = SessionLocal()
    try:
        db.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        db.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'))
        db.commit()
        print("Extensiones creadas con éxito.")
    except Exception as e:
        db.rollback()
        print(f"Error al crear extensiones: {str(e)}")
    finally:
        db.close()

    print("Eliminando tablas existentes en Postgres...")
    Base.metadata.drop_all(bind=engine)
    print("Iniciando creación de tablas con SQLAlchemy...")
    Base.metadata.create_all(bind=engine)
    print("Tablas creadas con éxito.")

    print("Ejecutando configuraciones adicionales y políticas de RLS...")
    # Leer el script SQL de inicialización
    sql_file_path = os.path.join(os.path.dirname(__file__), "init_db.sql")
    if os.path.exists(sql_file_path):
        with open(sql_file_path, "r", encoding="utf-8") as f:
            sql_statements = f.read().split(";")
        
        # Ejecutar sentencias SQL individuales
        db = SessionLocal()
        try:
            for statement in sql_statements:
                statement = statement.strip()
                if statement:
                    db.execute(text(statement))
            db.commit()
            print("Políticas RLS e inicialización de pgvector completadas.")
        except Exception as e:
            db.rollback()
            print(f"Error al aplicar políticas RLS: {str(e)}")
        finally:
            db.close()
    else:
        print("Advertencia: No se encontró backend/init_db.sql")

    # Insertar Tenant y Usuario Admin de prueba si no existen
    db = SessionLocal()
    try:
        # Sembrar planes de plataforma
        plan_count = db.query(PlatformPlan).count()
        if plan_count == 0:
            print("Sembrando planes de suscripción de la plataforma...")
            plans = [
                PlatformPlan(key="starter", name="Starter", price=0.00, max_msgs=5000, max_agents=2),
                PlatformPlan(key="professional", name="Professional", price=49.00, max_msgs=25000, max_agents=5),
                PlatformPlan(key="enterprise", name="Enterprise", price=149.00, max_msgs=999999, max_agents=99)
            ]
            db.add_all(plans)
            db.commit()
            print("Planes sembrados con éxito.")

        # Verificar si hay tenants
        tenant_count = db.query(Tenant).count()
        if tenant_count == 0:
            print("Sembrando tenants de demostración...")
            tenants = [
                Tenant(id=uuid.UUID("40446806-0107-6201-9310-c9943efb3870"), name="Pizza Nexus", whatsapp_phone_id="109283746501928", whatsapp_access_token="TEST_ACCESS_TOKEN_EAAGb", ai_system_prompt="Eres el asistente virtual de ventas oficial para la Pizzería Nexus. Tu tono es entusiasta y alegre. Solo recomiendas productos del catálogo.", status="ACTIVE", plan="Professional", owner_name="GC Corp", owner_email="admin@nexus.com", storage_used=45, messages_count=12450),
                Tenant(id=uuid.UUID("40446806-0107-6201-9310-c9943efb3871"), name="Burger Tech", whatsapp_phone_id="109283746501929", whatsapp_access_token="TEST_ACCESS_TOKEN_EAAGb", ai_system_prompt="Eres el asistente virtual de Burger Tech.", status="ACTIVE", plan="Starter", owner_name="Laura Gómez", owner_email="laura@burger.io", storage_used=12, messages_count=4200),
                Tenant(id=uuid.UUID("40446806-0107-6201-9310-c9943efb3872"), name="Sushi Bot", whatsapp_phone_id="109283746501930", whatsapp_access_token="TEST_ACCESS_TOKEN_EAAGb", ai_system_prompt="Eres el asistente virtual de Sushi Bot.", status="SUSPENDED", plan="Enterprise", owner_name="Carlos Ruiz", owner_email="carlos@sushibot.com", storage_used=230, messages_count=89100),
                Tenant(id=uuid.UUID("40446806-0107-6201-9310-c9943efb3873"), name="Coffee AI", whatsapp_phone_id="109283746501931", whatsapp_access_token="TEST_ACCESS_TOKEN_EAAGb", ai_system_prompt="Eres el asistente virtual de Coffee AI.", status="ACTIVE", plan="Starter", owner_name="Isaac Mendoza", owner_email="isaac@coffeai.net", storage_used=8, messages_count=1100),
                Tenant(id=uuid.UUID("40446806-0107-6201-9310-c9943efb3874"), name="Demo Bakery", whatsapp_phone_id="109283746501932", whatsapp_access_token="TEST_ACCESS_TOKEN_EAAGb", ai_system_prompt="Eres el asistente virtual de Demo Bakery.", status="DEMO", plan="Starter", owner_name="Sofía Silva", owner_email="sofia@demo.com", storage_used=2, messages_count=250)
            ]
            db.add_all(tenants)
            db.commit()
            print("Tenants de demostración sembrados.")

            # Crear usuario administrador para Pizza Nexus
            print("Creando usuario administrador de prueba (admin@nexus.com)...")
            admin_user = User(
                tenant_id=uuid.UUID("40446806-0107-6201-9310-c9943efb3870"),
                email="admin@nexus.com",
                password_hash="pbkdf2:sha256:260000$local_mock_hash", # Hash simulado
                role="ADMIN"
            )
            db.add(admin_user)
            db.commit()
            print("Usuario administrador creado con éxito (User: admin@nexus.com / Contraseña: local).")

        # Sembrar transacciones de plataforma
        tx_count = db.query(PlatformTransaction).count()
        if tx_count == 0:
            print("Sembrando transacciones de facturación de la plataforma...")
            txs = [
                PlatformTransaction(id=uuid.UUID("a01d5c5f-cfd7-4632-9c1b-f8a1e80ad45b"), tenant_id=uuid.UUID("40446806-0107-6201-9310-c9943efb3870"), tenant_name="Pizza Nexus", amount=49.00, status="PAID", gateway="Stripe"),
                PlatformTransaction(id=uuid.UUID("b01d5c5f-cfd7-4632-9c1b-f8a1e80ad45c"), tenant_id=uuid.UUID("40446806-0107-6201-9310-c9943efb3872"), tenant_name="Sushi Bot", amount=149.00, status="FAILED", gateway="Stripe"),
                PlatformTransaction(id=uuid.UUID("c01d5c5f-cfd7-4632-9c1b-f8a1e80ad45d"), tenant_id=uuid.UUID("40446806-0107-6201-9310-c9943efb3873"), tenant_name="Coffee AI", amount=15.00, status="PAID", gateway="WhatsApp Pay"),
                PlatformTransaction(id=uuid.UUID("d01d5c5f-cfd7-4632-9c1b-f8a1e80ad45e"), tenant_id=uuid.UUID("40446806-0107-6201-9310-c9943efb3871"), tenant_name="Burger Tech", amount=0.00, status="PAID", gateway="Stripe"),
                PlatformTransaction(id=uuid.UUID("e01d5c5f-cfd7-4632-9c1b-f8a1e80ad45f"), tenant_id=uuid.UUID("40446806-0107-6201-9310-c9943efb3870"), tenant_name="Pizza Nexus", amount=49.00, status="PAID", gateway="Stripe")
            ]
            db.add_all(txs)
            db.commit()
            print("Transacciones sembradas con éxito.")

        # Sembrar datos para Pizzería Nexus
        nexus_id = uuid.UUID("40446806-0107-6201-9310-c9943efb3870")
        
        # 1. Sembrar productos/catálogo
        if db.query(Product).filter(Product.tenant_id == nexus_id).count() == 0:
            print("Sembrando catálogo de productos para Pizzería Nexus...")
            p1 = Product(id=uuid.UUID("d01d5c5f-cfd7-4632-9c1b-f8a1e80ad701"), tenant_id=nexus_id, name="Pizza Familiar Pepperoni", description="Pizza deliciosa con doble pepperoni y queso mozzarella premium", price=14.99, stock=10)
            p2 = Product(id=uuid.UUID("d01d5c5f-cfd7-4632-9c1b-f8a1e80ad702"), tenant_id=nexus_id, name="Gaseosa Coca-Cola 2L", description="Fria refrescante", price=3.50, stock=20)
            p3 = Product(id=uuid.UUID("d01d5c5f-cfd7-4632-9c1b-f8a1e80ad703"), tenant_id=nexus_id, name="Hamburguesa Nexus doble queso", description="Doble carne angus, queso cheddar y salsa especial", price=9.50, stock=15)
            p4 = Product(id=uuid.UUID("d01d5c5f-cfd7-4632-9c1b-f8a1e80ad704"), tenant_id=nexus_id, name="Papas fritas grandes", description="Crujientes y doradas", price=4.00, stock=30)
            p5 = Product(id=uuid.UUID("d01d5c5f-cfd7-4632-9c1b-f8a1e80ad705"), tenant_id=nexus_id, name="Alitas BBQ x12", description="Acompañadas de aderezo ranch", price=11.00, stock=12)
            p6 = Product(id=uuid.UUID("d01d5c5f-cfd7-4632-9c1b-f8a1e80ad706"), tenant_id=nexus_id, name="Pizza Margherita", description="Albahaca fresca, tomate cherry y mozzarella", price=12.50, stock=8)
            db.add_all([p1, p2, p3, p4, p5, p6])
            db.commit()
            print("Catálogo de productos sembrado.")

        # 2. Sembrar clientes
        if db.query(Customer).filter(Customer.tenant_id == nexus_id).count() == 0:
            print("Sembrando clientes para Pizzería Nexus...")
            cust_isaac = Customer(id=uuid.UUID("c01d5c5f-cfd7-4632-9c1b-f8a1e80ad601"), tenant_id=nexus_id, phone_number="573001234567", full_name="Isaac Mendoza")
            cust_laura = Customer(id=uuid.UUID("c01d5c5f-cfd7-4632-9c1b-f8a1e80ad602"), tenant_id=nexus_id, phone_number="573129876543", full_name="Laura Gómez")
            cust_carlos = Customer(id=uuid.UUID("c01d5c5f-cfd7-4632-9c1b-f8a1e80ad603"), tenant_id=nexus_id, phone_number="573155554433", full_name="Carlos Ruiz")
            cust_sofia = Customer(id=uuid.UUID("c01d5c5f-cfd7-4632-9c1b-f8a1e80ad604"), tenant_id=nexus_id, phone_number="573009998877", full_name="Sofía Silva")
            db.add_all([cust_isaac, cust_laura, cust_carlos, cust_sofia])
            db.commit()
            print("Clientes sembrados.")

            # 3. Sembrar pedidos, ítems y pagos
            print("Sembrando pedidos para Pizzería Nexus...")
            # Pizzería Nexus Products References
            p1 = db.query(Product).filter(Product.tenant_id == nexus_id, Product.name == "Pizza Familiar Pepperoni").first()
            p2 = db.query(Product).filter(Product.tenant_id == nexus_id, Product.name == "Gaseosa Coca-Cola 2L").first()
            p3 = db.query(Product).filter(Product.tenant_id == nexus_id, Product.name == "Hamburguesa Nexus doble queso").first()
            p4 = db.query(Product).filter(Product.tenant_id == nexus_id, Product.name == "Papas fritas grandes").first()
            p5 = db.query(Product).filter(Product.tenant_id == nexus_id, Product.name == "Alitas BBQ x12").first()
            p6 = db.query(Product).filter(Product.tenant_id == nexus_id, Product.name == "Pizza Margherita").first()

            # Pedido 1042 (PREPARING, DELIVERY)
            o1042 = Order(id=uuid.UUID("00000000-0000-0000-0000-000000001042"), tenant_id=nexus_id, customer_id=cust_isaac.id, status="PREPARING", delivery_method="DELIVERY", shipping_address="Calle 50 # 12-34", total_amount=18.49)
            db.add(o1042)
            db.commit()
            db.add_all([
                OrderItem(order_id=o1042.id, product_id=p1.id, quantity=1, price=14.99),
                OrderItem(order_id=o1042.id, product_id=p2.id, quantity=1, price=3.50),
                Payment(tenant_id=nexus_id, order_id=o1042.id, gateway="WhatsApp Pay", status="COMPLETED")
            ])
            
            # Pedido 1043 (CONFIRMED, DELIVERY)
            o1043 = Order(id=uuid.UUID("00000000-0000-0000-0000-000000001043"), tenant_id=nexus_id, customer_id=cust_laura.id, status="CONFIRMED", delivery_method="DELIVERY", shipping_address="Av. Santander # 45-89", total_amount=23.00)
            db.add(o1043)
            db.commit()
            db.add_all([
                OrderItem(order_id=o1043.id, product_id=p3.id, quantity=2, price=9.50),
                OrderItem(order_id=o1043.id, product_id=p4.id, quantity=1, price=4.00),
                Payment(tenant_id=nexus_id, order_id=o1043.id, gateway="Efectivo", status="PENDING")
            ])

            # Pedido 1044 (NEW, PICKUP)
            o1044 = Order(id=uuid.UUID("00000000-0000-0000-0000-000000001044"), tenant_id=nexus_id, customer_id=cust_carlos.id, status="NEW", delivery_method="PICKUP", total_amount=11.00)
            db.add(o1044)
            db.commit()
            db.add_all([
                OrderItem(order_id=o1044.id, product_id=p5.id, quantity=1, price=11.00),
                Payment(tenant_id=nexus_id, order_id=o1044.id, gateway="QR", status="COMPLETED")
            ])

            # Pedido 1041 (READY, PICKUP)
            o1041 = Order(id=uuid.UUID("00000000-0000-0000-0000-000000001041"), tenant_id=nexus_id, customer_id=cust_sofia.id, status="READY", delivery_method="PICKUP", total_amount=12.50)
            db.add(o1041)
            db.commit()
            db.add_all([
                OrderItem(order_id=o1041.id, product_id=p6.id, quantity=1, price=12.50),
                Payment(tenant_id=nexus_id, order_id=o1041.id, gateway="WhatsApp Pay", status="COMPLETED")
            ])

            # Pedido 1045 (SHIPPED, DELIVERY)
            o1045 = Order(id=uuid.UUID("00000000-0000-0000-0000-000000001045"), tenant_id=nexus_id, customer_id=cust_isaac.id, status="SHIPPED", delivery_method="DELIVERY", shipping_address="Transversal 23 # 9A-12", total_amount=14.99)
            db.add(o1045)
            db.commit()
            db.add_all([
                OrderItem(order_id=o1045.id, product_id=p1.id, quantity=1, price=14.99),
                Payment(tenant_id=nexus_id, order_id=o1045.id, gateway="WhatsApp Pay", status="COMPLETED")
            ])
            db.commit()
            print("Pedidos sembrados.")

        # 4. Sembrar documentos de conocimiento
        if db.query(KnowledgeDocument).filter(KnowledgeDocument.tenant_id == nexus_id).count() == 0:
            print("Sembrando base de conocimientos para Pizzería Nexus...")
            docs = [
                KnowledgeDocument(tenant_id=nexus_id, title="Menú de Pizzas y Bebidas", type="FAQ", content="Menú oficial de Pizza Nexus. Ofrecemos Pizza Pepperoni a $14.99 y Coca-Cola a $3.50.", word_count=450, status="TRAINED"),
                KnowledgeDocument(tenant_id=nexus_id, title="Políticas de Envío y Delivery", type="POLICY", content="Entregas a domicilio en 30 minutos. Cobertura de 5km sin costo.", word_count=180, status="TRAINED"),
                KnowledgeDocument(tenant_id=nexus_id, title="Promoción Combo Familiar", type="PROMO", content="Lleva 2 pizzas familiares y gaseosa gratis. Vence el fin de mes.", word_count=120, status="PENDING"),
                KnowledgeDocument(tenant_id=nexus_id, title="Preguntas Frecuentes (FAQ)", type="FAQ", content="¿Tienen opciones veganas? Sí, pizza sin queso y base de coliflor.", word_count=320, status="TRAINED")
            ]
            db.add_all(docs)
            db.commit()
            print("Base de conocimientos sembrada.")

    except Exception as e:
        db.rollback()
        print(f"Error al insertar datos de prueba: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
