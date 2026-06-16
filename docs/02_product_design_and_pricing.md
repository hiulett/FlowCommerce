# 02. Roadmap de Producto y Viabilidad Financiera

---

## FASE 3 – DISEÑO DEL PRODUCTO

### 3.1 Alcance Incremental del Sistema

```
  +-----------------------------------------------------------+
  |  MVP (Semanas 1-8)                                        |
  |  - WhatsApp Cloud API (Texto)                             |
  |  - Agente IA con FastAPI + RAG Estático (Mock de catálogo)|
  |  - Panel Web básico (React) para Carga de Menú/Catálogo    |
  |  - Pedido sin pago (Contra Entrega o Transferencia manual)|
  +-----------------------------+-----------------------------+
                                |
                                v
  +-----------------------------------------------------------+
  |  Versión 1.0 - Lanzamiento Comercial (Semanas 9-16)        |
  |  - RAG Dinámico (PostgreSQL + pgvector)                   |
  |  - Integración de Pagos (Stripe, Pasarelas Locales, QR)   |
  |  - App Móvil Flutter Básica para Dueño y Operador         |
  |  - Flujos de Geolocalización (Ubicación de WhatsApp)      |
  +-----------------------------+-----------------------------+
                                |
                                v
  +-----------------------------------------------------------+
  |  Versión 2.0 - Optimización & Automatización (Meses 5-8) |
  |  - App Móvil de Repartidor con Seguimiento GPS            |
  |  - Módulo de Analítica y Reportes Avanzados               |
  |  - Campañas de Broadcast de WhatsApp con Plantillas Meta  |
  |  - Multi-agente (IA y Soporte Humano Híbrido)             |
  +-----------------------------+-----------------------------+
                                |
                                v
  +-----------------------------------------------------------+
  |  Versión 3.0 - Escalamiento & Ecosistema (Meses 9+)       |
  |  - Integraciones Externas de Terceros (POS, ERPs, Hubs)   |
  |  - Marketplace Web Multitienda                            |
  |  - Asistente de Voz (Transcribe notas de voz del cliente) |
  |  - Automatizaciones predictivas basadas en historial      |
  +-----------------------------------------------------------+
```

---

### 3.2 Roadmap Detallado

#### Mínimo Producto Viable (MVP)
*   **Funcionalidades Incluidas:**
    *   **Canal WhatsApp:** Conexión manual a través de API Cloud de Meta. Recepción y envío de textos.
    *   **Motor Conversacional:** Agente de IA básico con FastAPI y base de conocimiento estática (directamente inyectada en el prompt del sistema) con información básica del catálogo del comercio.
    *   **Panel Administrativo:** Interfaz React simple para registrar la tienda, configurar horarios de atención e importar el catálogo desde un archivo CSV o formulario simple.
    *   **Sistema de Pedidos:** Registro del pedido en base de datos. Generación de un resumen de compra estructurado enviado al cliente por WhatsApp para confirmación manual.
    *   **Método de Pago:** Pago exclusivo "Contra Entrega" o "Transferencia bancaria directa con envío manual de comprobante de pago por foto".
*   **Qué NO Incluir:**
    *   Pasarelas de pago automatizadas integradas (Stripe, pasarelas locales).
    *   Gestión de rutas de repartidores o geolocalización interactiva avanzada.
    *   Procesamiento de audios de WhatsApp por IA.
    *   Múltiples agentes humanos respondiendo la misma conversación de soporte.
*   **Tiempo de Desarrollo Estimado:** 8 semanas (2 meses).

#### Versión 1.0 (Producción / Comercialización)
*   **Funcionalidades:**
    *   **RAG Dinámico e Inteligente:** PostgreSQL con la extensión `pgvector` para buscar productos de forma semántica en bases de datos extensas (>1000 ítems) con actualizaciones en tiempo real de precios y stock.
    *   **Pasarela de Pagos:** Integración nativa de Stripe y cobros mediante códigos QR dinámicos enviados por WhatsApp.
    *   **App Móvil Flutter (Dueño/Operador):** Notificaciones push inmediatas al recibir un pedido, panel ágil para aceptar, rechazar o cambiar estado del pedido (ej. "En preparación").
    *   **Geolocalización:** El asistente de IA solicita la ubicación de WhatsApp al usuario final, realiza el parseo de coordenadas cartográficas y calcula de forma dinámica el costo de envío basado en zonas definidas.

#### Versión 2.0 (CRM & Analítica)
*   **Funcionalidades:**
    *   **App Repartidor:** Módulo móvil para repartidores con mapeo de rutas mediante APIs de mapas y confirmación digital de entrega (firma digital o código OTP enviado al cliente).
    *   **Bandeja Omnicanal Híbrida:** Capacidad de transferir de forma automática una conversación de la IA a un agente humano en el panel de control web en caso de reclamos o dudas no resueltas.
    *   **Broadcast & Automatización:** Envío masivo automatizado de campañas de marketing aprobadas como plantillas oficiales de Meta.

#### Versión 3.0 (Mercado e Integraciones)
*   **Funcionalidades:**
    *   **Integración ERP/POS:** Conexión con software de inventario local popular (ej. SAP Business One, Clover, Shopify).
    *   **IA de Voz:** Integración con Whisper / Gemini Audio para transcribir notas de voz de clientes finales, procesarlas e identificar productos con modismos locales.

---

## FASE 5 – VIABILIDAD FINANCIERA Y COSTOS OPERATIVOS

Para asegurar la viabilidad comercial y el bajo costo de operación requerido por el usuario, se modelan los costos asumiendo un despliegue en servidores virtuales independientes de alta eficiencia (como Hetzner Cloud o Coolify) y bases de datos relacionales optimizadas.

### 5.1 Estructura Mensual de Costos de Infraestructura (Base Fija)
*   **Servidor de Aplicación (FastAPI + React Build):** $5.00 USD (Hetzner VPS 2 vCPU, 4GB RAM).
*   **Base de Datos Relacional y Vectorial (PostgreSQL + pgvector local):** $5.00 USD (Hetzner Block Storage para persistencia).
*   **Caché y Mensajería (Redis local):** Ejecutado en el mismo servidor de aplicación ($0.00 extra).
*   **Monitoreo y Logs:** Sentry + Uptime Kuma (Tier Gratuito).
*   **Proveedores de Correo (SendGrid/Resend):** Tier Gratuito (hasta 3,000 correos mensuales).
*   **Costo de Infraestructura Base Mensual:** **$10.00 USD**.

---

### 5.2 Costo Operativo por Cliente (Unitario)

Para dimensionar los costos variables, definimos tres tipos de comercios según sus volúmenes transaccionales mensuales:

#### 1. Comercio Pequeño (Restaurante o Cafetería de Barrio)
*   **Volumen:** 300 conversaciones de WhatsApp/mes; 150 pedidos completados/mes.
*   **Consumo de IA:** ~150,000 tokens de entrada y 75,000 tokens de salida (Gemini Flash).
    *   *Costo de IA:* (150,000 * $0.000075 / 1K) + (75,000 * $0.0003 / 1K) = $0.033 USD.
*   **WhatsApp Cloud API (Meta):**
    *   Primeras 1,000 conversaciones del mes son gratis en WhatsApp Cloud API.
    *   *Costo de WhatsApp:* $0.00 USD.
*   **Costo Operativo Variable Unitario:** **$0.033 USD/mes**.
*   **Cobro al Comercio (Plan Básico):** $29.00 USD/mes.
*   **Margen Bruto:** **99.8%**.

#### 2. Comercio Mediano (Farmacia o Tienda de Conveniencia)
*   **Volumen:** 2,000 conversaciones/mes; 800 pedidos completados/mes.
*   **Consumo de IA:** ~1,000,000 tokens de entrada y 500,000 de salida.
    *   *Costo de IA:* (1.0M * $0.000075) + (0.5M * $0.0003) = $0.225 USD.
*   **WhatsApp Cloud API (Meta):**
    *   1,000 conversaciones excedentes cobradas por Meta (Tarifa media en LATAM: $0.02 USD por sesión iniciada por usuario).
    *   *Costo de WhatsApp:* $20.00 USD (Nota: El costo de la API oficial de Meta es facturado al cliente final o deducido del plan profesional).
*   **Costo Operativo Variable Unitario:** **$20.225 USD/mes**.
*   **Cobro al Comercio (Plan Profesional):** $79.00 USD/mes + cobro por conversaciones extra ($20.00 USD).
*   **Margen Bruto:** **79.5%**.

#### 3. Comercio Grande (Courier o Retail)
*   **Volumen:** 10,000 conversaciones/mes.
*   **Consumo de IA:** ~5M tokens de entrada, 2.5M de salida.
    *   *Costo de IA:* $1.125 USD.
*   **WhatsApp Cloud API:** 9,000 conversaciones excedentes = $180.00 USD.
*   **Costo Operativo Variable Unitario:** **$181.125 USD/mes**.
*   **Cobro al Comercio (Plan Enterprise):** $299.00 USD/mes (Meta se factura de forma transparente al cliente).
*   **Margen Bruto:** **60.5%** (Si el costo de Meta está incluido en la tarifa corporativa).

---

### 5.3 Punto de Equilibrio y Escenarios Financieros

Asumiendo un mix de clientes con el siguiente porcentaje de suscripción:
*   **70%** Plan Básico ($29 USD/mes).
*   **25%** Plan Profesional ($79 USD/mes).
*   **5%** Plan Enterprise ($299 USD/mes).
*   **Ingreso Promedio Mensual por Cliente (ARPU):** (0.70 * 29) + (0.25 * 79) + (0.05 * 299) = **$55.00 USD/mes**.

#### Análisis del Punto de Equilibrio (Breakeven)

$$\text{Punto de Equilibrio (Clientes)} = \frac{\text{Costos Fijos de Infraestructura}}{\text{ARPU} - \text{Costo Variable Unitario Promedio}}$$

Dado que el costo de infraestructura base fija es de **$10.00 USD/mes**, el punto de equilibrio se alcanza con tan solo **1 cliente de pago**.

| Clientes Activos | Ingresos Mensuales (ARPU: $55) | Costo Fijo Mensual | Costo Variable Promedio ($5/cliente) | Beneficio Neto Mensual |
| :--- | :--- | :--- | :--- | :--- |
| **10 Clientes** | $550 USD | $10 USD | $50 USD | **$490 USD** |
| **50 Clientes** | $2,750 USD | $10 USD | $250 USD | **$2,490 USD** |
| **100 Clientes** | $5,500 USD | $10 USD | $500 USD | **$4,990 USD** |
| **500 Clientes** | $27,500 USD | $15 USD (Servidor Escala)| $2,500 USD | **$24,985 USD** |
| **1,000 Clientes**| $55,000 USD | $30 USD (Dos Nodos) | $5,000 USD | **$49,970 USD** |

---

### 5.4 Retorno de la Inversión (ROI) y Proyecciones a 3 Años

#### Escenario Conservador (Crecimiento del 5% mensual)
*   **Año 1:** Finalizar con 80 clientes activos. Ingresos anuales: **$32,000 USD**. Costos de infraestructura + desarrollo: $5,000 USD. ROI: **540%**.
*   **Año 2:** Finalizar con 250 clientes activos. Ingresos anuales: **$112,000 USD**. Beneficio neto: **$98,000 USD**.
*   **Año 3:** Finalizar con 600 clientes activos. Ingresos anuales: **$310,000 USD**. Beneficio neto: **$272,000 USD**.

#### Escenario Optimista (Crecimiento del 15% mensual mediante marketing de referidos y alianzas con procesadoras de pagos locales)
*   **Año 1:** Finalizar con 200 clientes activos. Ingresos anuales: **$78,000 USD**. Costos: $7,000 USD. ROI: **1,014%**.
*   **Año 2:** Finalizar con 800 clientes activos. Ingresos anuales: **$390,000 USD**. Beneficio neto: **$340,000 USD**.
*   **Año 3:** Finalizar con 2,500 clientes activos. Ingresos anuales: **$1,350,000 USD**. Beneficio neto: **$1,210,000 USD**.
