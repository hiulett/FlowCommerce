# Cambios Realizados

## 1. Corrección del error del menú (RAG)
Se ha solucionado el problema por el cual DeepSeek respondía "no tenemos stock de productos disponibles" a pesar de tener los documentos entrenados.
**Causa:** Cuando la base de datos no encontraba registros de productos en la tabla estructurada (porque el menú se maneja a través de documentos entrenados en lugar de la base de datos de productos), la capa RAG inyectaba forzosamente la frase: *"No hay productos disponibles actualmente en el stock."* al prompt del sistema. DeepSeek, siendo un modelo muy estricto, leía esta instrucción y afirmaba al usuario que no había stock de nada, ignorando el menú del documento entrenado.
**Solución:** Se editó `backend/ai_service.py` para que, en caso de no encontrar productos en la base de datos, simplemente devuelva un contexto vacío (`""`) en lugar del texto hardcodeado. De esta manera, el LLM utilizará libremente el menú inyectado desde la base de conocimientos (`KnowledgeDocument`).

## 2. Solución a la Pantalla en Blanco (ResponsiveContainer)
Se solucionó el error de React `ResponsiveContainer is not defined` que provocaba que la pantalla entera colapsara al entrar a la pestaña "Balanceador de IA" (Dashboard de consumo).
**Causa:** El componente `ResponsiveContainer` de `recharts` no estaba siendo exportado correctamente por el empaquetador en la versión en uso, lo que causaba un fallo en tiempo de ejecución.
**Solución:** Se eliminó `ResponsiveContainer` de `App.tsx` y se implementaron contenedores con medidas explícitas (`width` y `height`) para `BarChart` y `PieChart`, lo que garantiza la estabilidad del frontend y la visualización correcta de las 2 gráficas de consumo requeridas.

## 3. Visualización correcta de Roles / Tareas (JSON)
Se corrigió la tabla del Balanceador de IA para que muestre el texto legible de los roles (ej. "CONVERSATION, TOOL_CALLING, RAG...") en lugar de imprimir un array JSON raw `["CONVERSATION", ...]`.
**Solución:** Se añadió un bloque de parseo dinámico seguro (`JSON.parse`) dentro del renderizado de la tabla en `App.tsx`.
