import google.generativeai as genai
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Dict, Any

from backend.config import settings
from backend.models import Tenant, Message, Conversation, KnowledgeDocument
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

def parse_and_execute_text_function(text: str, db: Session, tenant_id: uuid.UUID, customer_id: uuid.UUID) -> tuple:
    """
    Busca patrones de funciones en formato de texto generados por el LLM, las ejecuta y retorna (nombre_funcion, resultado) o (None, None).
    """
    import re
    import json
    
    # Patrón 1: <function(nombre)(args)>
    match1 = re.search(r"<function\((\w+)\)(?:\((.*?)\))?>", text)
    # Patrón 2: <function(nombre)>args</function>
    match2 = re.search(r"<function\((\w+)\)>(.*?)</function>", text, re.DOTALL)
    
    func_name = None
    args_str = None
    
    if match1:
        func_name = match1.group(1)
        args_str = match1.group(2)
    elif match2:
        func_name = match2.group(1)
        args_str = match2.group(2)
        
    if func_name:
        args = {}
        if args_str:
            try:
                args_cleaned = args_str.strip()
                if args_cleaned == "{}" or not args_cleaned:
                    args = {}
                else:
                    args = json.loads(args_cleaned)
            except Exception:
                try:
                    import ast
                    args = ast.literal_eval(args_str.strip())
                except Exception:
                    args = {}
                    
        print(f"[IA] Interceptada llamada a función en formato texto: '{func_name}' con argumentos: {args}")
        
        tool_result = ""
        if func_name == "add_product_to_order":
            tool_result = add_item_to_cart(
                db, tenant_id, customer_id, 
                args.get("product_name"), 
                int(args.get("quantity", 1))
            )
        elif func_name == "remove_product_from_order":
            tool_result = remove_item_from_cart(
                db, tenant_id, customer_id, 
                args.get("product_name"), 
                int(args.get("quantity", 1))
            )
        elif func_name == "get_order_summary":
            tool_result = get_cart_summary(db, tenant_id, customer_id)
        elif func_name == "confirm_and_checkout_order":
            tool_result = checkout_cart(
                db, tenant_id, customer_id,
                delivery_method=args.get("delivery_method", "DELIVERY"),
                shipping_address=args.get("shipping_address")
            )
        else:
            return None, None
            
        return func_name, tool_result
    return None, None

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
    from sqlalchemy.sql import text
    db.execute(text("SET LOCAL app.current_tenant_id = :tenant_id"), {"tenant_id": str(tenant.id)})

    # 1. Recuperar historial de mensajes (últimos 10 mensajes)
    print(f"[IA] Ejecutando agente conversacional para el cliente ID {customer_id} en la conversación ID {conversation.id}")
    print(f"[IA] Mensaje del usuario recibido: '{user_message}'")
    history_messages = db.query(Message).filter(
        Message.conversation_id == conversation.id
    ).order_by(Message.created_at.desc()).limit(10).all()

    
    # Invertir el orden para que sea cronológico
    history_messages = list(reversed(history_messages))

    # 2. Generar embedding del mensaje del usuario y buscar productos similares (RAG)
    print(f"[IA] Iniciando búsqueda semántica para el mensaje: '{user_message}'")
    msg_embedding = await get_embedding(user_message)
    relevant_products = search_products_semantic(db, tenant.id, msg_embedding, limit=4)
    products_context = format_products_context(relevant_products)
    print(f"[IA] Búsqueda semántica (RAG) completada. Se encontraron {len(relevant_products)} productos relevantes para incluir en el contexto.")

    # 2.5. Recuperar e inyectar documentos de la base de conocimiento entrenados (RAG)
    kb_context = ""
    trained_docs = db.query(KnowledgeDocument).filter(
        and_(
            KnowledgeDocument.tenant_id == tenant.id,
            KnowledgeDocument.status == "TRAINED"
        )
    ).all()
    if trained_docs:
        kb_context = "\nINFORMACIÓN ADICIONAL DEL NEGOCIO (PREGUNTAS FRECUENTES, POLÍTICAS Y PROMOCIONES):\n"
        for doc in trained_docs:
            kb_context += f"--- Documento: {doc.title} (Tipo: {doc.type}) ---\n{doc.content}\n\n"

    # 3. Construir el prompt del sistema
    system_prompt = (
        f"{tenant.ai_system_prompt or 'Eres un asistente virtual de ventas amable.'}\n\n"
        f"CONTEXTO DE NEGOCIO Y STOCK ACTUAL:\n"
        f"{products_context}\n"
        f"{kb_context}\n"
        f"REGLAS OBLIGATORIAS:\n"
        f"- Basa tus respuestas EXCLUSIVAMENTE en el CONTEXTO DE NEGOCIO y la INFORMACIÓN ADICIONAL provista arriba.\n"
        f"- Si el cliente te pide comprar o agregar productos, debes invocar la herramienta correspondiente (Function Calling).\n"
        f"- PROHIBIDO: Nunca escribas llamadas a funciones como texto en tu mensaje visible para el usuario (evita '/function=...', '<function...>', etc.). Utiliza únicamente el sistema nativo de llamadas a herramientas (Tool Calls/Function Calling).\n"
        f"- Nunca inventes precios o stock. Si un producto no tiene stock, infórmalo educadamente.\n"
        f"- ANTES DE FINALIZAR O CONFIRMAR LA ORDEN (es decir, antes de llamar a 'confirm_and_checkout_order'), DEBES PREGUNTAR obligatoriamente al cliente lo siguiente:\n"
        f"  1. ¿Desea entrega a domicilio ('DELIVERY') o retirar en el local ('PICKUP')?\n"
        f"  2. Si el cliente elige a domicilio ('DELIVERY'), debes pedirle de forma obligatoria su dirección completa de entrega y/o su ubicación de WhatsApp.\n"
        f"  3. Si elige retirar en el local ('PICKUP'), no requiere pedir dirección de envío.\n"
        f"- NUNCA invoques 'confirm_and_checkout_order' usando direcciones genéricas o placeholders como 'dirección que proporcionarás' o 'dirección del cliente'. Si no tienes la dirección real y detallada provista por el cliente para un Domicilio, pídesela primero.\n"
        f"- NUNCA le digas al cliente que su pedido está confirmado o listo para entrega si no has ejecutado exitosamente la herramienta 'confirm_and_checkout_order' primero. Solo confirma el pedido si la herramienta te devuelve que la orden fue confirmada con éxito.\n"
        f"- NUNCA inventes o asumas el contenido del carrito. Si vas a confirmar un pedido o si una operación falla, usa 'get_order_summary' para ver exactamente qué productos están en el carrito actualmente.\n"
        f"- Si la herramienta 'confirm_and_checkout_order' te devuelve un mensaje indicando que la compra falló o que hay un error (por ejemplo, por falta de stock de algún producto), debes informar al cliente de dicho error específico. NUNCA le digas que su pedido fue confirmado o que está listo para retirar/despachar si la herramienta falló."
    )



    # 4. Alternativa de IA con Groq (Llama-3.3-70b-versatile)
    if settings.LLM_PROVIDER == "groq" and settings.GROQ_API_KEY:
        try:
            model_name = settings.LLM_MODEL or "llama-3.3-70b-versatile"
            print(f"[IA] Usando proveedor alternativo Groq con modelo {model_name}...")
            from openai import OpenAI
            import json

            client = OpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=settings.GROQ_API_KEY
            )
            
            openai_tools = [
                {
                    "type": "function",
                    "function": {
                        "name": "add_product_to_order",
                        "description": "Agrega un producto del catálogo al pedido actual (carrito de compras) del cliente.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "product_name": {"type": "string", "description": "Nombre aproximado del producto a agregar."},
                                "quantity": {"type": "integer", "description": "Cantidad de unidades a pedir.", "default": 1}
                            },
                            "required": ["product_name"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "remove_product_from_order",
                        "description": "Elimina o reduce la cantidad de un producto del pedido actual (carrito) del cliente.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "product_name": {"type": "string", "description": "Nombre aproximado del producto a remover."},
                                "quantity": {"type": "integer", "description": "Cantidad de unidades a remover.", "default": 1}
                            },
                            "required": ["product_name"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "get_order_summary",
                        "description": "Devuelve el desglose detallado de todos los productos agregados al pedido actual y el total.",
                        "parameters": {"type": "object", "properties": {}}
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "confirm_and_checkout_order",
                        "description": "Confirma el pedido final, guarda el método de entrega y dirección física, y cierra la compra.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "delivery_method": {
                                    "type": "string",
                                    "enum": ["DELIVERY", "PICKUP"],
                                    "description": "Método de entrega seleccionado ('DELIVERY' para domicilio, 'PICKUP' para retirar en local)."
                                },
                                "shipping_address": {
                                    "type": "string",
                                    "description": "Dirección completa del cliente (obligatoria si delivery_method es 'DELIVERY')."
                                }
                            },
                            "required": ["delivery_method"]
                        }
                    }
                }
            ]

            messages = [{"role": "system", "content": system_prompt}]
            for msg in history_messages:
                role = "assistant" if msg.sender == "ASSISTANT" else "user"
                messages.append({"role": role, "content": msg.content})
            messages.append({"role": "user", "content": user_message})

            response = client.chat.completions.create(
                model=model_name,
                messages=messages,
                tools=openai_tools,
                tool_choice="auto"
            )

            response_message = response.choices[0].message
            tool_calls = response_message.tool_calls

            # Intentar parsear si el modelo generó texto con la función en vez de usar native tool_calls
            text_content = response_message.content or ""
            func_name, text_tool_result = parse_and_execute_text_function(text_content, db, tenant.id, customer_id)
            if func_name:
                print(f"[IA] Ejecutando llamada de texto en Groq para '{func_name}'...")
                messages.append({"role": "assistant", "content": text_content})
                messages.append({"role": "user", "content": f"Resultado de {func_name}: {text_tool_result}"})
                final_response = client.chat.completions.create(
                    model=model_name,
                    messages=messages
                )
                final_text = final_response.choices[0].message.content
                print(f"[IA] Respuesta final post-herramienta (Groq-Texto) generada: '{final_text}'")
                return final_text

            if tool_calls:
                tool_call = tool_calls[0]
                function_name = tool_call.function.name
                args = json.loads(tool_call.function.arguments)
                print(f"[IA] Function Calling (Groq): El modelo solicitó ejecutar herramienta '{function_name}' con argumentos: {args}")
                
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
                    tool_result = checkout_cart(
                        db, tenant.id, customer_id,
                        delivery_method=args.get("delivery_method", "DELIVERY"),
                        shipping_address=args.get("shipping_address")
                    )
                else:
                    tool_result = "Función no implementada."

                print(f"[IA] Tool Result (Groq): Resultado de ejecutar la herramienta '{function_name}': '{tool_result}'")

                # Formatear el mensaje del asistente para enviarlo a la API
                # Convertimos el objeto de respuesta del asistente en un diccionario compatible
                ass_msg = {
                    "role": "assistant",
                    "content": response_message.content,
                    "tool_calls": [
                        {
                            "id": tool_call.id,
                            "type": "function",
                            "function": {
                                "name": tool_call.function.name,
                                "arguments": tool_call.function.arguments
                            }
                        }
                    ]
                }
                messages.append(ass_msg)
                
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": function_name,
                    "content": tool_result
                })

                print(f"[IA] Enviando resultado de herramienta a Groq para obtener respuesta conversacional final...")
                final_response = client.chat.completions.create(
                    model=model_name,
                    messages=messages
                )
                final_text = final_response.choices[0].message.content
                print(f"[IA] Respuesta final post-herramienta (Groq) generada: '{final_text}'")
                return final_text

            print(f"[IA] Respuesta directa (Groq) generada: '{response_message.content}'")
            return response_message.content

        except Exception as e:
            err_msg = str(e)
            print(f"[IA] Error en el agente conversacional de Groq: {err_msg}")
            if "quota" in err_msg.lower() or "429" in err_msg:
                return "Lo siento, el servicio de Inteligencia Artificial (Groq) ha excedido su límite temporal. Por favor, reintenta en unos momentos."
            return "Lo siento, tuve un problema temporal al procesar tu solicitud con el proveedor de respaldo. Por favor, reintenta."

    # 5. Configurar herramientas de Function Calling (Gemini)
    # Definimos las funciones puente que Gemini podrá solicitar ejecutar
    tools_definitions = [
        add_product_to_order_tool,
        remove_product_from_order_tool,
        get_order_summary_tool,
        confirm_and_checkout_order_tool
    ]

    try:
        # Inicializar modelo con herramientas
        gemini_model_name = settings.LLM_MODEL or "gemini-2.0-flash"
        model = genai.GenerativeModel(
            model_name=gemini_model_name,
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
        print(f"[IA] Enviando solicitud a gemini-2.0-flash...")
        response = model.generate_content(contents)

        # Intentar parsear si el modelo generó texto con la función en vez de usar native tool_calls
        text_content = response.text or ""
        func_name, text_tool_result = parse_and_execute_text_function(text_content, db, tenant.id, customer_id)
        if func_name:
            print(f"[IA] Ejecutando llamada de texto en Gemini para '{func_name}'...")
            contents.append({"role": "model", "parts": [text_content]})
            contents.append({"role": "user", "parts": [f"Resultado de {func_name}: {text_tool_result}"]})
            final_response = model.generate_content(contents)
            final_text = final_response.text
            print(f"[IA] Respuesta final post-herramienta (Gemini-Texto) generada: '{final_text}'")
            return final_text

        # 5. Gestionar llamadas a funciones (Function Calling Loop)
        if response.candidates and response.candidates[0].content.parts:
            part = response.candidates[0].content.parts[0]
            if hasattr(part, "function_call") and part.function_call:
                function_call = part.function_call
                function_name = function_call.name
                args = function_call.args

                # Ejecutar la lógica de negocio local asociada
                print(f"[IA] Function Calling: El modelo solicitó ejecutar herramienta '{function_name}' con argumentos: {args}")
                
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
                    tool_result = checkout_cart(
                        db, tenant.id, customer_id,
                        delivery_method=args.get("delivery_method", "DELIVERY"),
                        shipping_address=args.get("shipping_address")
                    )
                else:
                    tool_result = "Función no implementada."

                print(f"[IA] Tool Result: Resultado de ejecutar la herramienta '{function_name}': '{tool_result}'")

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
                print(f"[IA] Enviando resultado de herramienta a Gemini para obtener la respuesta conversacional final...")
                final_response = model.generate_content(contents)
                print(f"[IA] Respuesta final post-herramienta generada: '{final_response.text}'")
                return final_response.text

        print(f"[IA] Respuesta directa del modelo generada: '{response.text}'")
        return response.text

    except Exception as e:
        err_msg = str(e)
        print(f"[IA] Error en el agente conversacional: {err_msg}")
        if "quota" in err_msg.lower() or "429" in err_msg:
            return "Lo siento, el servicio de Inteligencia Artificial de FlowCommerce ha excedido su cuota o límite de peticiones. Por favor, intente de nuevo en unos momentos o valide la facturación de su API Key."
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

def confirm_and_checkout_order_tool(delivery_method: str, shipping_address: str = None) -> str:
    """
    Confirma el pedido final, guarda el método de entrega y la dirección, y cierra la compra.

    Args:
        delivery_method: El método de entrega elegido ('DELIVERY' para domicilio, 'PICKUP' para retirar en local).
        shipping_address: Dirección de entrega completa (obligatoria si delivery_method es 'DELIVERY').
    """
    pass
