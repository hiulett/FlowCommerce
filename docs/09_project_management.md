# 09. Roadmap, Estándar SRS e Informe de Recomendación Final

---

## FASE 18 – PLAN DE IMPLEMENTACIÓN Y ROADMAP TEMPORAL

Modelamos un plan de desarrollo incremental de **16 semanas** hasta el lanzamiento comercial en producción con 10 tenants de prueba controlados.

```
  Semanas 1-4: Diseño de Base de Datos y Webhook de WhatsApp
  [====================]
  
  Semanas 5-8: Motor RAG (pgvector), IA Conversacional e Integración del Carrito
  [====================]
  
  Semanas 9-12: Consola Web React, Dashboard y Módulo de Carga de Productos
  [====================]
  
  Semanas 13-16: App Flutter (Dueño/Operador), Integración de Pagos y Fase Beta
  [====================]
```

### 18.1 Hitos y Roadmap

#### Hito 1: Infraestructura y Recepción (Semanas 1-4)
*   **Objetivo:** Tener la estructura base del backend y la recepción asíncrona de webhooks de WhatsApp funcionando con persistencia.
*   **Funcionalidades:** Conexión a Meta Graph API, almacenamiento transaccional en Postgres RLS, deduplicación en Redis.
*   **Recursos:** 1 Desarrollador Backend.
*   **Riesgos:** Demoras de verificación de la cuenta comercial de Meta (Meta Business Suite).
    *   *Mitigación:* Usar el modo Sandbox/Desarrollador de Meta que provee números de prueba inmediatos sin verificación.

#### Hito 2: Cerebro de IA y RAG (Semanas 5-8)
*   **Objetivo:** Desarrollar el flujo RAG con búsqueda vectorial e integrarlo en la conversación de WhatsApp.
*   **Funcionalidades:** Generación de embeddings, consultas semánticas, inyección de contexto en Gemini Flash, control de tokens e historial de sesiones.
*   **Recursos:** 1 Desarrollador Backend, 1 Especialista en IA/Prompts.
*   **Dependencias:** Hito 1 completado.

#### Hito 3: Consola de Administración Web (Semanas 9-12)
*   **Objetivo:** Proveer la interfaz para que las tiendas carguen su catálogo y controlen sus pedidos.
*   **Funcionalidades:** Consola React, importador de productos (CSV), módulo de estadísticas básicas, gestión de usuarios (RBAC).
*   **Recursos:** 1 Desarrollador Frontend.

#### Hito 4: Integración de Pagos, App Móvil y Pruebas Beta (Semanas 13-16)
*   **Objetivo:** Habilitar pasarelas de pago, proveer la app móvil básica e iniciar pilotos con tiendas seleccionadas.
*   **Funcionalidades:** Integración de Stripe Webhooks, App Flutter (Operador/Dueño), notificaciones push.
*   **Recursos:** 1 Desarrollador Mobile (Flutter), 1 Ingeniero QA.

---

## FASE 19 – DOCUMENTACIÓN FORMAL Y ESPECIFICACIONES

El desarrollo y la escalabilidad del monorrepósito se regirán bajo los siguientes perfiles documentales estructurados:

### 19.1 Especificación de Requerimientos de Software (SRS) - Norma IEEE 830
Cada módulo del sistema se detalla en el documento formal de SRS estructurado en base a las siguientes secciones:
1.  **Introducción:** Propósito del sistema, alcance y definiciones clave de multi-tenancy conversacional.
2.  **Descripción General:** Perspectiva del producto, funciones del software (toma de pedidos, cobros, ruteo), perfiles de usuario y restricciones de diseño de bajo costo.
3.  **Requerimientos Específicos:** Detalle exhaustivo de los Requerimientos Funcionales y No Funcionales (ver `docs/08_requirements_and_user_stories.md`), diagramas de casos de uso y esquemas de validación de entradas.

### 19.2 Perfil del Documento Ejecutivo (Para Inversionistas)
*   **Enfoque:** Métricas de rentabilidad comercial, tamaño de mercado conversacional en LATAM y estructura de bajo costo de operación.
*   **Métrica Clave:** ARPU de $55 USD frente a un Costo Variable de Operación de $0.033 USD por cliente básico (99% de margen operativo).

### 19.3 Perfil del Documento Funcional (Para Product Owners)
*   **Enfoque:** Gestión del backlog de producto, criterios de aceptación Gherkin y flujos de experiencia de usuario dentro de WhatsApp y consola web.

### 19.4 Perfil del Documento Técnico y de Arquitectura (Para Desarrolladores)
*   **Enfoque:** Flujo de datos transaccionales, diagramas C4 (ver `docs/03_enterprise_architecture.md`), esquemas de base de datos relacional y vectorización local (ver `docs/04_technical_architecture.md`).

---

## FASE 20 – INFORME DE RECOMENDACIÓN FINAL (CONCLUSIONES ACCIONABLES)

Tras completar el análisis multidisciplinario y la validación técnica, emitimos las siguientes conclusiones del proyecto:

### 20.1 Viabilidad del Proyecto
1.  **Viabilidad Técnica: Confirmada.** La madurez de la extensión `pgvector` en PostgreSQL y las APIs de alta velocidad y bajo costo de Gemini Flash y OpenAI GPT-4o-mini permiten construir este sistema multi-tenant en un único VPS económico sin costos de licenciamiento externos.
2.  **Viabilidad Comercial: Muy Alta.** La necesidad de digitalización de las pymes en Latinoamérica sin forzar la descarga de aplicaciones es una oportunidad de alto impacto con muy baja barrera de adopción conversacional.

### 20.2 Stack y Arquitectura Recomendados
*   **Arquitectura:** **Monolito Modular** en backend para simplificar el despliegue a bajo costo y garantizar el orden del código bajo DDD.
*   **Backend:** **FastAPI (Python)** por su mínimo consumo de recursos y excelente soporte de IA.
*   **Frontend:** **React + Vite** alojado gratis en CDNs.
*   **App Móvil:** **Flutter** por consistencia multiplataforma.
*   **Base de Datos:** **PostgreSQL + pgvector** en contenedor local para eliminar la dependencia de DBs vectoriales de pago.
*   **Despliegue:** VPS Ubuntu Linux administrado con **Coolify** para automatizar DevOps.

### 20.3 Costo y Tiempo del MVP
*   **Costo de Infraestructura MVP:** **$10 USD / mes** (VPS Hetzner + almacenamiento).
*   **Costo Estimado de Desarrollo (MVP):** **$1,500 - $3,000 USD** utilizando desarrolladores ágiles o un equipo asistido por inteligencia artificial para acelerar el desarrollo del código base en 8 semanas.
*   **Tiempo para Lanzamiento al Mercado (Time-to-Market):** **4 meses** (2 meses MVP, 1 mes Beta con 10 tiendas aliadas, 1 mes ajustes comerciales).

### 20.4 Principales Riesgos y Mitigaciones
*   **Riesgo:** Cambios imprevistos en los costos o políticas de uso de WhatsApp Cloud API por parte de Meta.
    *   *Mitigación:* Estructurar la API del backend de manera que sea desacoplada, permitiendo conectar canales alternativos de chat (Telegram, Instagram Direct, chat web) de forma transparente si el canal de WhatsApp se encarece.

### 20.5 Estrategia de Lanzamiento (Go-To-Market)
1.  **Programa Beta Cerrado (Mes 3):** Conectar a 10 comercios locales (restaurantes y cafeterías de barrio) de forma gratuita para validar la precisión de la IA frente a clientes reales y pulir la interfaz móvil de pedidos.
2.  **Estrategia de Referidos:** Ofrecer descuentos en la mensualidad a comercios que refieran a otros comercios.
3.  **Alianzas Estratégicas:** Integrar la plataforma con procesadores de pago locales consolidados de cada país, ganando confianza del consumidor final y acceso a los directorios de comercios de las procesadoras.

### 20.6 Conclusión Ejecutiva Final
**FlowCommerce es un proyecto altamente viable, rentable y escalable.** Su estructura de costos mínimos fijos de infraestructura ($10 USD mensuales para los primeros 100 clientes) y el uso de Inteligencia Artificial de costo por token fraccionado (Gemini Flash) asegura un retorno de inversión acelerado. 

*Recomendamos proceder de inmediato a la ejecución del Hito 1 detallado en el plan de implementación, utilizando la estructura y el código base inicial ya configurados en el repositorio local.*
