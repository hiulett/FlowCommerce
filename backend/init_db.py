import os
from sqlalchemy.sql import text
from backend.database import engine, Base, SessionLocal
from backend.models import Tenant, User
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
        # Verificar si hay tenants
        tenant_count = db.query(Tenant).count()
        if tenant_count == 0:
            print("Creando Tenant de pruebas (Pizzería Nexus)...")
            test_tenant = Tenant(
                id=uuid.UUID("40446806-0107-6201-9310-c9943efb3870"), # UUID consistente para pruebas
                name="Pizzería Nexus",
                whatsapp_phone_id="109283746501928",
                whatsapp_access_token="TEST_ACCESS_TOKEN_EAAGb",
                ai_system_prompt="Eres el asistente virtual de ventas oficial para la Pizzería Nexus. Tu tono es entusiasta y alegre. Solo recomiendas productos del catálogo.",
                status="ACTIVE"
            )
            db.add(test_tenant)
            db.commit()
            db.refresh(test_tenant)
            print(f"Tenant de pruebas creado con ID: {test_tenant.id}")

            # Crear usuario administrador
            print("Creando usuario administrador de prueba (admin@nexus.com)...")
            admin_user = User(
                tenant_id=test_tenant.id,
                email="admin@nexus.com",
                password_hash="pbkdf2:sha256:260000$local_mock_hash", # Hash simulado
                role="ADMIN"
            )
            db.add(admin_user)
            db.commit()
            print("Usuario administrador creado con éxito (User: admin@nexus.com / Contraseña: local).")
        else:
            print("La base de datos ya cuenta con datos registrados.")
    except Exception as e:
        db.rollback()
        print(f"Error al insertar datos de prueba: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
