# FlowCommerce - Plataforma SaaS de Ventas por WhatsApp e IA

FlowCommerce es una solución integral SaaS Multi-Tenant diseñada para automatizar ventas, atención al cliente y gestión de pedidos directamente a través de WhatsApp. La plataforma permite a cualquier comercio (restaurantes, farmacias, tiendas de conveniencia, etc.) configurar un asistente virtual impulsado por Inteligencia Artificial con acceso a su catálogo de productos y base de conocimientos, permitiendo ventas conversacionales de extremo a extremo sin que el cliente deba instalar aplicaciones adicionales.

---

## 🚀 Arquitectura del Repositorio

El proyecto está estructurado como un monorrepósito que integra los componentes clave de la plataforma:

* **`/backend`**: API Gateway y servicios core construidos con **FastAPI** (Python), integrados con bases de datos relacionales y de vectores, motores de procesamiento de lenguaje natural (LLM) y la API de WhatsApp Cloud.
* **`/frontend`**: Panel de control administrativo web construido con **React + Vite** (TypeScript) para la gestión de catálogos, visualización de métricas de ventas, configuración de prompts de IA y administración de tenants.
* **`/mobile`**: Aplicación móvil multiplataforma construida en **Flutter** para dueños de tiendas, operadores y repartidores.
* **`/docs`**: Especificaciones detalladas de arquitectura, análisis de viabilidad, diseño de base de datos e historias de usuario (Fases 1 a 20).

---

## 🛠️ Stack Tecnológico Seleccionado (Bajo Costo y Escalabilidad)

Para optimizar costos y maximizar la compatibilidad en implementaciones autohospedadas (on-premise o VPS de bajo costo como Hetzner/Railway) y de nube (AWS/GCP), se ha seleccionado la siguiente combinación tecnológica:

1. **Backend:** **FastAPI**. Proporciona un consumo de memoria mínimo (ideal para servidores de $5 USD) y soporte nativo asíncrono excepcional, perfecto para el manejo de webhooks concurrentes de WhatsApp y librerías de IA.
2. **Frontend:** **React + Vite**. Permite compilar a archivos estáticos ultraligeros que se alojan a coste cero en redes CDN (Vercel, Netlify, Cloudflare Pages).
3. **App Móvil:** **Flutter**. Una única base de código para iOS y Android que reduce a la mitad los tiempos y costos de desarrollo.
4. **Base de Datos:** **PostgreSQL + pgvector**. Nos permite almacenar tanto los datos transaccionales como los embeddings vectoriales de la IA en la misma base de datos, eliminando el costo de bases de datos vectoriales dedicadas (como Pinecone).
5. **Inteligencia Artificial:** APIs de **Gemini Flash** (Gemini 2.0) y **OpenAI GPT-4o-mini**, ofreciendo los costos por token más bajos de la industria con capacidades excepcionales de razonamiento y uso de herramientas (Function Calling).

---

## 📂 Documentación de Diseño y Planificación (Fases 1-20)

Puedes consultar las especificaciones detalladas en la carpeta `docs/`:

* [01. Estudio de Mercado, Product Discovery y Modelo de Negocio](docs/01_market_research.md)
* [02. Roadmap de Producto y Viabilidad Financiera](docs/02_product_design_and_pricing.md)
* [03. Arquitectura Empresarial (C4 Model & DDD)](docs/03_enterprise_architecture.md)
* [04. Arquitectura Técnica y Modelo de Base de Datos](docs/04_technical_architecture.md)
* [05. Integración con WhatsApp e Inteligencia Artificial](docs/05_ai_and_whatsapp_integration.md)
* [06. Sistemas de Pedidos, Pagos y Seguridad](docs/06_core_systems.md)
* [07. Estrategia DevOps y Aplicación Móvil Flutter](docs/07_devops_and_mobile.md)
* [08. Requerimientos y Historias de Usuario Gherkin](docs/08_requirements_and_user_stories.md)
* [09. Roadmap, Estándar SRS e Informe de Recomendación Final](docs/09_project_management.md)

---

## 🛠️ Requisitos e Inicio Rápido (Local)

### Requisitos Previos
* Docker y Docker Compose
* Python 3.11+ (para desarrollo local de backend)
* Node.js 18+ (para desarrollo local de frontend)
* Flutter SDK (para desarrollo local móvil)

### Levantar Infraestructura Local (Base de Datos & Cache)
```bash
docker-compose up -d
```
