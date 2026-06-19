# Cambios Realizados

## 1. Aumento del Límite de Resultados del Catálogo IA
**Problema:** Al tener más de 30 productos extraídos por la IA en el panel de control, el Chatbot solo era capaz de recordar o consultar los primeros 4 resultados al hacer una búsqueda semántica.
**Solución:** Se editó el orquestador principal (`backend/agent.py`) y se aumentó el límite de la búsqueda vectorial (`search_products_semantic`) de `4` a `30`. Ahora el Chatbot recuperará y consultará muchos más productos simultáneamente para dar mejores respuestas cuando un cliente pregunte por el menú.

## 2. Opción "Borrar Todo" en el Catálogo de Productos
**Problema:** No existía una manera rápida de eliminar el catálogo generado si el usuario deseaba limpiar la base de datos después de varios entrenamientos.
**Solución:** 
- **Backend:** Se creó el endpoint `DELETE /api/tenant/products` en `backend/main.py` capaz de aplicar borrado lógico (desactivación) a todos los productos de forma simultánea.
- **Frontend:** Se agregó el botón rojo **"Borrar Todos"** junto al título de "Catálogo de Productos Extraídos por IA" (`frontend/src/App.tsx`). Al pulsarlo, se mostrará un modal de confirmación antes de limpiar todo el catálogo visual de manera instantánea.
