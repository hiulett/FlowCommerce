# 04. Arquitectura Técnica y Modelo de Base de Datos

---

## FASE 7 – ARQUITECTURA TÉCNICA (COMPARACIÓN Y SELECCIÓN DE STACK)

Para cumplir con la solicitud del usuario ("Elige la que menos costos genere y que sea compatible con la mayoría de los servidores en donde pueda desplegar el sistema"), realizamos una evaluación rigurosa considerando el consumo de recursos de cómputo (RAM/CPU), facilidad de despliegue en contenedores estándares y costos de mantenimiento.

### 7.1 Backend

| Criterio | NestJS (Node.js) | FastAPI (Python) | ASP.NET Core (.NET) | Spring Boot (Java) |
| :--- | :--- | :--- | :--- | :--- |
| **Consumo RAM Base** | ~80 MB | **~35 MB** | ~120 MB | ~250 MB |
| **Costo Servidor** | Bajo | **Mínimo** | Medio-Alto | Alto (Requiere más RAM) |
| **Integración IA** | Buena (JS SDK) | **Excelente (Nativa Python)** | Regular (SDKs limitados) | Regular |
| **Desempeño I/O** | Alto (Asíncrono) | **Muy Alto (uvicorn/async)** | Excelente (Compilado) | Alto |
| **Compatibilidad VPS** | Excelente (Docker) | **Excelente (Docker)** | Buena (Docker Linux) | Buena |

*   **Selección:** **FastAPI (Python)**.
*   **Justificación:** Python es la lengua franca de la Inteligencia Artificial. FastAPI es extremadamente ligero (consume menos de la mitad de RAM que NestJS en reposo y una fracción de Spring Boot), lo que nos permite ejecutar múltiples servicios dentro de una instancia de $5 USD/mes. Además, facilita la integración directa con librerías de IA y embeddings (LangChain, OpenAI SDK, Google Generative AI) sin dependencias externas complejas.

---

### 7.2 Frontend (Consola Web)

| Criterio | Angular | React (con Vite) | Vue.js |
| :--- | :--- | :--- | :--- |
| **Costo Hosting** | Gratis (Estático) | **Gratis (Estático)** | Gratis (Estático) |
| **Tamaño de Bundle** | Grande (>1MB) | **Pequeño (~150KB)** | Pequeño (~180KB) |
| **Facilidad de Desarrollo**| Media-Alta | **Alta** | Alta |
| **Ecosistema / Librerías** | Completo | **Inmenso** | Medio |

*   **Selección:** **React + Vite (TypeScript)**.
*   **Justificación:** La consola administrativa se compila a un bundle estático (HTML/JS/CSS). Al usar Vite, se genera un build altamente optimizado que puede ser alojado a costo cero ($0.00 USD) en plataformas de CDN (Vercel, Netlify, Cloudflare Pages o Github Pages), ahorrando costos de servidor y liberando recursos del backend.

---

### 7.3 Base de Datos e IA Vectorial

| Opción | PostgreSQL + pgvector (Elegida) | MySQL + Pinecone (Vectorial externa) | MongoDB (NoSQL) |
| :--- | :--- | :--- | :--- |
| **Costo Base BD** | **$0 USD (Local Dockerizado)** | $0 USD (MySQL) + $70 USD (Pinecone) | $0 USD (MongoDB Atlas gratis limitado) |
| **Consistencia de Datos**| **ACID Completo (Relacional)**| ACID Completo / Eventual en Pinecone | Eventual / Documental |
| **Búsqueda Vectorial** | **pgvector (Integrado)** | Pinecone (Externa paga) | Búsqueda vectorial propia (Paga) |
| **Complejidad DevOps** | **Mínima (Una sola BD)** | Alta (Sincronizar MySQL y Pinecone) | Media |

*   **Selección:** **PostgreSQL con la extensión `pgvector`**.
*   **Justificación:** En lugar de pagar por una base de datos vectorial dedicada como Pinecone o Weaviate (cuyos costos mínimos inician en $70 USD/mes), `pgvector` permite usar la misma base de datos PostgreSQL del sistema transaccional para realizar búsquedas semánticas de RAG. Esto unifica la infraestructura, garantiza consistencia ACID inmediata entre transacciones y stock, y corre localmente en el contenedor Docker sin costo extra.

---

### 7.4 Infraestructura y Servidor Cloud
*   **Selección:** **VPS Linux (Ubuntu) autohospedado en Hetzner o similar + Coolify**.
*   **Justificación:** Hetzner ofrece VPS premium por ~5 USD/mes con 4GB de RAM. Usando **Coolify** (un panel alternativo a Heroku autohospedado y de código abierto), podemos gestionar contenedores Docker, bases de datos con backups automáticos y certificados SSL (Let's Encrypt) automáticos a costo cero de licencias. El sistema es totalmente compatible con cualquier VPS de bajo costo (DigitalOcean, Vultr, Linode, AWS EC2 de tier gratuito o local).

---

## FASE 8 – DISEÑO DETALLADO DEL SISTEMA Y BASE DE DATOS

### 8.1 Patrón de Arquitectura: Monolito Modular

Para el MVP y la fase inicial de escalamiento comercial (hasta 500 comercios activos), se implementará una arquitectura de **Monolito Modular** en lugar de microservicios.

#### Justificación
Un sistema de microservicios requiere múltiples contenedores independientes (Gateway, Auth, WhatsApp Service, AI Agent, Payment Service), lo que dispara el consumo base de RAM por encima de los 2GB a 4GB tan solo para mantener los servicios activos (sin tráfico). Esto haría imposible su ejecución en servidores de bajo costo y complicaría las tareas DevOps (orquestación Kubernetes, Service Discovery, tracing distribuido).

El Monolito Modular agrupa la lógica de negocio en módulos claramente delimitados de acuerdo a los Bounded Contexts de DDD (ver `docs/03_enterprise_architecture.md`) en un único proceso FastAPI.
*   **Aislamiento de código:** Las importaciones cruzadas entre módulos están prohibidas; toda comunicación se hace vía servicios de interfaz definidos o eventos.
*   **Preparación para Microservicios:** Si un módulo específico (como la integración de WhatsApp o el motor de IA) requiere escalar de forma independiente en el futuro debido a la carga, se puede desacoplar y migrar a un microservicio en cuestión de horas, ya que la base de código ya respeta los límites de dominio.

---

### 8.2 Modelo Físico de Base de Datos (Relaciones y Tipos de Datos)

El esquema utiliza la estructura PostgreSQL relacional con soporte de vectores (`vector`) para almacenar la información de los catálogos contextualizados de cada negocio.

```
  +--------------+        +--------------+        +---------------+
  |   tenants    |        |    users     |        |   customers   |
  | (1)      (N) |        | (1)      (N) |        | (1)       (N) |
  +-------+------+        +-------+------+        +-------+-------+
          |                       |                       |
          |  +--------------------+                       |
          v  v                                            v
  +-------+------+        +--------------+        +-------+-------+
  |    orders    |<------|  order_items  |<------|   products    |
  | (1)      (N) |        |              |        | (N)       (1) |
  +-------+------+        +--------------+        +-------+-------+
          |                                               ^
          v                                               |
  +-------+------+                                +-------+-------+
  |   payments   |                                |  categories   |
  +--------------+                                +---------------+
```

#### 1. Tabla: `tenants` (Aislamiento Multi-Tenant)
Almacena la configuración de cada negocio.
*   `id`: `UUID` (Primary Key, autogenerado).
*   `name`: `VARCHAR(100)` (Nombre comercial).
*   `whatsapp_phone_id`: `VARCHAR(50)` (ID de teléfono provisto por Meta API).
*   `whatsapp_access_token`: `TEXT` (Token de acceso seguro del número).
*   `ai_system_prompt`: `TEXT` (Prompt del sistema para configurar el comportamiento de la IA).
*   `status`: `VARCHAR(20)` (`ACTIVE`, `SUSPENDED`).
*   `created_at`: `TIMESTAMP` (Default `NOW()`).

#### 2. Tabla: `users` (Usuarios Administrativos)
*   `id`: `UUID` (Primary Key).
*   `tenant_id`: `UUID` (Foreign Key -> `tenants.id`, Indexado).
*   `email`: `VARCHAR(150)` (Unique).
*   `password_hash`: `VARCHAR(255)`.
*   `role`: `VARCHAR(30)` (`ADMIN`, `OPERATOR`, `DELIVERY_AGENT`).
*   `created_at`: `TIMESTAMP`.

#### 3. Tabla: `customers` (Clientes Finales que compran por WhatsApp)
*   `id`: `UUID` (Primary Key).
*   `tenant_id`: `UUID` (Foreign Key -> `tenants.id`).
*   `phone_number`: `VARCHAR(20)` (Número de teléfono del remitente, e.g., `573001234567`, Indexado).
*   `full_name`: `VARCHAR(150)` (Nombre autodetectado u obtenido por conversación).
*   `created_at`: `TIMESTAMP`.

#### 4. Tabla: `categories` (Categorías de Productos)
*   `id`: `UUID` (Primary Key).
*   `tenant_id`: `UUID` (Foreign Key -> `tenants.id`).
*   `name`: `VARCHAR(100)`.
*   `description`: `TEXT`.

#### 5. Tabla: `products` (Catálogo de Productos)
*   `id`: `UUID` (Primary Key).
*   `tenant_id`: `UUID` (Foreign Key -> `tenants.id`, Indexado).
*   `category_id`: `UUID` (Foreign Key -> `categories.id`).
*   `name`: `VARCHAR(150)`.
*   `description`: `TEXT`.
*   `price`: `NUMERIC(10, 2)` (Precio del ítem).
*   `stock`: `INT` (Disponibilidad actual).
*   `image_url`: `VARCHAR(255)` (URL de la imagen del producto).
*   `embedding`: `VECTOR(1536)` (Vector de embeddings para búsqueda RAG con pgvector. 1536 dimensiones para compatibilidad con embeddings de OpenAI o Gemini).
*   `is_active`: `BOOLEAN` (Default `TRUE`).

#### 6. Tabla: `orders` (Pedidos Transaccionales)
*   `id`: `UUID` (Primary Key).
*   `tenant_id`: `UUID` (Foreign Key -> `tenants.id`, Indexado).
*   `customer_id`: `UUID` (Foreign Key -> `customers.id`, Indexado).
*   `status`: `VARCHAR(30)` (`PENDING_PAYMENT`, `PREPARING`, `SHIPPED`, `DELIVERED`, `CANCELLED`).
*   `total_amount`: `NUMERIC(10, 2)`.
*   `shipping_address`: `TEXT` (Ubicación física aproximada).
*   `latitude`: `DECIMAL(9, 6)` (Coordenada GPS).
*   `longitude`: `DECIMAL(9, 6)` (Coordenada GPS).
*   `created_at`: `TIMESTAMP`.

#### 7. Tabla: `order_items` (Detalle de Pedidos)
*   `id`: `UUID` (Primary Key).
*   `order_id`: `UUID` (Foreign Key -> `orders.id`, CASCADE ON DELETE).
*   `product_id`: `UUID` (Foreign Key -> `products.id`).
*   `quantity`: `INT` (Cantidad comprada).
*   `price`: `NUMERIC(10, 2)` (Precio de venta unitario histórico).

#### 8. Tabla: `payments` (Transacciones de pago)
*   `id`: `UUID` (Primary Key).
*   `tenant_id`: `UUID` (Foreign Key -> `tenants.id`).
*   `order_id`: `UUID` (Foreign Key -> `orders.id`, Unique).
*   `gateway`: `VARCHAR(50)` (`STRIPE`, `PAYPAL`, `YAPPY`, `CASH`, `QR`).
*   `gateway_transaction_id`: `VARCHAR(100)` (Unique, Indexado).
*   `status`: `VARCHAR(30)` (`PENDING`, `COMPLETED`, `FAILED`, `REFUNDED`).
*   `created_at`: `TIMESTAMP`.

#### 9. Tabla: `conversations` (Sesión de Chats de WhatsApp)
*   `id`: `UUID` (Primary Key).
*   `tenant_id`: `UUID` (Foreign Key -> `tenants.id`).
*   `customer_id`: `UUID` (Foreign Key -> `customers.id`, Unique).
*   `last_interaction`: `TIMESTAMP` (Para controlar la ventana conversacional de 24 horas).

#### 10. Tabla: `messages` (Historial conversacional para Contexto de IA)
*   `id`: `UUID` (Primary Key).
*   `conversation_id`: `UUID` (Foreign Key -> `conversations.id`, CASCADE).
*   `sender`: `VARCHAR(10)` (`CUSTOMER`, `ASSISTANT`).
*   `message_type`: `VARCHAR(20)` (`TEXT`, `LOCATION`, `IMAGE`, `AUDIO`).
*   `content`: `TEXT` (Contenido textual o URL de archivo).
*   `created_at`: `TIMESTAMP` (Indexado para recuperar los últimos N mensajes como memoria a corto plazo de la IA).

#### 11. Tabla: `audit_logs` (Seguridad y Auditoría)
*   `id`: `UUID` (Primary Key).
*   `tenant_id`: `UUID` (Foreign Key -> `tenants.id`).
*   `user_id`: `UUID` (Foreign Key -> `users.id`, nullable para eventos del sistema).
*   `action`: `VARCHAR(100)`.
*   `ip_address`: `VARCHAR(45)`.
*   `details`: `JSONB` (Datos del payload histórico de cambios).
*   `created_at`: `TIMESTAMP` (Default `NOW()`).

---

### 8.3 Estrategia de Indexación
Para asegurar que las búsquedas se realicen en milisegundos en nuestro hardware económico:
*   **Índices HNSW (Hierarchical Navigable Small World):** En la columna `embedding` de la tabla `products` para agilizar las búsquedas vectoriales semánticas:
    ```sql
    CREATE INDEX ON products USING hnsw (embedding vector_cosine_ops);
    ```
*   **Índices B-Tree compuestos:** En `(tenant_id, phone_number)` en la tabla `customers` e `(tenant_id, status)` en `orders`.
