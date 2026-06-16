# 06. Sistemas de Pedidos, Pagos y Seguridad

---

## FASE 11 – SISTEMA DE PEDIDOS (MÁQUINA DE ESTADOS Y REGLAS)

La gestión de pedidos transaccionales conversacionales se rige por una máquina de estados estricta a nivel de base de datos relacional para evitar discrepancias e inconsistencias transaccionales.

### 11.1 Flujo y Transición de Estados de la Orden

```
  +---------+      +-------------------+      +-------------+
  |  CART   |----->|  PENDING_PAYMENT  |----->|  PREPARING  |
  +---------+      +-------------------+      +------+------+
                           |                         |
                           v                         v
                   +---------------+          +------+------+
                   |   CANCELLED   |          |   SHIPPED   |
                   +---------------+          +------+------+
                                                     |
                                                     v
                                              +------+------+
                                              |  DELIVERED  |
                                              +-------------+
```

1.  **CART (Carrito Conversacional):** El cliente está interactuando con la IA agregando o quitando ítems. Los productos se registran como elementos temporales asociados a su `customer_id`.
2.  **PENDING_PAYMENT (Pendiente de Pago):** La IA confirma el pedido (los ítems se reservan en el stock) y envía el resumen con el link de pago o instrucciones.
3.  **PREPARING (En Preparación):** El pago ha sido confirmado o el comercio acepta procesar el pedido (para modalidad Contra Entrega). La orden aparece con una notificación audible en la consola web y en la app móvil del operador.
4.  **SHIPPED (En Camino / Despachado):** La orden se entrega al repartidor asignado, activando el tracking si aplica.
5.  **DELIVERED (Entregado):** El repartidor o cliente confirma la entrega física del paquete. Se libera el registro.
6.  **CANCELLED (Cancelado):** La orden se anula (por el operador o por expiración de pago) y los productos reservados retornan automáticamente al inventario activo.

---

### 11.2 Reglas de Negocio Críticas
*   **Bloqueo de Stock Temporal (Reserva):** Al pasar de `CART` a `PENDING_PAYMENT`, el sistema descuenta de inmediato la cantidad comprada de la columna `stock` de la tabla `products`.
*   **Liberación de Stock por Inactividad (Ttl de Pago):** Si un pedido permanece en estado `PENDING_PAYMENT` por más de **30 minutos** sin recibir el webhook de pago exitoso de la pasarela, una tarea programada del backend (cron job) cancela el pedido de forma automática y restaura los ítems al stock disponible del comercio.
*   **Validación Horaria:** La IA rechaza iniciar el flujo de pedidos si la hora actual del servidor se encuentra fuera del rango de atención configurado por el comercio en la tabla `tenants`.

---

## FASE 12 – SISTEMA DE PAGOS (INTEGRACIÓN Y SEGURIDAD)

FlowCommerce soporta un flujo de cobro híbrido adaptable a las necesidades financieras locales de los tenants.

### 12.1 Flujo de Stripe Webhook Integration

```
  +--------------+            +-------------------+            +---------------+
  | Cliente Final|----------->|  Link de Pago     |----------->|  Stripe API   |
  | (WhatsApp)   | (Clic Link)| (Generado Stripe) |            |               |
  +--------------+            +-------------------+            +-------+-------+
                                                                       |
                                                                       v
  +--------------+            +-------------------+            +-------+-------+
  | Actualiza a  |<-----------| Webhook FastAPI   |<-----------| Notificación  |
  | "PREPARING"  | (HTTP POST)| (Verifica Firma)  |            |  (Cobro OK)   |
  +--------------+            +-------------------+            +---------------+
```

1.  **Generación de Link:** Al confirmar la orden, el backend llama a la API de Stripe para crear un `PaymentIntent` y genera un link de pago dinámico. La IA le envía al cliente el link por WhatsApp.
2.  **Procesamiento:** El cliente hace clic en el link seguro de Stripe y realiza el pago.
3.  **Confirmación:** Stripe envía una petición `POST` al webhook de FastAPI de FlowCommerce con el evento `checkout.session.completed`.
4.  **Validación y Actualización:** El webhook del backend valida la firma de Stripe (`stripe-signature`) para evitar ataques de suplantación, busca el ID de pedido asociado al metadato del pago y actualiza el estado de la orden a `PREPARING`, notificando instantáneamente al comerciante.

### 12.2 Alternativas de Bajo Costo: Códigos QR Locales y Contra Entrega
Para evitar las comisiones de procesamiento de tarjetas de crédito tradicionales, el sistema permite configurar:
*   **Código QR Estático/Dinámico:** La IA envía una imagen del código QR de la billetera local (ej. Pix en Brasil, Yappy en Panamá, o transferencias directas locales) junto con el monto exacto del pedido, solicitando que el cliente envíe una captura del comprobante por WhatsApp.
*   **Pago Contra Entrega (Cash on Delivery):** El asistente de IA confirma la dirección de entrega e indica que el pago se realizará en efectivo o terminal POS físico al recibir el pedido.

### 12.3 Seguridad y Cumplimiento PCI
Para cumplir con las normas **PCI DSS** sin costos exorbitantes de certificación:
*   **Cero Almacenamiento de Tarjetas:** FlowCommerce **nunca** procesa, transmite ni almacena números de tarjetas de crédito o códigos CVV en sus servidores. Toda la captura de datos de tarjetas se delega a los formularios embebidos seguros (Stripe Elements) que viajan directamente del cliente a Stripe.

---

## FASE 13 – SEGURIDAD Y PROTECCIÓN DE DATOS

### 13.1 Autenticación (JWT & Refresh Tokens)
El acceso a las APIs administrativas (Consola Web y App Móvil) está protegido por tokens criptográficos seguros:
*   **Access Token:** Token JWT firmado con algoritmo simétrico HS256, con tiempo de expiración corto (15 minutos) que viaja en la cabecera `Authorization: Bearer <token>`.
*   **Refresh Token:** Almacenado en una cookie segura (`HttpOnly`, `Secure`, `SameSite=Strict`), utilizado exclusivamente para solicitar un nuevo Access Token cuando expire, mitigando el riesgo de robo de sesión por XSS (Cross-Site Scripting).

### 13.2 Control de Acceso Basado en Roles (RBAC)
Cada petición HTTP de la consola web o app móvil se valida con un middleware de FastAPI que comprueba el rol de la sesión del usuario:
*   `ADMIN` (Dueño del Comercio): Acceso total a configuraciones de API de Meta, prompts de IA, finanzas y borrado de catálogo.
*   `OPERATOR` (Personal de Cocina/Tienda): Permiso exclusivo para visualizar el dashboard de pedidos en tiempo real, cambiar el estado del pedido y actualizar stock.
*   `DELIVERY_AGENT` (Repartidor): Acceso restringido a la aplicación móvil para ver sus rutas asignadas, ver direcciones y registrar confirmaciones de entregas.

### 13.3 Encriptación de Secretos a Nivel de Aplicación (Encryption-at-Rest)
Las credenciales sensibles de los tenants, como los tokens de acceso de Meta API (`whatsapp_access_token`) y claves privadas de Stripe, no se almacenan en texto plano en la base de datos de PostgreSQL.
*   **Implementación:** El backend FastAPI encripta estos campos antes de guardarlos en la base de datos utilizando el módulo `cryptography.fernet` (encriptación simétrica AES-256 en modo CBC).
*   **Gestión de Claves:** La clave maestra de encriptación (`ENCRYPTION_KEY`) se inyecta al contenedor en tiempo de ejecución mediante variables de entorno del servidor seguro, manteniéndose fuera del código fuente del repositorio.
