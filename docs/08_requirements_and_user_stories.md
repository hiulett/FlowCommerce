# 08. Requerimientos y Historias de Usuario Gherkin

---

## FASE 16 – HISTORIAS DE USUARIO (CON CRITERIOS DE ACEPTACIÓN GHERKIN)

A continuación se detallan las historias de usuario clave para los diferentes roles de la plataforma, estimadas en tallas de complejidad (S, M, L, XL).

### 16.1 Dueño del Comercio (Tenant Admin)

#### Historia de Usuario: Configuración de la IA y Catálogo
*   **Como** Dueño de la Tienda,
    **quiero** importar mi catálogo de productos y definir las reglas del prompt del asistente virtual en la Consola Web,
    **para** que la IA responda preguntas y venda con precisión sobre mis productos específicos.
*   **Prioridad:** Alta.
*   **Complejidad:** M (Mediana).
*   **Criterio de Aceptación (Gherkin):**
    ```gherkin
    Dado que soy un usuario autenticado con el rol "ADMIN",
    Cuando ingreso a la sección "Configuración de IA" en la Consola Web, cargo un archivo CSV con mi catálogo e ingreso un prompt de personalidad,
    Entonces el sistema debe vectorizar las descripciones de los productos (pgvector) y asociarlas a mi tenant_id, mostrando un mensaje de confirmación exitosa.
    ```

---

### 16.2 Operador de Tienda / Cocinero (Tenant Operator)

#### Historia de Usuario: Gestión de Pedidos en Tiempo Real
*   **Como** Operador del Comercio,
    **quiero** ver los pedidos confirmados por WhatsApp de inmediato en mi panel de control sin recargar la página,
    **para** comenzar su preparación sin demoras de comunicación.
*   **Prioridad:** Alta.
*   **Complejidad:** M.
*   **Criterio de Aceptación (Gherkin):**
    ```gherkin
    Dado que estoy en la pantalla de pedidos en la Consola Web o App Móvil y tengo conexión activa,
    Cuando el sistema de IA confirma una orden de un cliente final por WhatsApp,
    Entonces la interfaz debe reproducir una alerta sonora, insertar la tarjeta del pedido en estado "PREPARING" en la parte superior de la columna de pendientes y mostrar los ítems detallados.
    ```

---

### 16.3 Repartidor (Delivery Agent)

#### Historia de Usuario: Confirmación de Entrega por Geolocalización
*   **Como** Repartidor de la tienda,
    **quiero** ver la ubicación exacta del cliente en un mapa dentro de mi app y registrar la entrega con firma o código de verificación,
    **para** actualizar la orden en tiempo real y evitar fraudes.
*   **Prioridad:** Media-Alta.
*   **Complejidad:** L (Grande).
*   **Criterio de Aceptación (Gherkin):**
    ```gherkin
    Dado que tengo una orden asignada en estado "SHIPPED" en mi aplicación móvil,
    Cuando llego a la coordenada GPS de entrega y el cliente firma la pantalla o ingresa el código OTP provisto en su chat de WhatsApp,
    Entonces el estado del pedido debe pasar de forma segura a "DELIVERED", registrando la hora exacta y liberando al repartidor para una nueva ruta.
    ```

---

### 16.4 Cliente Final (WhatsApp User)

#### Historia de Usuario: Compra Conversacional e Inserción al Carrito
*   **Como** cliente final,
    **quiero** pedir productos enviando textos naturales en WhatsApp,
    **para** comprar rápidamente sin descargar aplicaciones ni registrarme en páginas web.
*   **Prioridad:** Alta.
*   **Complejidad:** XL.
*   **Criterio de Aceptación (Gherkin):**
    ```gherkin
    Dado que le he escrito al número de WhatsApp de una tienda registrada,
    Cuando escribo "Quiero ordenar dos pizzas familiares de pepperoni y una gaseosa de 2 litros",
    Entonces la IA del sistema debe buscar los productos en base de datos, validar stock, responder confirmando los ítems, y adjuntar un resumen del carrito dinámico en texto junto con un botón interactivo para proceder al pago.
    ```

---

### 16.5 Operador de Despacho (Tablero Kanban Tactil KDS)

#### Historia de Usuario: Monitoreo de Urgencia en KDS
*   **Como** Operador de Despacho,
    **quiero** visualizar alertas de colores y cronómetros de tiempo en las tarjetas Kanban,
    **para** priorizar de inmediato los pedidos más antiguos y evitar retrasos en las entregas.
*   **Prioridad:** Alta.
*   **Complejidad:** S (Pequeña).
*   **Criterio de Aceptación (Gherkin):**
    ```gherkin
    Dado que estoy visualizando el Monitor de Órdenes KDS,
    Cuando un pedido en preparación alcanza los 15 minutos de espera sin ser despachado,
    Entonces la tarjeta correspondiente debe cambiar su color de tiempo a naranja e iniciar un borde parpadeante de alerta amarilla.
    ```

---

## FASE 17 – REQUERIMIENTOS FORMALES DEL SISTEMA

### 17.1 Requerimientos Funcionales (RF)

| Código | Módulo | Descripción del Requerimiento |
| :--- | :--- | :--- |
| **RF-01** | Multi-Tenancy | El sistema debe aislar lógicamente los datos de cada comercio mediante políticas de Row-Level Security (RLS) en base de datos. |
| **RF-02** | WhatsApp API | El sistema debe recibir mensajes de WhatsApp (texto, audio, imagen, ubicación) y despacharlos a colas asíncronas de inmediato. |
| **RF-03** | Motor RAG | El sistema debe convertir textos de usuario a vectores e interrogar a PostgreSQL pgvector para obtener similitudes de stock. |
| **RF-04** | Orquestación LLM| El backend debe enviar la información a Gemini API combinando el System Prompt del tenant, historial y contexto del catálogo. |
| **RF-05** | Carrito Conversacional | El sistema debe permitir a la IA agregar, modificar y restar ítems de un carrito de compra virtual asociado al número de teléfono. |
| **RF-06** | Validación Stock| El sistema debe reservar el stock temporalmente al finalizar un pedido y regresarlo si el pago no se completa en 30 minutos. |
| **RF-07** | Pago - Stripe | El backend debe integrarse con Stripe para generar links de pago dinámicos asociados a las órdenes de FlowCommerce. |
| **RF-08** | Pago - Webhooks | El sistema debe escuchar eventos de Stripe y marcar las órdenes como "PREPARING" en tiempo real al recibir confirmación de cobro. |
| **RF-09** | Consola Web | El sistema debe proveer una consola React para la gestión de productos, inventario, visualización de pedidos y prompts. |
| **RF-10** | App Flutter | La app móvil debe ofrecer flujos de trabajo específicos para Dueños, Operadores y Repartidores con notificaciones push. |
| **RF-11** | Ubicación GPS | La app móvil debe capturar coordenadas de entrega e integrarse con mapas para calcular costos y mostrar rutas. |
| **RF-12** | Modo Offline | La app Flutter debe guardar las transacciones locales en Isar DB para sincronizarlas al recuperar conexión. |
| **RF-13** | Transferencia Humana | El operador debe poder desactivar temporalmente la IA de un chat desde la consola web para interactuar de forma manual con el cliente. |
| **RF-14** | Encriptación | El sistema debe encriptar de forma simétrica (AES-256) todos los tokens y credenciales de APIs de terceros en la base de datos. |
| **RF-15** | Control de Auditoría| Cada cambio de configuración financiera, eliminación de productos o reembolsos debe registrarse en la tabla de logs de auditoría. |
| **RF-16** | Alertas Visuales KDS | El Monitor de Órdenes debe activar alarmas visuales (cambios de color) y sonoras en la interfaz cuando los pedidos excedan el tiempo límite establecido. |
| **RF-17** | Tránsito KDS Un Clic | El Monitor KDS debe permitir actualizar el estado del pedido a través de botones táctiles sobredimensionados de acción rápida. |

---

### 17.2 Requerimientos No Funcionales (RNF)

*   **RNF-01: Latencia de Entrada del Webhook (WhatsApp):** El endpoint del webhook de WhatsApp en FastAPI debe responder con un código de estado `HTTP 200 OK` en menos de **50 milisegundos** tras recibir el payload de Meta para evitar bloqueos y reintentos del proveedor.
*   **RNF-02: Tiempo de Generación de Respuesta de la IA:** El tiempo total desde que el usuario envía el mensaje hasta que recibe la respuesta en WhatsApp (incluyendo vectorización, llamada al LLM y request a Meta) no debe superar los **3.0 segundos** bajo condiciones normales.
*   **RNF-03: Alta Concurrencia de Webhooks:** El backend modular de FastAPI debe ser capaz de procesar de forma concurrente al menos **100 solicitudes de webhooks entrantes por segundo** ejecutándose en un hardware base de 2 vCPUs y 4GB RAM.
*   **RNF-04: Seguridad de Comunicaciones:** Todo el tráfico HTTP/WebSocket entre la API, la consola web y la app móvil debe viajar obligatoriamente encriptado bajo el protocolo **TLS 1.3** (HTTPS).
*   **RNF-05: Disponibilidad (Uptime):** La plataforma SaaS global debe garantizar una tasa de disponibilidad operativa del **99.9%** anual, calculada y monitoreada externamente.
*   **RNF-06: Aislamiento de Red y Datos (Multi-Tenant):** Ningún tenant debe poder acceder a datos de productos, clientes o pedidos de otro tenant. Las consultas de base de datos se validarán estrictamente a nivel de base de datos mediante políticas PostgreSQL RLS.
*   **RNF-07: Portabilidad de Despliegue:** El sistema backend y frontend debe ser totalmente agnóstico de proveedor cloud, empaquetado en contenedores estándar de Docker compatibles con cualquier VPS local o infraestructura de nube compleja.
