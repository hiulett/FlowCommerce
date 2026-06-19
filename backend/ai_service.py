import google.generativeai as genai
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Dict, Any
import numpy as np

from backend.config import settings
from backend.models import Product
import uuid

# Configurar API de Gemini
genai.configure(api_key=settings.GEMINI_API_KEY or settings.SECRET_KEY) # Se usará la clave inyectada. 
# NOTA: En un despliegue real, se usa genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
# Pero utilizaremos el cliente HTTP o una inicialización robusta para evitar errores de conexión.

async def get_embedding(text: str) -> List[float]:
    """
    Genera el vector de embeddings para un texto dado usando la API oficial de Gemini (o fallback a zeros).
    Se usa el modelo 'models/gemini-embedding-001' y se trunca/completa a 1536 dimensiones.
    """
    try:
        # Se asume la inicialización del cliente de google-generativeai
        result = genai.embed_content(
            model="models/gemini-embedding-001",
            content=text,
            task_type="retrieval_document",
            output_dimensionality=1536
        )
        emb = result['embedding']
        if len(emb) > 1536:
            emb = emb[:1536]
        elif len(emb) < 1536:
            emb = emb + [0.0] * (1536 - len(emb))
        return emb
    except Exception as e:
        print(f"Error generando embedding (usando vector mock): {str(e)}")
        # Retorna un vector nulo mock de 1536 dimensiones en caso de fallo para no romper la ejecución
        return [0.0] * 1536

def search_products_semantic(db: Session, tenant_id: uuid.UUID, query_embedding: List[float], limit: int = 5) -> List[Product]:
    """
    Realiza una búsqueda semántica de productos filtrada por tenant_id usando pgvector
    y ordenando por similitud coseno (menor distancia coseno).
    """
    try:
        # El operador <=> en pgvector mapea a cosine_distance en SQLAlchemy
        results = db.query(Product).filter(
            and_(
                Product.tenant_id == tenant_id,
                Product.is_active == True,
                Product.stock > 0
            )
        ).order_by(
            Product.embedding.cosine_distance(query_embedding)
        ).limit(limit).all()
        return results
    except Exception as e:
        print(f"Error en búsqueda vectorial (fallback a alfabética): {str(e)}")
        # Fallback a búsqueda normal por coincidencia de texto básico en caso de fallo de pgvector
        return db.query(Product).filter(
            Product.tenant_id == tenant_id,
            Product.is_active == True,
            Product.stock > 0
        ).limit(limit).all()

def format_products_context(products: List[Product]) -> str:
    """
    Formatea el catálogo de productos recuperado en un string legible
    para inyectarlo directamente en el contexto del prompt del LLM.
    """
    if not products:
        return "No hay productos disponibles actualmente en el stock."
    
    context = "PRODUCTOS DISPONIBLES EN STOCK:\n"
    for p in products:
        category_name = p.category.name if p.category else "General"
        context += f"- ID: {p.id} | Nombre: {p.name} | Categoría: {category_name} | Precio: ${p.price} | Stock Disponible: {p.stock} | Descripción: {p.description or 'Sin descripción'}\n"
    return context

async def parse_catalog_document_to_products(content: str) -> List[Dict[str, Any]]:
    """
    Usa la API de Gemini para estructurar el contenido de un documento de catálogo
    en una lista de diccionarios de productos.
    """
    import json
    from openai import OpenAI
    try:
        client = OpenAI(
            base_url=settings.OLLAMA_BASE_URL,
            api_key="ollama"
        )
        
        prompt = (
            "Analiza el siguiente texto que contiene un catálogo o menú de productos y extrae "
            "todos los productos en formato JSON. Cada producto debe tener los siguientes campos:\n"
            "- name: Nombre del producto (ej: 'Pizza Pepperoni Familiar')\n"
            "- description: Descripción corta (ej: 'Con doble queso y pepperoni')\n"
            "- price: Precio numérico decimal (ej: 14.99)\n"
            "- stock: Cantidad disponible (usa 10 por defecto si no se menciona)\n"
            "- category: Categoría del producto (ej: 'Pizzas', 'Bebidas')\n\n"
            "Retorna EXCLUSIVAMENTE un arreglo JSON válido sin markdown.\n\n"
            f"Texto:\n{content}"
        )
        
        response = client.chat.completions.create(
            model="qwen2.5:3b",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        text = response.choices[0].message.content.strip()
        if text.startswith("```json"):
            text = text.split("```json")[1].split("```")[0].strip()
        elif text.startswith("```"):
            text = text.split("```")[1].split("```")[0].strip()
        
        products = json.loads(text)
        if isinstance(products, list):
            return products
        elif isinstance(products, dict) and "products" in products:
            return products["products"]
        return []
    except Exception as e:
        print(f"Error parsing catalog document with Gemini: {e}")
        return []

