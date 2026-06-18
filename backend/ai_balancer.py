import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from cryptography.fernet import Fernet

from backend.config import settings
from backend.models import PlatformAIKey

# Inicializar Fernet para encriptación de claves API
fernet = Fernet(settings.ENCRYPTION_KEY.encode())

def encrypt_key(plain_key: str) -> str:
    """Encripta la clave API usando AES-256 (Fernet)"""
    if not plain_key:
        return ""
    return fernet.encrypt(plain_key.encode()).decode()

def decrypt_key(encrypted_key: str) -> str:
    """Desencripta la clave API encriptada en base de datos"""
    if not encrypted_key:
        return ""
    return fernet.decrypt(encrypted_key.encode()).decode()

class AILoadBalancer:
    def get_next_available_key(self, db: Session, requires_tools: bool = True, exclude_ids: List[uuid.UUID] = None) -> Optional[PlatformAIKey]:
        """
        Retorna la siguiente clave API disponible que:
        1. Esté activa (is_active == True)
        2. No esté en periodo de enfriamiento (cool_down_until es nulo o menor al tiempo actual)
        3. Si requiere herramientas, que sea compatible (supports_tools == True)
        4. No esté en la lista de claves excluidas (exclude_ids)
        
        Ordena por menor tiempo de último uso (last_used) o fecha de creación
        para distribuir equitativamente (Round-Robin).
        
        Si todas las claves activas compatibles están en enfriamiento, realiza un fallback
        y selecciona la que tenga el menor tiempo de enfriamiento restante (cool_down_until más antiguo/cercano a expirar).
        """
        now = datetime.utcnow()
        
        # Filtro de herramientas
        tools_filter = True
        if requires_tools:
            tools_filter = PlatformAIKey.supports_tools == True

        # Filtro de exclusión de llaves ya intentadas en esta petición
        exclude_filter = True
        if exclude_ids:
            exclude_filter = PlatformAIKey.id.notin_(exclude_ids)
            
        # 1. Intentar buscar claves que no estén en enfriamiento
        cool_down_filter = or_(
            PlatformAIKey.cool_down_until == None,
            PlatformAIKey.cool_down_until < now
        )
        
        key = db.query(PlatformAIKey).filter(
            and_(
                PlatformAIKey.is_active == True,
                cool_down_filter,
                tools_filter,
                exclude_filter
            )
        ).order_by(
            PlatformAIKey.last_used.asc().nullsfirst(),
            PlatformAIKey.created_at.asc()
        ).first()
        
        if key:
            return key
            
        # 2. Fallback: Si todas están en enfriamiento, tomamos la que esté más cerca de expirar su bloqueo (excluyendo las ya intentadas)
        print("[BALANCER] Todas las claves de base de datos están en enfriamiento o excluidas. Intentando fallback...")
        key_fallback = db.query(PlatformAIKey).filter(
            and_(
                PlatformAIKey.is_active == True,
                tools_filter,
                exclude_filter
            )
        ).order_by(
            PlatformAIKey.cool_down_until.asc(),
            PlatformAIKey.last_used.asc().nullsfirst()
        ).first()
        
        return key_fallback

    def mark_cool_down(self, db: Session, key_id: uuid.UUID, minutes: int = 5):
        """Marca una clave API en periodo de enfriamiento tras un error 429/cuotas"""
        key = db.query(PlatformAIKey).filter(PlatformAIKey.id == key_id).first()
        if key:
            key.failed_attempts += 1
            key.cool_down_until = datetime.utcnow() + timedelta(minutes=minutes)
            db.commit()
            print(f"[BALANCER] Clave '{key.name}' puesta en enfriamiento por {minutes} minutos (Intentos fallidos: {key.failed_attempts}).")

    def update_last_used(self, db: Session, key_id: uuid.UUID):
        """Actualiza el timestamp de último uso de la clave tras una llamada exitosa"""
        key = db.query(PlatformAIKey).filter(PlatformAIKey.id == key_id).first()
        if key:
            key.last_used = datetime.utcnow()
            # Reiniciar contador de fallos al tener un uso exitoso
            key.failed_attempts = 0
            key.cool_down_until = None
            db.commit()
            print(f"[BALANCER] Clave '{key.name}' usada exitosamente. Contador de fallos reiniciado.")
