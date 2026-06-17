import google.generativeai as genai
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Dict, Any

from backend.config import settings
from backend.models import Tenant, Message, Conversation
from backend.ai_service import get_embedding, search_products_semantic, format_products_context
from backend.cart_service import (
    add_item_to_cart,
    remove_item_from_cart,
    get_cart_summary,
    checkout_cart
)
import uuid

# Configurar API de Gemini
genai.configure(api_key=settings.GEMINI_API_KEY or settings.SECRET_KEY)

async def run_conversational_agent(
    db: Session,
    tenant: Tenant,
    conversation: Conversation,
    customer_id: uuid.UUID,
    user_message: str
) -> str:
    """
    Orquestador del Agente de IA Conversacional.
    Integra memoria histórica, contexto RAG vectorial (pgvector) y
    Function Calling dinámico para interactuar con el carrito.
    """
    # 1. Recuperar historial de mensajes (últimos 10 mensajes)
    history_messages = db.query(Message).filter(
        Message.conversation_id == conversation.id
    ).order_by(Message.created_at.desc()).limit(10).all()
    
    # Invertir el orden para que sea cronológico
    history_messages = list(reversed(history_messages))

    # 2. Generar embedding del mensaje del usuario y buscar productos similares (RAG)
    msg_embedding = await get_embedding(user_message)
    relevant_products = search_products_semantic(db, tenant.id, msg_embedding, limit=4)
    products_context = format_products_context(relevant_products)

    # 3. Construir el prompt del sistema
    system_prompt = (
        f"{tenant.ai_system_prompt or 'Eres un asistente virtual de ventas amable.'}\n\n"
        f"CONTEXTO DE NEGOCIO Y STOCK ACTUAL:\n"
        f"{products_context}\n\n"
        f"REGLAS:\n"
        f"- Basa tus respuestas EXCLUSIVAMENTE en el CONTEXTO DE NEGOCIO provisto arriba.\n"
        f"- Si el cliente te pide comprar o agregar productos, debes invocar la herramienta correspondiente (Function Calling).\n"
        f"- Nunca inventes precios o stock. Si un producto no tiene stock, infórmalo educadamente."
    )

    # 4. Configurar herramientas de Function Calling
    # Definimos las funciones puente que Gemini podrá solicitar ejecutar
    tools_definitions = [
        add_product_to_order_tool,
        remove_product_from_order_tool,
        get_order_summary_tool,
        confirm_and_checkout_order_tool
    ]

    try:
        # Inicializar modelo con herramientas
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            tools=tools_definitions,
            system_instruction=system_prompt
        )

        # Formatear el historial de chat para la API de Gemini
        contents = []
        for msg in history_messages:
            role = "user" if msg.sender == "CUSTOMER" else "model"
            contents.append({
                "role": role,
                "parts": [msg.content]
            })
        
        # Añadir el mensaje actual del usuario
        contents.append({
            "role": "user",
            "parts": [user_message]
        })

        # Generar respuesta de Gemini
        response = model.generate_content(contents)

        # 5. Gestionar llamadas a funciones (Function Calling Loop)
        if response.candidates and response.candidates[0].content.parts:
            part = response.candidates[0].content.parts[0]
            if hasattr(part, "function_call") and part.function_call:
                function_call = part.function_call
                function_name = function_call.name
                args = function_call.args

                # Ejecutar la lógica de negocio local asociada
                print(f"IA solicitó ejecutar herramienta: {function_name} con argumentos: {args}")
                
                tool_result = ""
                if function_name == "add_product_to_order":
                    tool_result = add_item_to_cart(
                        db, tenant.id, customer_id, 
                        args.get("product_name"), 
                        int(args.get("quantity", 1))
                    )
                elif function_name == "remove_product_from_order":
                    tool_result = remove_item_from_cart(
                        db, tenant.id, customer_id, 
                        args.get("product_name"), 
                        int(args.get("quantity", 1))
                    )
                elif function_name == "get_order_summary":
                    tool_result = get_cart_summary(db, tenant.id, customer_id)
                elif function_name == "confirm_and_checkout_order":
                    tool_result = checkout_cart(db, tenant.id, customer_id)
                else:
                    tool_result = "Función no implementada."

                # Enviar el resultado de la función de vuelta a Gemini para respuesta final
                contents.append(response.candidates[0].content) # Añadir petición de función
                contents.append({
                    "role": "user",
                    "parts": [{
                        "function_response": {
                            "name": function_name,
                            "response": {"result": tool_result}
                        }
                    }]
                })

                # Generar respuesta final post-ejecución
                final_response = model.generate_content(contents)
                return final_response.text

        return response.text

    except Exception as e:
        print(f"Error en el agente conversacional: {str(e)}")
        return "Lo siento, tuve un problema temporal para procesar tu solicitud. Por favor, reintenta."

# --- DEFINICIONES DE HERRAMIENTAS (TOOLS) PARA EL LLM ---

def add_product_to_order_tool(product_name: str, quantity: int = 1) -> str:
    """
    Agrega un producto del catálogo al pedido actual (carrito de compras) del cliente.
    Args:
        product_name: Nombre aproximado del producto a agregar.
        quantity: Cantidad de unidades a pedir (por defecto 1).
    """
    pass

def remove_product_from_order_tool(product_name: str, quantity: int = 1) -> str:
    """
    Elimina o reduce la cantidad de un producto del pedido actual (carrito) del cliente.
    Args:
        product_name: Nombre aproximado del producto a remover o disminuir.
        quantity: Cantidad de unidades a remover (por defecto 1).
    """
    pass

def get_order_summary_tool() -> str:
    """
    Devuelve el desglose detallado de todos los productos agregados al pedido actual del cliente y el monto total acumulado.
    """
    pass

def confirm_and_checkout_order_tool() -> str:
    """
    Confirma el pedido final, bloquea el stock de productos y cierra la compra para iniciar el proceso de cobro.
    """
    pass
