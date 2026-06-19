# Walkthrough: Banco de Información Unificado e Isolation (Multi-Tenancy)

## Cambios Realizados

A continuación, resumo cómo he implementado la nueva arquitectura para el Banco de Conocimiento:

### 1. Base de Datos y Aislamiento Estricto (Multi-Tenancy)
He modificado el modelo `Tenant` en `backend/models.py` para añadir las columnas nativas `business_rules` y `sales_techniques`. 
Además, he insertado los comandos de migración automática `ALTER TABLE` en `backend/main.py`. Cuando reinicies el backend, se ejecutarán automáticamente.
**Multi-Tenancy garantizado:** Toda esta información ahora vive dentro de la tabla del inquilino (Tenant). La IA ya no consultará una tabla genérica externa, sino que absorberá directamente la mente de su dueño.

### 2. Rutas del Backend (API)
He modificado la ruta de actualización de ajustes (`PUT /api/tenant/settings`) y de lectura (`GET /api/tenant/settings`) en `backend/main.py` para que acepten y devuelvan las nuevas Reglas de Negocio y las Técnicas de Venta, permitiendo guardarlo todo de un solo clic.

### 3. Refactorización del "Cerebro" de la IA (`agent.py`)
He eliminado el antiguo inyector de la tabla `KnowledgeDocument` (que escupía documentos largos enteros en la memoria de la IA saturándola). 
Ahora, el `system_prompt` está limpiamente estructurado y segmentado:
1. Técnicas de Venta y Personalidad
2. Catálogo de Productos (mediante búsqueda vectorial RAG)
3. Reglas de Negocio Obligatorias

### 4. Rediseño Total de la Pantalla "AI Knowledge"
He ido a `frontend/src/App.tsx` y he eliminado la confusa tabla de documentos que te permitía subir cualquier PDF/TXT libremente. 
En su lugar, he creado una interfaz dividida en cuadrantes de control directo:
- Panel Izquierdo Superior: **Reglas del Negocio** (para poner horarios, envíos).
- Panel Izquierdo Inferior: **Técnicas de Venta y Personalidad** (tono del asistente).
- Panel Derecho Superior: **System Prompt Maestro** (instrucciones base).
- Se ha agregado un botón central `"Guardar Configuración del Banco"` que persiste toda esta configuración.

La extracción del menú se limitará al botón azul `"Extraer Catálogo desde Texto"`, garantizando que solo el Catálogo de Productos use búsqueda vectorial, y el resto use la memoria estructural a corto plazo de la IA.

## Plan de Verificación Manual (Siguientes Pasos)
1. Has un `git pull` y **reinicia el servidor backend y frontend**.
2. Entra a tu dashboard, ve a la sección "AI Knowledge Base".
3. Escribe en "Reglas del Negocio" que tu horario es de "Lunes a Domingo de 8am a 10pm". Presiona Guardar.
4. Escríbele un WhatsApp al bot preguntando "¿A qué hora abren?" -> Verás que te responde basándose puramente en tu nueva configuración aislada.
