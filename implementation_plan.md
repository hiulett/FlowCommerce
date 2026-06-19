# Plan de Refactorización de la Base de Conocimiento de IA (Banco de Información Unificado)

## Descripción del Problema
Actualmente, la plataforma maneja la información de la IA de forma fragmentada:
- Existe un `system_prompt` básico.
- Existe una tabla de `KnowledgeDocument` donde se suben textos planos (FAQ, Políticas, etc.) que se inyectan en su totalidad al prompt, lo cual no es escalable y confunde a la IA.
- Existe un `Catálogo de Productos` que, aunque se extrae correctamente de un documento de menú, la IA no siempre lo utiliza adecuadamente porque las fuentes de información compiten entre sí en el prompt.
- El usuario puede subir "cualquier cosa", lo que provoca que la IA no tenga una estructura clara de "qué buscar y en dónde".

## Meta de la Arquitectura
Crear un **Banco de Información Unificado** donde la IA tenga acceso estructurado y categorizado a los datos del negocio. Se restringirá la subida de "documentos genéricos" y se cambiará a **Módulos de Conocimiento Específicos** que la IA sabrá cómo consumir. 
**Aislamiento Estricto (Multi-Tenancy):** Se garantizará que toda la información estructurada esté rígidamente vinculada al `tenant_id`. Cada Tenant operará como una bóveda aislada; la IA adoptará exclusivamente la personalidad, reglas y productos del Tenant al que está interactuando, imposibilitando la filtración de datos entre diferentes inquilinos.

## Tipos de Información Definidos (Nueva Estructura)

Se dividirá la base de conocimiento en 4 pilares fundamentales, cada uno con una estrategia de consumo diferente por parte de la IA:

1. **Menú y Catálogo (Productos y Precios)**
   - **Almacenamiento:** Tabla `Product` con vectores (`embedding`).
   - **Consumo IA:** Búsqueda semántica (RAG) en tiempo real basada en lo que pide el cliente (ya implementado, pero se aislará para que sea la única fuente de la verdad para ventas).

2. **Reglas Operativas y Logística (Horarios, Zonas de Envío, Pagos)**
   - **Almacenamiento:** Nueva categorización estructural. Textos cortos y concisos.
   - **Consumo IA:** Inyectado dinámicamente en el contexto principal del sistema. La IA usará esto para responder "A qué hora cierran" o "Llegan a la zona X".

3. **Promociones y Ofertas Activas**
   - **Almacenamiento:** Tabla de documentos o nueva estructura temporal.
   - **Consumo IA:** Inyección condicional. La IA la utilizará como técnica de *upselling* (ej. "Aprovecha que hoy tenemos 2x1").

4. **Guía de Estilo y Técnicas de Venta (Personalidad)**
   - **Almacenamiento:** Reemplaza el `system_prompt` genérico por un "Manual de Vendedor".
   - **Consumo IA:** Directrices de comportamiento (ej. "Siempre ofrece una bebida al final de la orden", "Usa emojis amigables", "Sé persuasivo").

## Propuesta de Cambios (Proposed Changes)

> [!WARNING]
> **User Review Required**:
> La siguiente reestructuración modificará la pantalla actual de "AI Knowledge" en el frontend y cambiará la forma en que `agent.py` alimenta a la IA. ¿Estás de acuerdo con dividir la pantalla en estas 4 secciones específicas y eliminar la subida libre de documentos genéricos para forzar esta estructura?

---

### Frontend (`frontend/src/App.tsx`)
Rediseño de la pestaña `AI Knowledge`:
- [DELETE] Eliminar la tabla genérica de "Documentos" y el modal de subida libre.
- [NEW] Crear 4 paneles/acordeones interactivos:
  1. **Guía de Comportamiento:** Un área de texto para definir la personalidad y reglas de venta.
  2. **Reglas del Negocio:** Un área para definir horarios, cobertura de envíos y métodos de pago.
  3. **Promociones Activas:** Una lista de textos cortos con las ofertas del día/mes.
  4. **Catálogo de Productos:** (Se mantiene la vista actual de tabla, pero se convierte en la única fuente para el menú).
- [MODIFY] Adaptar la carga del menú: En lugar de subir un "documento", se provee una herramienta "Auto-generar Catálogo desde Texto", que extraerá los productos y los guardará directamente en la tabla de productos, sin dejar un "documento" basura.

### Backend (`backend/models.py`)
- [MODIFY] Modificar la tabla `Tenant` para agregar campos estructurales: `business_rules` (Text), `sales_techniques` (Text).
- [MODIFY] Opcionalmente, simplificar `KnowledgeDocument` para que solo acepte tipos estandarizados como `PROMO` o `FAQ_PAIR`.

### Backend (`backend/agent.py` & `backend/ai_service.py`)
- [MODIFY] Refactorizar la construcción del `system_prompt` en `agent.py`:
  - Leer explícitamente `tenant.sales_techniques` y `tenant.business_rules`.
  - Aislar el contexto del Catálogo (resultados del RAG de productos).
  - Eliminar la concatenación masiva de documentos entrenados (`trained_docs`) que saturaban el modelo.
  - La IA sabrá: "Si preguntan por comida -> mira el catálogo inyectado", "Si preguntan por entregas -> mira la sección de Reglas del Negocio".

## Plan de Verificación

### Pruebas Manuales
1. Ingresar a la interfaz gráfica y configurar: 1 Regla de negocio, 1 Técnica de venta, y 2 Productos en el catálogo.
2. Iniciar una conversación simulada.
3. Preguntar: "¿Hasta qué hora atienden?" -> Verificar que la IA responda basándose solo en las *Reglas Operativas*.
4. Preguntar: "¿Qué pizzas tienes?" -> Verificar que la IA consulte el *Catálogo de Productos* usando RAG.
5. Comprobar en los logs del servidor que el Prompt del Sistema está ahora limpio, segmentado y sin saturación de tokens.
