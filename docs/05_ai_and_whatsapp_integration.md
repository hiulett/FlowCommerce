# 05. Integración con WhatsApp e Inteligencia Artificial

---

## FASE 9 – DISEÑO DE IA (ARQUITECTURA RAG Y GESTIÓN DE CONTEXTO)

Para construir un asistente conversacional preciso y que no alucine sobre el catálogo de productos ni invente precios, implementaremos un flujo estricto de **Retrieval-Augmented Generation (RAG)** integrado en la base de datos de transacciones.

### 9.1 Flujo Detallado de Arquitectura RAG

```
                                       +-----------------------+
                                       |  Mensaje de WhatsApp  |
                                       +-----------+-----------+
                                                   |
                                                   v
                                       +-----------+-----------+
                                       |  Embedding del mensaje|
                                       |   (Gemini Embeddings) |
                                       +-----------+-----------+
                                                   |
                                                   v
                                       +-----------+-----------+
                                       |   Búsqueda pgvector   |
                                       | (Filtro por tenant_id)|
                                       +-----------+-----------+
                                                   |
                                                   v
  +-------------------------+          +-----------+-----------+
  |  System Prompt Tenant   |--------->|  Construcción Prompt  |
  |  (Contexto & Reglas)    |          |  (Contexto Inyectado) |
  +-------------------------+          +-----------+-----------+
                                                   |
                                                   v
                                       +-----------+-----------+
                                       |     Consulta LLM      |
                                       |  (Gemini 2.0 Flash)   |
                                       +-----------+-----------+
                                                   |
                                                   v
                                       +-----------+-----------+
                                       |  Respuesta WhatsApp   |
                                       +-----------------------+
```

1.  **Entrada:** El cliente final envía un mensaje a través de WhatsApp (por ejemplo, *"¿Tienen hamburguesas vegetarianas y qué ingredientes llevan?"*).
2.  **Extracción e Embedding:** El backend de FastAPI recibe el mensaje del webhook de Meta, extrae el texto y genera un vector matemático de embedding (generalmente de 1536 o 768 dimensiones) usando la API de Gemini Embedding.
3.  **Búsqueda Semántica:** Se ejecuta una consulta en PostgreSQL para encontrar productos del tenant actual cuyo vector de descripción tenga la mayor similitud coseno con el vector del mensaje entrante:
    ```sql
    SELECT name, description, price, stock
    FROM products
    WHERE tenant_id = :tenant_id AND is_active = TRUE
    ORDER BY embedding <=> :message_embedding
    LIMIT 3;
    ```
4.  **Inyección de Contexto:** Los resultados recuperados (ej. *"Hamburguesa Veggie, precio $9.50, stock: 12, ingredientes: lentejas, aguacate, queso vegano"*) se formatean e inyectan dinámicamente en el prompt del sistema del LLM.
5.  **Generación de Respuesta:** Se envía el prompt enriquecido al modelo **Gemini 2.0 Flash** (o GPT-4o-mini). El modelo responde de forma fluida y natural basándose exclusivamente en la información provista en el contexto, evitando alucinaciones.

---

### 9.2 Optimización de Costos y Control de Tokens

Dado que pagar por tokens a escala puede erosionar las ganancias del SaaS, implementamos dos estrategias de contención de costos:

1.  **Caché Semántica con Redis:**
    *   Antes de invocar al LLM, calculamos la similitud del embedding del mensaje entrante con un índice de preguntas frecuentes en Redis.
    *   Si la similitud supera el **95%** (por ejemplo, el cliente escribe *"¿Cuáles son sus horarios de atención?"* y hace 10 minutos otro cliente preguntó *"¿A qué hora abren?"*), el backend sirve la respuesta directamente de la caché de Redis, reduciendo el costo de llamada al LLM a $0.00 USD.
2.  **Ventana de Memoria Acotada (Short-Term Memory):**
    *   Para evitar que el prompt de entrada crezca indefinidamente consumiendo tokens innecesarios, solo enviamos al LLM los últimos **10 mensajes** de la conversación actual como historial de contexto. Los mensajes más antiguos se almacenan en la base de datos de PostgreSQL pero se excluyen de la consulta en vivo de la API del LLM.

---

### 9.3 Gestión de Prompts Personalizada por Negocio (Tenant Prompt)

Cada comercio puede modificar su prompt del sistema en la Consola Web React. El backend combina esta configuración personalizada con reglas estructurales del sistema para crear el prompt final.

*   **Prompt Base de Estructura (Inmutable):** *"Eres un asistente virtual de ventas oficial para la tienda. Solo debes vender y contestar preguntas basándote en la información provista en la sección CONTEXTO. Si un producto no está en el CONTEXTO o el stock es 0, informa amablemente que no está disponible. Nunca inventes información de precios. Si el cliente quiere comprar, ejecuta la herramienta correspondiente para agregar productos al carrito."*
*   **Prompt del Tenant (Personalizable):** *"La pizzería de Carlos es un lugar de tradición italiana. Tu tono debe ser muy amigable y entusiasta. Usa emojis relacionados con comida 🍕🇮🇹."*

---

## FASE 10 – INTEGRACIÓN CON WHATSAPP (WHATSAPP CLOUD API)

Implementaremos la integración directa con la **API de WhatsApp Cloud oficial de Meta** (Graph API), evitando wrappers no autorizados para garantizar la estabilidad de la línea y cumplir con las normativas de spam.

### 10.1 Flujo de Webhooks y Procesamiento Asíncrono

Para asegurar un tiempo de respuesta de milisegundos en el webhook de Meta (el cual exige un código de estado HTTP 200 en menos de 3 segundos para evitar reintentar el envío del mensaje), el backend procesa los mensajes entrantes de forma **asíncrona** utilizando colas de mensajería en Redis administradas por FastAPI:

```
  +------------+             +--------------+             +---------------+
  |  Meta API  |------------>| Webhook Port |------------>|  Deduplicar   |
  +------------+ (HTTP POST) +--------------+             |  (Msg ID en   |
                                                          |    Redis)     |
                                                          +-------+-------+
                                                                  |
                                                                  v
  +------------+             +--------------+             +-------+-------+
  | Meta API   |<------------| Responder 200|<------------|  Encolar Tarea|
  |  (Envío)   | (HTTP POST) |   (OK)       |             |  Background   |
  +------------+             +--------------+             +---------------+
```

1.  **Recepción:** Meta envía un `POST` al webhook de FastAPI con el JSON del mensaje entrante.
2.  **Deduplicación:** El webhook extrae el `message_id` único de Meta y verifica en Redis si ya ha sido procesado. Si el ID existe en Redis, responde inmediatamente HTTP 200 y descarta la petición para evitar procesar dos veces el mismo mensaje en caso de reintentos de red de Meta.
3.  **Encolamiento:** El webhook registra el `message_id` en Redis con un tiempo de expiración de 10 minutos, encola el payload en las tareas en segundo plano de FastAPI (`BackgroundTasks`) y retorna de forma inmediata un código de estado `HTTP 200 OK` a Meta en menos de 50 milisegundos.
4.  **Procesamiento:** El proceso asíncrono en segundo plano toma la tarea de la cola, realiza el flujo RAG y la consulta al LLM, y posteriormente envía la respuesta a Meta mediante un request HTTP `POST` a la API de Graph de WhatsApp.

---

### 10.2 Componentes Interactivos y WhatsApp Flows

Para optimizar la experiencia de compra y reducir los errores de tipeo del usuario final, FlowCommerce no depende puramente de respuestas de texto plano. Implementamos los siguientes componentes interactivos provistos por la API de WhatsApp Cloud:

1.  **Reply Buttons (Botones de Respuesta Rápida):**
    *   Utilizados para opciones binarias u directas en la conversación (ej. *"¿Deseas pagar con código QR o pagar Contra Entrega?"* mostrando dos botones: `[Código QR]` y `[Contra Entrega]`). Máximo 3 botones por mensaje.
2.  **List Messages (Mensajes de Lista):**
    *   Muestra un menú desplegable interactivo con hasta 10 opciones. Ideal para la selección de categorías del catálogo (ej. `[Ver Pizzas]`, `[Ver Bebidas]`, `[Ver Postres]`).
3.  **WhatsApp Flows (Formularios Nativos):**
    *   Para flujos transaccionales avanzados en la Versión 2.0 (como completar los datos de facturación y dirección de entrega), utilizaremos **WhatsApp Flows**. Esto renderiza un formulario nativo dentro de la interfaz de WhatsApp sin abrir el navegador, permitiendo al usuario final ingresar textos, seleccionar opciones en dropdowns y validar campos de forma fluida antes de enviar el resultado final al chat en una sola interacción estructurada.
