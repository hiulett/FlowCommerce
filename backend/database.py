from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.sql import text
from fastapi import Request, HTTPException
from typing import Generator
from backend.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    db_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db() -> Generator:
    """Proveedor básico de sesión de base de datos sin RLS"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_tenant_db(request: Request) -> Generator:
    """
    Proveedor de sesión de base de datos con soporte para Row-Level Security (RLS).
    Extrae el tenant_id de la cabecera del request (o de la validación de sesión de WhatsApp/JWT)
    y lo inyecta en la sesión de base de datos local para que las políticas de RLS filtren los datos.
    """
    # En la API administrativa extraemos el tenant_id de las cabeceras o token
    tenant_id = request.headers.get("X-Tenant-ID")
    
    db = SessionLocal()
    try:
        if tenant_id:
            # Establece la variable de sesión en PostgreSQL para RLS
            db.execute(text("SET LOCAL app.current_tenant_id = :tenant_id"), {"tenant_id": tenant_id})
        yield db
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error en la sesión de base de datos: {str(e)}")
    finally:
        db.close()
