from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Base de Datos
    DATABASE_URL: str = "postgresql://flowadmin:flowpassword@localhost:5432/flowcommerce"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # WhatsApp Cloud API
    WHATSAPP_VERIFY_TOKEN: str = "flowcommerce_token_123"
    META_API_VERSION: str = "v19.0"
    WHATSAPP_PHONE_ID: Optional[str] = None
    WHATSAPP_ACCESS_TOKEN: Optional[str] = None
    
    # Gemini API
    GEMINI_API_KEY: Optional[str] = None
    
    # Alternativas de IA (Groq / OpenAI compatible)
    LLM_PROVIDER: str = "gemini" # 'gemini' o 'groq'
    GROQ_API_KEY: Optional[str] = None
    LLM_MODEL: Optional[str] = None
    
    # Seguridad
    SECRET_KEY: str = "super_secret_jwt_signing_key_change_me_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    ENCRYPTION_KEY: str = "456gHb89iJklMnoPqrStUvwXyz0123456789aBcDeFg=" # Clave AES-256 en Base64

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
