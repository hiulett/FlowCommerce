from fastapi.concurrency import run_in_threadpool
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
import re


async def _tracked_completion(db, tenant_id, key_id, provider, model_name, client_func, *args, **kwargs):
    from fastapi.concurrency import run_in_threadpool
    from backend.ai_balancer import record_ai_usage
    response = await run_in_threadpool(client_func, *args, **kwargs)
    try:
        if hasattr(response, "usage") and response.usage:
            record_ai_usage(db, tenant_id, key_id, provider, model_name, 
                            getattr(response.usage, "prompt_tokens", 0), 
                            getattr(response.usage, "completion_tokens", 0))
    except Exception as e:
        print(f"Error recording usage: {e}")
    return response

async def _tracked_gemini(db, tenant_id, key_id, provider, model_name, model, contents):
    from backend.ai_balancer import record_ai_usage
    response = await _tracked_gemini(db, tenant.id, key_id, provider, gemini_model_name, model, contents)
    try:
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            record_ai_usage(db, tenant_id, key_id, provider, model_name, 
                            getattr(response.usage_metadata, "prompt_token_count", 0), 
                            getattr(response.usage_metadata, "candidates_token_count", 0))
    except Exception as e:
        print(f"Error recording usage: {e}")
    return response

def clean_ai_response(text: str) -> str:
    """Elimina etiquetas internas como las de DeepSeek <｜｜DSML｜｜tool_calls>"""
    if not text:
        return ""
    # Eliminar bloques completos de <｜｜DSML｜｜tool_calls>...
    text = re.sub(r'<｜｜DSML｜｜tool_calls>.*?</｜｜DSML｜｜tool_calls>', '', text, flags=re.DOTALL)
    text = re.sub(r'<｜｜DSML｜｜.*?>', '', text)
    return text.strip()

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
    ).order_by(Message.created_at.desc()).limit(6).all()

    
    # Invertir el orden para que sea cronológico
    history_messages = list(reversed(history_messages))

    # 2. Generar embedding del mensaje del usuario y buscar productos similares (RAG)
    print(f"[IA] Iniciando búsqueda semántica para el mensaje: '{user_message}'")
    msg_embedding = await get_embedding(user_message)
    relevant_products = search_products_semantic(db, tenant.id, msg_embedding, limit=30)
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
        f"- Si el sistema nativo de tools falla, puedes escribir en tu mensaje: <function(nombre_funcion)>{{\"arg1\":\"val\"}}</function>\n"
        f"- Nunca inventes precios o stock. Si un producto no tiene stock, infórmalo educadamente.\n"
        f"- ANTES DE FINALIZAR O CONFIRMAR LA ORDEN (es decir, antes de llamar a 'confirm_and_checkout_order'), DEBES PREGUNTAR obligatoriamente al cliente lo siguiente:\n"
        f"  1. ¿Desea entrega a domicilio ('DELIVERY') o retirar en el local ('PICKUP')?\n"
        f"  2. Si el cliente elige a domicilio ('DELIVERY'), debes pedirle de forma obligatoria su dirección completa de entrega y/o su ubicación de WhatsApp.\n"
        f"  3. Si elige retirar en el local ('PICKUP'), no requiere pedir dirección de envío.\n"
        f"- NUNCA invoques 'confirm_and_checkout_order' usando direcciones genéricas o placeholders como 'dirección que proporcionarás' o 'dirección del cliente'. Si no tienes la dirección real y detallada provista por el cliente para un Domicilio, pídesela primero.\n"
        f"- REGLA DE ORO PARA CONFIRMAR: Si el cliente aprueba, acepta o dice 'confirmar', 'procede', 'sí', DEBES LLAMAR INMEDIATAMENTE a la herramienta 'confirm_and_checkout_order'. NO respondas con mensajes como 'voy a confirmarlo' o 'dame un momento' sin invocar la herramienta al mismo tiempo.\n"
        f"- NUNCA le digas al cliente que su pedido está confirmado o listo para entrega si no has ejecutado exitosamente la herramienta 'confirm_and_checkout_order' primero. Solo confirma el pedido si la herramienta te devuelve que la orden fue confirmada con éxito.\n"
        f"- Cuando confirmes el pedido exitosamente usando la herramienta, OBLIGATORIAMENTE DEBES mostrarle al cliente el Número de Pedido / ID de pedido real que te devuelve la herramienta.\n"
        f"- NUNCA inventes o asumas el contenido del carrito. Si vas a confirmar un pedido o si una operación falla, usa 'get_order_summary' para ver exactamente qué productos están en el carrito actualmente.\n"
        f"- Si la herramienta 'confirm_and_checkout_order' te devuelve un mensaje indicando que la compra falló o que hay un error (por ejemplo, por falta de stock de algún producto), debes informar al cliente de dicho error específico. NUNCA le digas que su pedido fue confirmado o que está listo para retirar/despachar si la herramienta falló.\n"
        f"- NUNCA respondas con texto únicamente si debes llamar a una herramienta. Si vas a confirmar o ajustar algo, DEBES invocar la herramienta inmediatamente en el mismo turno.\n"
        f"- OPTIMIZACIÓN DE TOKENS: Sé extremadamente conciso y directo. Limita tus respuestas a 2 o 3 oraciones cortas. No uses adornos, saludos largos ni texto de relleno innecesario."
    )


    # 4. Enrutamiento y Balanceo de Carga de IA
    from backend.ai_balancer import AILoadBalancer, decrypt_key
    balancer = AILoadBalancer()
    
    # Herramientas de OpenAI / Groq
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

    # Herramientas de Gemini
    tools_definitions = [
        add_product_to_order_tool,
        remove_product_from_order_tool,
        get_order_summary_tool,
        confirm_and_checkout_order_tool
    ]

    from backend.models import PlatformAIKey
    active_keys_count = db.query(PlatformAIKey).filter(PlatformAIKey.is_active == True).count()
    max_attempts = max(5, active_keys_count)
    last_error = None
    tried_key_ids = []

    for attempt in range(max_attempts):
        key_record = balancer.get_next_available_key(db, requires_tools=True, exclude_ids=tried_key_ids)
        
        provider = None
        api_key = None
        model_name = None
        key_id = None
        
        if key_record:
            provider = key_record.provider
            model_name = key_record.model_name
            key_id = key_record.id
            tried_key_ids.append(key_id)
            print(f"[IA] [BALANCER] Intento {attempt + 1}: Usando llave '{key_record.name}' de base de datos ({provider} | {model_name})")
        else:
            # Fallback a variables de entorno si la base de datos no tiene llaves
            if settings.LLM_PROVIDER == "groq" and settings.GROQ_API_KEY:
                provider = "groq"
                api_key = settings.GROQ_API_KEY
                model_name = settings.LLM_MODEL or "llama-3.3-70b-versatile"
                print(f"[IA] [BALANCER] Pool de llaves vacío. Usando Groq de variables de entorno ({model_name})")
            elif settings.GEMINI_API_KEY:
                provider = "gemini"
                api_key = settings.GEMINI_API_KEY
                model_name = settings.LLM_MODEL or "gemini-2.0-flash"
                print(f"[IA] [BALANCER] Pool de llaves vacío. Usando Gemini de variables de entorno ({model_name})")
            else:
                return "Lo siento, no hay proveedores de Inteligencia Artificial configurados en la plataforma."

        try:
            if key_record:
                api_key = decrypt_key(key_record.api_key)

            if provider == "openai":
                from openai import OpenAI
                import json

                client = OpenAI(
                    api_key=api_key
                )
                
                messages = [{"role": "system", "content": system_prompt}]
                for msg in history_messages:
                    role = "assistant" if msg.sender == "ASSISTANT" else "user"
                    messages.append({"role": role, "content": msg.content})
                messages.append({"role": "user", "content": user_message})

                response = await _tracked_completion(db, tenant.id, key_id, provider, model_name, client.chat.completions.create, 
                    model=model_name,
                    messages=messages,
                    tools=openai_tools,
                    tool_choice="auto"
                )

                response_message = response.choices[0].message
                tool_calls = response_message.tool_calls

                text_content = response_message.content or ""
                func_name, text_tool_result = parse_and_execute_text_function(text_content, db, tenant.id, customer_id)
                if func_name:
                    print(f"[IA] Ejecutando llamada de texto en OpenAI para '{func_name}'...")
                    messages.append({"role": "assistant", "content": text_content})
                    messages.append({"role": "user", "content": f"Resultado de {func_name}: {text_tool_result}"})
                    final_response = await _tracked_completion(db, tenant.id, key_id, provider, model_name, client.chat.completions.create, 
                        model=model_name,
                        messages=messages
                    )
                    final_text = final_response.choices[0].message.content
                    if not final_text or not str(final_text).strip():

                        final_text = f'✅ Acción completada: {text_tool_result}'

                    print(f"[IA] Respuesta final post-herramienta (OpenAI-Texto) generada: '{final_text}'")
                    if key_id:
                        balancer.update_last_used(db, key_id)
                    return final_text

                if tool_calls:
                    tool_call = tool_calls[0]
                    function_name = tool_call.function.name
                    args = json.loads(tool_call.function.arguments)
                    print(f"[IA] Function Calling (OpenAI): El modelo solicitó ejecutar herramienta '{function_name}' con argumentos: {args}")
                    
                    tool_result = ""
                    if function_name == "add_product_to_order":
                        tool_result = add_item_to_cart(db, tenant.id, customer_id, args.get("product_name"), int(args.get("quantity", 1)))
                    elif function_name == "remove_product_from_order":
                        tool_result = remove_item_from_cart(db, tenant.id, customer_id, args.get("product_name"), int(args.get("quantity", 1)))
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

                    print(f"[IA] Tool Result (OpenAI): Resultado de ejecutar la herramienta '{function_name}': '{tool_result}'")

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

                    print(f"[IA] Enviando resultado de herramienta a OpenAI para obtener respuesta conversacional final...")
                    final_response = await _tracked_completion(db, tenant.id, key_id, provider, model_name, client.chat.completions.create, 
                        model=model_name,
                        messages=messages
                    )
                    final_text = final_response.choices[0].message.content
                    if not final_text or not str(final_text).strip():

                        final_text = f'✅ Acción completada: {tool_result}'

                    print(f"[IA] Respuesta final post-herramienta (OpenAI) generada: '{final_text}'")
                    if key_id:
                        balancer.update_last_used(db, key_id)
                    return final_text

                print(f"[IA] Respuesta directa (OpenAI) generada: '{response_message.content}'")
                if key_id:
                    balancer.update_last_used(db, key_id)
                return response_message.content

            elif provider == "deepseek":
                from openai import OpenAI
                import json

                client = OpenAI(
                    base_url="https://api.deepseek.com",
                    api_key=api_key
                )
                
                messages = [{"role": "system", "content": system_prompt}]
                for msg in history_messages:
                    role = "assistant" if msg.sender == "ASSISTANT" else "user"
                    messages.append({"role": role, "content": msg.content})
                messages.append({"role": "user", "content": user_message})

                response = await _tracked_completion(db, tenant.id, key_id, provider, model_name, client.chat.completions.create, 
                    model=model_name,
                    messages=messages,
                    tools=openai_tools,
                    tool_choice="auto"
                )

                response_message = response.choices[0].message
                tool_calls = response_message.tool_calls

                text_content = response_message.content or ""
                func_name, text_tool_result = parse_and_execute_text_function(text_content, db, tenant.id, customer_id)
                if func_name:
                    print(f"[IA] Ejecutando llamada de texto en DeepSeek para '{func_name}'...")
                    messages.append({"role": "assistant", "content": text_content})
                    messages.append({"role": "user", "content": f"Resultado de {func_name}: {text_tool_result}"})
                    final_response = await _tracked_completion(db, tenant.id, key_id, provider, model_name, client.chat.completions.create, 
                        model=model_name,
                        messages=messages
                    )
                    final_text = clean_ai_response(final_response.choices[0].message.content)
                    if not final_text or not str(final_text).strip():

                        final_text = f'✅ Acción completada: {text_tool_result}'

                    print(f"[IA] Respuesta final post-herramienta (DeepSeek-Texto) generada: '{final_text}'")
                    if key_id:
                        balancer.update_last_used(db, key_id)
                    return final_text

                if tool_calls:
                    tool_call = tool_calls[0]
                    function_name = tool_call.function.name
                    args = json.loads(tool_call.function.arguments)
                    print(f"[IA] Function Calling (DeepSeek): El modelo solicitó ejecutar herramienta '{function_name}' con argumentos: {args}")
                    
                    tool_result = ""
                    if function_name == "add_product_to_order":
                        tool_result = add_item_to_cart(db, tenant.id, customer_id, args.get("product_name"), int(args.get("quantity", 1)))
                    elif function_name == "remove_product_from_order":
                        tool_result = remove_item_from_cart(db, tenant.id, customer_id, args.get("product_name"), int(args.get("quantity", 1)))
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

                    print(f"[IA] Tool Result (DeepSeek): Resultado de ejecutar la herramienta '{function_name}': '{tool_result}'")

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

                    print(f"[IA] Enviando resultado de herramienta a DeepSeek para obtener respuesta conversacional final...")
                    final_response = await _tracked_completion(db, tenant.id, key_id, provider, model_name, client.chat.completions.create, 
                        model=model_name,
                        messages=messages
                    )
                    final_text = clean_ai_response(final_response.choices[0].message.content)
                    if not final_text or not str(final_text).strip():

                        final_text = f'✅ Acción completada: {tool_result}'

                    print(f"[IA] Respuesta final post-herramienta (DeepSeek) generada: '{final_text}'")
                    if key_id:
                        balancer.update_last_used(db, key_id)
                    return final_text

                content = clean_ai_response(response_message.content)
                print(f"[IA] Respuesta directa (DeepSeek) generada: '{content}'")
                if key_id:
                    balancer.update_last_used(db, key_id)
                return content

            elif provider == "groq":
                from openai import OpenAI
                import json

                client = OpenAI(
                    base_url="https://api.groq.com/openai/v1",
                    api_key=api_key
                )
                
                messages = [{"role": "system", "content": system_prompt}]
                for msg in history_messages:
                    role = "assistant" if msg.sender == "ASSISTANT" else "user"
                    messages.append({"role": role, "content": msg.content})
                messages.append({"role": "user", "content": user_message})

                response = await _tracked_completion(db, tenant.id, key_id, provider, model_name, client.chat.completions.create, 
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
                    final_response = await _tracked_completion(db, tenant.id, key_id, provider, model_name, client.chat.completions.create, 
                        model=model_name,
                        messages=messages
                    )
                    final_text = final_response.choices[0].message.content
                    if not final_text or not str(final_text).strip():

                        final_text = f'✅ Acción completada: {text_tool_result}'

                    print(f"[IA] Respuesta final post-herramienta (Groq-Texto) generada: '{final_text}'")
                    if key_id:
                        balancer.update_last_used(db, key_id)
                    return final_text

                if tool_calls:
                    tool_call = tool_calls[0]
                    function_name = tool_call.function.name
                    args = json.loads(tool_call.function.arguments)
                    print(f"[IA] Function Calling (Groq): El modelo solicitó ejecutar herramienta '{function_name}' con argumentos: {args}")
                    
                    tool_result = ""
                    if function_name == "add_product_to_order":
                        tool_result = add_item_to_cart(db, tenant.id, customer_id, args.get("product_name"), int(args.get("quantity", 1)))
                    elif function_name == "remove_product_from_order":
                        tool_result = remove_item_from_cart(db, tenant.id, customer_id, args.get("product_name"), int(args.get("quantity", 1)))
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
                    final_response = await _tracked_completion(db, tenant.id, key_id, provider, model_name, client.chat.completions.create, 
                        model=model_name,
                        messages=messages
                    )
                    final_text = final_response.choices[0].message.content
                    if not final_text or not str(final_text).strip():

                        final_text = f'✅ Acción completada: {tool_result}'

                    print(f"[IA] Respuesta final post-herramienta (Groq) generada: '{final_text}'")
                    if key_id:
                        balancer.update_last_used(db, key_id)
                    return final_text

                print(f"[IA] Respuesta directa (Groq) generada: '{response_message.content}'")
                if key_id:
                    balancer.update_last_used(db, key_id)
                return response_message.content

            elif provider == "openrouter":
                from openai import OpenAI
                import json

                client = OpenAI(
                    base_url="https://openrouter.ai/api/v1",
                    api_key=api_key
                )
                
                messages = [{"role": "system", "content": system_prompt}]
                for msg in history_messages:
                    role = "assistant" if msg.sender == "ASSISTANT" else "user"
                    messages.append({"role": role, "content": msg.content})
                messages.append({"role": "user", "content": user_message})

                extra_headers = {
                    "HTTP-Referer": "https://flowcommerce.io",
                    "X-Title": "FlowCommerce"
                }

                response = await _tracked_completion(db, tenant.id, key_id, provider, model_name, client.chat.completions.create, 
                    model=model_name,
                    messages=messages,
                    tools=openai_tools,
                    tool_choice="auto",
                    extra_headers=extra_headers
                )

                response_message = response.choices[0].message
                tool_calls = response_message.tool_calls

                text_content = response_message.content or ""
                func_name, text_tool_result = parse_and_execute_text_function(text_content, db, tenant.id, customer_id)
                if func_name:
                    print(f"[IA] Ejecutando llamada de texto en OpenRouter para '{func_name}'...")
                    messages.append({"role": "assistant", "content": text_content})
                    messages.append({"role": "user", "content": f"Resultado de {func_name}: {text_tool_result}"})
                    final_response = await _tracked_completion(db, tenant.id, key_id, provider, model_name, client.chat.completions.create, 
                        model=model_name,
                        messages=messages,
                        extra_headers=extra_headers
                    )
                    final_text = final_response.choices[0].message.content
                    if not final_text or not str(final_text).strip():

                        final_text = f'✅ Acción completada: {text_tool_result}'

                    print(f"[IA] Respuesta final post-herramienta (OpenRouter-Texto) generada: '{final_text}'")
                    if key_id:
                        balancer.update_last_used(db, key_id)
                    return final_text

                if tool_calls:
                    tool_call = tool_calls[0]
                    function_name = tool_call.function.name
                    args = json.loads(tool_call.function.arguments)
                    print(f"[IA] Function Calling (OpenRouter): El modelo solicitó ejecutar herramienta '{function_name}' con argumentos: {args}")
                    
                    tool_result = ""
                    if function_name == "add_product_to_order":
                        tool_result = add_item_to_cart(db, tenant.id, customer_id, args.get("product_name"), int(args.get("quantity", 1)))
                    elif function_name == "remove_product_from_order":
                        tool_result = remove_item_from_cart(db, tenant.id, customer_id, args.get("product_name"), int(args.get("quantity", 1)))
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

                    print(f"[IA] Tool Result (OpenRouter): Resultado de ejecutar la herramienta '{function_name}': '{tool_result}'")

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

                    print(f"[IA] Enviando resultado de herramienta a OpenRouter para obtener respuesta conversacional final...")
                    final_response = await _tracked_completion(db, tenant.id, key_id, provider, model_name, client.chat.completions.create, 
                        model=model_name,
                        messages=messages,
                        extra_headers=extra_headers
                    )
                    final_text = final_response.choices[0].message.content
                    if not final_text or not str(final_text).strip():

                        final_text = f'✅ Acción completada: {tool_result}'

                    print(f"[IA] Respuesta final post-herramienta (OpenRouter) generada: '{final_text}'")
                    if key_id:
                        balancer.update_last_used(db, key_id)
                    return final_text

                print(f"[IA] Respuesta directa (OpenRouter) generada: '{response_message.content}'")
                if key_id:
                    balancer.update_last_used(db, key_id)
                return response_message.content

            elif provider == "deepseek":
                from openai import OpenAI

                client = OpenAI(
                    base_url="https://api.deepseek.com",
                    api_key=api_key
                )
                
                messages = [{"role": "system", "content": system_prompt}]
                for msg in history_messages:
                    role = "assistant" if msg.sender == "ASSISTANT" else "user"
                    messages.append({"role": role, "content": msg.content})
                messages.append({"role": "user", "content": user_message})

                response = await _tracked_completion(db, tenant.id, key_id, provider, model_name, client.chat.completions.create, 
                    model=model_name or "deepseek-chat",
                    messages=messages,
                    tools=openai_tools,
                    tool_choice="auto"
                )

                response_message = response.choices[0].message
                tool_calls = response_message.tool_calls

                text_content = response_message.content or ""
                func_name, text_tool_result = parse_and_execute_text_function(text_content, db, tenant.id, customer_id)
                if func_name:
                    if func_name == "confirm_and_checkout_order" and "¡Pedido Confirmado!" in text_tool_result:
                        new_ord = db.query(Order).filter(
                            Order.tenant_id == tenant.id,
                            Order.customer_id == customer_id,
                            Order.status == "NEW"
                        ).order_by(Order.created_at.desc()).first()
                        if new_ord:
                            await notify_new_order(new_ord)
                    print(f"[IA] Ejecutando llamada de texto en DeepSeek para '{func_name}'...")
                    messages.append({"role": "assistant", "content": text_content})
                    messages.append({"role": "user", "content": f"Resultado de {func_name}: {text_tool_result}"})
                    final_response = await _tracked_completion(db, tenant.id, key_id, provider, model_name, client.chat.completions.create, 
                        model=model_name or "deepseek-chat",
                        messages=messages
                    )
                    final_text = final_response.choices[0].message.content
                    if not final_text or not str(final_text).strip():

                        final_text = f'✅ Acción completada: {text_tool_result}'

                    print(f"[IA] Respuesta final post-herramienta (DeepSeek-Texto) generada: '{final_text}'")
                    if key_id:
                        balancer.update_last_used(db, key_id)
                    return final_text

                if tool_calls:
                    tool_call = tool_calls[0]
                    function_name = tool_call.function.name
                    args = json.loads(tool_call.function.arguments)
                    print(f"[IA] Function Calling (DeepSeek): El modelo solicitó ejecutar herramienta '{function_name}' con argumentos: {args}")
                    
                    tool_result = ""
                    if function_name == "add_product_to_order":
                        tool_result = add_item_to_cart(db, tenant.id, customer_id, args.get("product_name"), int(args.get("quantity", 1)))
                    elif function_name == "remove_product_from_order":
                        tool_result = remove_item_from_cart(db, tenant.id, customer_id, args.get("product_name"), int(args.get("quantity", 1)))
                    elif function_name == "get_order_summary":
                        tool_result = get_cart_summary(db, tenant.id, customer_id)
                    elif function_name == "confirm_and_checkout_order":
                        tool_result = checkout_cart(
                            db, tenant.id, customer_id,
                            delivery_method=args.get("delivery_method", "DELIVERY"),
                            shipping_address=args.get("shipping_address")
                        )
                        if "¡Pedido Confirmado!" in tool_result:
                            new_ord = db.query(Order).filter(
                                Order.tenant_id == tenant.id,
                                Order.customer_id == customer_id,
                                Order.status == "NEW"
                            ).order_by(Order.created_at.desc()).first()
                            if new_ord:
                                await notify_new_order(new_ord)
                    else:
                        tool_result = "Función no implementada."

                    print(f"[IA] Tool Result (DeepSeek): Resultado de ejecutar la herramienta '{function_name}': '{tool_result}'")

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

                    print(f"[IA] Enviando resultado de herramienta a DeepSeek para obtener respuesta conversacional final...")
                    final_response = await _tracked_completion(db, tenant.id, key_id, provider, model_name, client.chat.completions.create, 
                        model=model_name or "deepseek-chat",
                        messages=messages
                    )
                    final_text = final_response.choices[0].message.content
                    if not final_text or not str(final_text).strip():

                        final_text = f'✅ Acción completada: {tool_result}'

                    print(f"[IA] Respuesta final post-herramienta (DeepSeek) generada: '{final_text}'")
                    if key_id:
                        balancer.update_last_used(db, key_id)
                    return final_text

                print(f"[IA] Respuesta directa (DeepSeek) generada: '{response_message.content}'")
                if key_id:
                    balancer.update_last_used(db, key_id)
                return response_message.content

            elif provider == "gemini":
                # Configurar Gemini usando la clave correspondiente
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                
                # Sanitizar el nombre del modelo
                gemini_model_name = model_name
                if not gemini_model_name.lower().startswith("gemini"):
                    gemini_model_name = "gemini-2.0-flash"
                
                model = genai.GenerativeModel(
                    model_name=gemini_model_name,
                    tools=tools_definitions,
                    system_instruction=system_prompt
                )

                contents = []
                for msg in history_messages:
                    role = "user" if msg.sender == "CUSTOMER" else "model"
                    contents.append({
                        "role": role,
                        "parts": [msg.content]
                    })
                contents.append({
                    "role": "user",
                    "parts": [user_message]
                })

                print(f"[IA] Enviando solicitud a {gemini_model_name}...")
                response = await _tracked_gemini(db, tenant.id, key_id, provider, gemini_model_name, model, contents)

                # Intentar parsear si el modelo generó texto con la función en vez de usar native tool_calls
                text_content = response.text or ""
                func_name, text_tool_result = parse_and_execute_text_function(text_content, db, tenant.id, customer_id)
                if func_name:
                    if func_name == "confirm_and_checkout_order" and "¡Pedido Confirmado!" in text_tool_result:
                        new_ord = db.query(Order).filter(
                            Order.tenant_id == tenant.id,
                            Order.customer_id == customer_id,
                            Order.status == "NEW"
                        ).order_by(Order.created_at.desc()).first()
                        if new_ord:
                            await notify_new_order(new_ord)
                    print(f"[IA] Ejecutando llamada de texto en Gemini para '{func_name}'...")
                    contents.append({"role": "model", "parts": [text_content]})
                    contents.append({"role": "user", "parts": [f"Resultado de {func_name}: {text_tool_result}"]})
                    final_response = await _tracked_gemini(db, tenant.id, key_id, provider, gemini_model_name, model, contents)
                    final_text = final_response.text
                    if not final_text or not str(final_text).strip():

                        final_text = f'✅ Acción completada: {text_tool_result}'

                    print(f"[IA] Respuesta final post-herramienta (Gemini-Texto) generada: '{final_text}'")
                    if key_id:
                        balancer.update_last_used(db, key_id)
                    return final_text

                # Gestionar llamadas a funciones
                if response.candidates and response.candidates[0].content.parts:
                    part = response.candidates[0].content.parts[0]
                    if hasattr(part, "function_call") and part.function_call:
                        function_call = part.function_call
                        function_name = function_call.name
                        args = function_call.args

                        print(f"[IA] Function Calling (Gemini): El modelo solicitó ejecutar herramienta '{function_name}' con argumentos: {args}")
                        
                        tool_result = ""
                        if function_name == "add_product_to_order":
                            tool_result = add_item_to_cart(db, tenant.id, customer_id, args.get("product_name"), int(args.get("quantity", 1)))
                        elif function_name == "remove_product_from_order":
                            tool_result = remove_item_from_cart(db, tenant.id, customer_id, args.get("product_name"), int(args.get("quantity", 1)))
                        elif function_name == "get_order_summary":
                            tool_result = get_cart_summary(db, tenant.id, customer_id)
                        elif function_name == "confirm_and_checkout_order":
                            tool_result = checkout_cart(
                                db, tenant.id, customer_id,
                                delivery_method=args.get("delivery_method", "DELIVERY"),
                                shipping_address=args.get("shipping_address")
                            )
                            if "¡Pedido Confirmado!" in tool_result:
                                new_ord = db.query(Order).filter(
                                    Order.tenant_id == tenant.id,
                                    Order.customer_id == customer_id,
                                    Order.status == "NEW"
                                ).order_by(Order.created_at.desc()).first()
                                if new_ord:
                                    await notify_new_order(new_ord)
                        else:
                            tool_result = "Función no implementada."

                        print(f"[IA] Tool Result (Gemini): Resultado de ejecutar la herramienta '{function_name}': '{tool_result}'")

                        # Enviar el resultado de la función de vuelta a Gemini para respuesta final
                        contents.append(response.candidates[0].content)
                        contents.append({
                            "role": "user",
                            "parts": [{
                                "function_response": {
                                    "name": function_name,
                                    "response": {"result": tool_result}
                                }
                            }]
                        })

                        print(f"[IA] Enviando resultado de herramienta a Gemini para obtener la respuesta conversacional final...")
                        final_response = await _tracked_gemini(db, tenant.id, key_id, provider, gemini_model_name, model, contents)
                        print(f"[IA] Respuesta final post-herramienta generada: '{final_response.text}'")
                        if key_id:
                            balancer.update_last_used(db, key_id)
                        return final_response.text

                print(f"[IA] Respuesta directa del modelo generada: '{response.text}'")
                if key_id:
                    balancer.update_last_used(db, key_id)
                return response.text

        except Exception as e:
            last_error = e
            err_msg = str(e)
            print(f"[IA] Error procesando con {provider} (modelo: {model_name}): {err_msg}")
            
            # Enfriar la clave si el error es de cuota/límites
            if key_id and ("quota" in err_msg.lower() or "429" in err_msg or "rate limit" in err_msg.lower() or "limit exceeded" in err_msg.lower()):
                balancer.mark_cool_down(db, key_id, minutes=5)
                continue
            elif key_id:
                # Otros fallos también los enfriamos
                balancer.mark_cool_down(db, key_id, minutes=10)
                continue
            else:
                # Si falló la clave de las variables de entorno, lanzamos el error
                if "quota" in err_msg.lower() or "429" in err_msg:
                    return "Lo siento, el servicio de Inteligencia Artificial por defecto ha excedido su límite de peticiones. Por favor, reintente en unos momentos."
                return "Lo siento, tuve un problema temporal para procesar tu solicitud con el proveedor por defecto. Por favor, reintenta."

    # Si se agotan los intentos y todas las claves fallaron
    if last_error:
        print(f"[IA] Todos los proveedores fallaron. Último error: {last_error}")
    return "Lo siento, todos los proveedores de Inteligencia Artificial han excedido sus límites o están inactivos. Por favor, intente de nuevo en unos momentos."


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
