# 01. Investigación de Mercado, Product Discovery y Modelo de Negocio

---

## FASE 1 – INVESTIGACIÓN Y VALIDACIÓN DE MERCADO

### 1.1 Investigación del Sector (Comercio Conversacional & IA)
El **Comercio Conversacional (c-commerce)** se ha posicionado como uno de los canales de mayor crecimiento a nivel global. A diferencia del e-commerce tradicional (web y apps dedicadas), el comercio conversacional permite a los usuarios realizar compras directamente dentro de canales de mensajería que ya usan a diario.

*   **Tamaño del Mercado Global:** El mercado de comercio conversacional se valoró en aproximadamente **$9.5 mil millones de USD** en 2024 y se proyecta que alcanzará los **$29.6 mil millones de USD** para 2030, con una tasa de crecimiento anual compuesta (CAGR) del **20.8%**.
*   **Adopción de WhatsApp Business:** WhatsApp cuenta con más de **2,400 millones de usuarios activos mensuales** en todo el mundo. La API de WhatsApp Cloud procesa miles de millones de mensajes diarios. Más de 50 millones de empresas usan WhatsApp Business, y las interacciones de los clientes con cuentas de empresa crecen a una tasa interanual superior al **80%**.
*   **Oportunidades en Latinoamérica (LATAM):** Latinoamérica es la región más "WhatsApp-céntrica" del planeta. En países como **Brasil, México, Colombia y Argentina**, la penetración de WhatsApp entre los usuarios de smartphones supera el **93%**. Más del **70%** de los consumidores en LATAM prefiere comunicarse con una marca a través de chat en lugar de llamar por teléfono o enviar un correo electrónico. Esto crea una oportunidad única para FlowCommerce: las pymes de la región necesitan desesperadamente digitalizarse, pero sus clientes finales rechazan descargar apps nativas debido a limitaciones de almacenamiento en sus dispositivos y planes de datos móviles limitados.
*   **Adopción de IA Conversacional:** La introducción de Large Language Models (LLMs) con APIs de bajo costo (como Gemini Flash y GPT-4o-mini) permite reemplazar los antiguos chatbots de árboles de decisión rígidos por agentes autónomos capaces de entender modismos locales, resolver dudas contextuales complejas, y recomendar productos basados en el inventario real a una fracción del costo histórico.

---

### 1.2 Análisis de Competidores

| Competidor | Modelo de Negocio | Funcionalidades Clave | Arquitectura Aparente | Fortalezas | Debilidades | Precios Base (Mensual) | Nicho Objetivo | Oportunidad para FlowCommerce |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Wati** | SaaS por suscripción + Costos de API de Meta. | Bandeja de entrada compartida, flujos de automatización simples, broadcast de mensajes. | Monolito en Node.js, bases de datos no relacionales, integraciones webhook básicas. | Interfaz intuitiva para pymes, buena gestión de plantillas autorizadas. | Chatbots muy rígidos basados en reglas fijas, sin RAG ni IA generativa nativa avanzada. | ~ $49 USD (hasta 5 agentes). | Medianas empresas con equipos de soporte. | IA conversacional fluida integrada con el catálogo de productos y checkout. |
| **ManyChat** | Freemium / SaaS según volumen de contactos. | Constructor visual de flujos (drag-and-drop), automatización en Instagram/WhatsApp/FB Messenger. | Serverless y microservicios, APIs de Meta integradas, bases de datos en tiempo real. | Excelente constructor visual de flujos, fácil integración con marketing. | No está optimizado para flujos transaccionales complejos (pedidos, stock e inventario dinámico). | ~ $15 - $45 USD + costos de escala. | Creadores de contenido y agencias de marketing. | Integración nativa de backend transaccional (pedidos de farmacias, ferreterías, restaurantes). |
| **Respond.io** | SaaS premium con tiers por usuarios/contactos. | Bandeja multicanal unificada (WhatsApp, Telegram, Line, Viber, Web), ruteo avanzado. | Microservicios de alta concurrencia en Go/Node.js, PostgreSQL y Redis para persistencia. | Altamente escalable, ruteo de chats avanzado para grandes equipos de soporte. | Curva de aprendizaje alta, configuración compleja de IA conversacional. | ~ $79 USD (básico). | Empresas grandes con centros de soporte multicanal. | Enfoque de automatización autónoma de venta transaccional directa sin intervención humana. |
| **Botpress** | Pago por uso / Créditos mensuales. | Plataforma de desarrollo de chatbots con LLM integrado, base de conocimientos (RAG). | Entorno Node.js/Typescript en la nube, integración nativa de APIs vectoriales y vector DB. | Integración nativa muy fuerte con GPT y Claude, RAG avanzado. | Requiere conocimientos técnicos para configurar flujos transaccionales e inventario. | Gratuito básico; planes de pago según volumen de tokens. | Desarrolladores y agencias de automatización. | Interfaz Web y App Móvil sin código (No-Code) específica para que comerciantes gestionen su catálogo. |
| **Twilio** | Pago por uso (Pay-as-you-go). | APIs de SMS, WhatsApp y voz. Ruteador programable (Segment, Flex). | Arquitectura Cloud global, alta disponibilidad, balanceo automático. | Robustez de infraestructura inigualable, control absoluto del flujo. | Costosa para pymes, requiere desarrollo completo de frontend y motor de IA desde cero. | Costo por mensaje enviado/recibido (~$0.005 USD) + cargos de Meta. | Desarrolladores y equipos de ingeniería. | Plataforma SaaS llave en mano donde el comerciante no escribe una sola línea de código. |

---

### 1.3 Necesidades Reales de Usuarios (Análisis de Voz del Cliente)
A través de la investigación de foros como Reddit (r/SaaS, r/ecommerce), reviews de aplicaciones competidoras y comentarios en redes sociales, hemos identificado las siguientes **frustraciones frecuentes**:

1.  **"Chatbots tontos e irritantes":** Los clientes se frustran cuando los chatbots competidores basados en flujos rígidos entran en bucles sin salida si el cliente escribe algo fuera de la plantilla predeterminada (por ejemplo, escribir "quiero un combo pero sin cebolla").
2.  **Desconexión del Catálogo y Stock:** Los sistemas de chat actuales están aislados del sistema de inventario físico del negocio. Un cliente puede pedir un producto por WhatsApp y pagarlo, para luego recibir una llamada del comercio indicando que no hay existencias.
3.  **Falta de Soporte Offline y Gestión sobre la Marcha:** Los dueños de pequeños comercios (ej. restaurantes locales) pasan el día en movimiento. Las consolas complejas web de competidores como Respond.io o Wati no cuentan con una aplicación móvil ágil para que el dueño o repartidor gestione los pedidos recibidos en tiempo real.
4.  **Costos Excesivos de Setup y Comisiones Ocultas:** Las plataformas Enterprise imponen barreras de entrada financieras severas, haciendo inviable la adopción para microempresas que procesan volúmenes variables.

---

### 1.4 Conclusiones del Mercado
**¿Vale la pena construir FlowCommerce?**
**Sí, categóricamente.** Si bien existen soluciones de soporte multicanal y automatización de marketing, el nicho de las **ventas transaccionales automatizadas por IA y WhatsApp con gestión móvil y control de entrega** está desatendido en Latinoamérica y mercados emergentes.
Existe una demanda masiva latente debido a que las pymes buscan aumentar sus tasas de conversión digitales sin la fricción de forzar a sus clientes a descargar aplicaciones móviles. La combinación de APIs de bajo coste como Gemini 2.0 Flash junto con una arquitectura optimizada permite ofrecer un producto de bajo costo de mantenimiento altamente competitivo.

---

## FASE 2 – PRODUCT DISCOVERY

### 2.1 Problemas Resolutivos
*   **Problema Principal:** Pérdida de ventas en canales digitales debido a la fricción de registro/descarga de aplicaciones o redirección a páginas web mal optimizadas para móviles, sumado a la lentitud en la atención por chat humano.
*   **Problemas Secundarios:**
    *   Incapacidad para procesar pedidos de WhatsApp fuera del horario de atención comercial.
    *   Falta de trazabilidad física y digital en las rutas de entrega de los repartidores para compras hechas por chat.
    *   Procesamiento manual ineficiente de pedidos y cobros que genera cuellos de botella en cocinas o despachos.

---

### 2.2 Buyer Personas de Comercios (Tenants)

#### 1. Carlos - Dueño de Restaurante (Pizzería Local)
*   **Objetivos:** Automatizar la toma de pedidos los fines de semana cuando la pizzería colapsa de mensajes y llamadas en WhatsApp.
*   **Dolores:** Perder un 25% de ventas debido a demoras de 15 minutos en responder los chats del menú.
*   **Nivel Tecnológico:** Bajo-Medio. Usa WhatsApp Business básico y una app de punto de venta (POS) sencilla.
*   **Capacidad de Pago:** Hasta $50 USD mensuales si se demuestra un incremento de ventas directas.

#### 2. Sofía - Administradora de Cafetería y Repostería
*   **Objetivos:** Permitir pedidos "para retirar" (Click & Collect) programados de forma autónoma.
*   **Dolores:** Clientes que ordenan tarde y stock limitado de pasteles del día que se vende doblemente por error.
*   **Nivel Tecnológico:** Medio. Maneja redes sociales e Instagram.
*   **Capacidad de Pago:** Hasta $30 USD mensuales.

#### 3. Dr. Andrés - Propietario de Farmacia de Barrio
*   **Objetivos:** Recibir pedidos de recetas y medicamentos urgentes, solicitar ubicación para delivery rápido.
*   **Dolores:** Explicar alternativas genéricas de medicamentos consume demasiado tiempo del personal farmacéutico en el chat.
*   **Nivel Tecnológico:** Medio. Cuenta con sistema de inventario local básico.
*   **Capacidad de Pago:** Hasta $80 USD mensuales por la criticidad de la velocidad de atención.

#### 4. Laura - Gerente de Operaciones de Courier Regional
*   **Objetivos:** Permitir a los usuarios cotizar envíos, solicitar recogida a domicilio y consultar tracking de paquetes por WhatsApp.
*   **Dolores:** Colapso de soporte al cliente preguntando "¿Dónde está mi paquete?".
*   **Nivel Tecnológico:** Alto. Requiere integraciones API con su sistema central de despacho.
*   **Capacidad de Pago:** $150+ USD mensuales.

---

### 2.3 Propuesta de Valor
*   **Para el Comercio (Tenant):** "Duplica tu capacidad de recepción de pedidos sin contratar personal adicional. FlowCommerce transforma tu WhatsApp Business en un vendedor experto con IA que gestiona el inventario, procesa cobros y despacha pedidos en piloto automático 24/7."
*   **Para el Cliente Final:** "Compra lo que necesitas en segundos enviando un simple mensaje de chat. Sin contraseñas, sin descargar apps adicionales, y con seguimiento en tiempo real de tu entrega."

---

### 2.4 Product-Market Fit & Riesgos Clave
Para alcanzar el Product-Market Fit (PMF), el sistema debe lograr que la IA resuelva con éxito al menos el **85% de las interacciones transaccionales ordinarias sin intervención humana**, manteniendo un tiempo promedio de procesamiento de pedidos por debajo de los **90 segundos**.

#### Riesgos Críticos & Mitigaciones
1.  **Bloqueo de Números por Spam de Meta:**
    *   *Mitigación:* Uso exclusivo de la **API oficial de WhatsApp Cloud** mediante cuentas de Meta Business Suite verificadas, evitando software no oficial de raspado web (scraping).
2.  **Alucinaciones de la IA en Precios y Disponibilidad:**
    *   *Mitigación:* Implementación de un flujo RAG estricto con validaciones a nivel de base de datos relacional antes de confirmar cualquier precio o pedido. La IA nunca inventa stock; hace consultas deterministas a través de Function Calling a la API.

---

## FASE 4 – MODELO DE NEGOCIO

Elegimos un **Modelo SaaS Freemium con Cobro Híbrido** (Suscripción fija mensual + cobros basados en consumo de recursos de IA y pasarela de pago). Esto minimiza la barrera de entrada para microempresas y permite capturar mayor valor a medida que los clientes escalan.

### 4.1 Matriz de Planes y Límites

| Característica / Plan | Plan Gratuito (Semilla) | Plan Básico (Crecimiento) | Plan Profesional (Escala) | Plan Enterprise (Corporativo) |
| :--- | :--- | :--- | :--- | :--- |
| **Precio Mensual** | $0 USD | $29 USD | $79 USD | Personalizado ($199+ USD) |
| **Usuarios Administradores**| 1 | 3 | 10 | Ilimitados |
| **Números de WhatsApp** | 1 (Línea de prueba) | 1 Línea Oficial | 2 Líneas Oficiales | Conexiones ilimitadas |
| **Conversaciones / Mes** | 100 gratis | 1,000 gratis (+ extra a costo) | 5,000 gratis | Ilimitadas bajo contrato |
| **Costo por Conversación Extra**| N/A | $0.015 USD | $0.010 USD | Tarifa especial negociada |
| **Consultas de IA (Tokens)** | 50,000 tokens/mes | 1M tokens/mes | 5M tokens/mes | Asignación dedicada |
| **Almacenamiento de Archivos**| 100 MB | 2 GB | 10 GB | 100 GB+ |
| **Comisión por Venta (Pagos)**| 2.5% | 1.0% | 0.5% | 0% |
| **Soporte** | Comunidad | Correo y Chat (24h) | Prioritario y Whatsapp (4h)| SLA de 1 hora con Gestor |

### 4.2 Selección de la Estrategia Óptima de Monetización
El cobro híbrido es la solución óptima:
1.  La **Suscripción mensual** cubre los costos fijos de servidores y base de datos.
2.  El **Costo por conversación excedente** se alinea directamente con los costos cobrados por Meta (WhatsApp Cloud API cobra tarifas según el tipo de conversación iniciado por usuario o empresa).
3.  La **Comisión mínima por procesamiento de órdenes** permite monetizar directamente el éxito transaccional del cliente, permitiendo ofrecer planes de suscripción más económicos y atractivos.
