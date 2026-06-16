import redis
from backend.config import settings

# Inicializar cliente de Redis
try:
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
except Exception as e:
    print(f"Error al conectar con Redis: {str(e)}")
    redis_client = None

def is_duplicate_message(message_id: str, expire_seconds: int = 600) -> bool:
    """
    Verifica en Redis si el message_id de WhatsApp ya fue procesado recientemente.
    Retorna True si es duplicado, de lo contrario guarda la clave y retorna False.
    """
    if not redis_client:
        return False # Fallback si Redis no está activo (se procesaría, sin deduplicación)
    
    key = f"whatsapp:msg:{message_id}"
    # setnx (set if not exists) retorna 1 (True) si se crea la clave
    is_new = redis_client.set(key, "processed", ex=expire_seconds, nx=True)
    return not is_new
