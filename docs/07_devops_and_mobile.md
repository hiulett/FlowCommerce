# 07. Estrategia DevOps y Aplicación Móvil Flutter

---

## FASE 14 – DEVOPS (DOCKER, CI/CD Y MONITOREO)

Para facilitar el despliegue rápido y consistente en cualquier VPS de bajo costo o nube pública, utilizaremos un pipeline completamente automatizado y basado en contenedores.

### 14.1 Dockerización Multi-Stage (Bajo Peso de Imagen)

Cada componente del proyecto se compila mediante compilaciones multi-stage en Docker, lo que garantiza que las imágenes de producción no contengan dependencias de desarrollo y pesen menos de **100 MB**, acelerando el tiempo de despliegue.

#### Dockerfile del Backend (FastAPI - Producción)
```dockerfile
# Stage 1: Build dependencies
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Final runtime
FROM python:3.11-slim as runner
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

### 14.2 Pipeline CI/CD (GitHub Actions)

El repositorio contará con un flujo automatizado de CI/CD configurado en `.github/workflows/deploy.yml`:

```
  +--------------+       +---------------+       +-----------------+
  |  Git Push a  |------>|  Ejecuta Lints|------>|  Construye e    |
  |  rama main   |       |   y Tests     |       | Empuja Docker   |
  +--------------+       +---------------+       +--------+--------+
                                                          |
                                                          v
  +--------------+       +---------------+       +--------+--------+
  | Notificación |<------|  Despliega en |<------|  Descarga nueva |
  | Éxito Slack  |       | VPS (Coolify) |       |  imagen Docker  |
  +--------------+       +---------------+       +-----------------+
```

1.  **CI (Integración Continua):** Al hacer push a la rama `main`, GitHub Actions levanta un entorno virtual, corre linters de código (Ruff para Python, ESLint para React) y ejecuta las pruebas unitarias.
2.  **CD (Despliegue Continuo):** Si los tests pasan con éxito, se construye la imagen Docker y se empuja a GitHub Container Registry (GHCR). Posteriormente, se envía un webhook a Coolify o al script local de Docker en el VPS para descargar la última imagen y realizar el despliegue con cero tiempo de inactividad (Zero-Downtime Deployment).

---

### 14.3 Backups y Disaster Recovery
*   **Backups Diarios:** Un cron job local del VPS realiza un backup de PostgreSQL (mediante `pg_dump`), cifra el archivo utilizando una clave pública GPG y lo sube de forma automática a un bucket compatible con S3 (ej. Backblaze B2 o Cloudflare R2, con costos de almacenamiento cero por debajo de los 10 GB).
*   **Políticas de Resiliencia:**
    *   **RPO (Recovery Point Objective):** Máximo 24 horas de pérdida de datos.
    *   **RTO (Recovery Time Objective):** Menos de 30 minutos para reconstruir y levantar el servidor completo en un VPS alternativo en caso de caída catastrófica.

---

## FASE 15 – APLICACIÓN MÓVIL FLUTTER (ARQUITECTURA Y OFFLINE-FIRST)

La aplicación móvil es multi-rol y se despliega con una única base de código Flutter configurada bajo **Clean Architecture**.

```
  +-----------------------------------------------------------+
  |  PRESENTATION LAYER (UI, Widgets, Riverpod Controllers)   |
  +-----------------------------+-----------------------------+
                                |
                                v
  +-----------------------------------------------------------+
  |  DOMAIN LAYER (Use Cases, Entities, Repositories Interfaces|
  +-----------------------------+-----------------------------+
                                |
                                v
  +-----------------------------------------------------------+
  |  DATA LAYER (Repositories Impl, Data Sources [Isar, API]) |
  +-----------------------------------------------------------+
```

### 15.1 Capas de la Arquitectura
1.  **Presentation Layer:** Widgets de UI limpios de lógica, controlados por controladores de estado reactivos provistos por **Riverpod**.
2.  **Domain Layer:** Contiene la lógica de negocio pura (Casos de Uso como `PlaceOrder`, `AssignDeliveryAgent`) y definiciones de interfaces de repositorios. Es 100% independiente del framework.
3.  **Data Layer:** Implementación de repositorios y fuentes de datos (Data Sources), encargada de la comunicación HTTP con la API de FastAPI y la persistencia local en base de datos.

---

### 15.2 Soporte Offline-First con Isar DB

Para comercios y repartidores que sufren caídas de red móvil constantes mientras están en movimiento, la aplicación debe responder de forma instantánea sin requerir conexión continua.

| Característica | SQLite | Hive | Isar Database (Elegida) |
| :--- | :--- | :--- | :--- |
| **Arquitectura** | Relacional tradicional | Clave-Valor básica | **NoSQL Relacional / Orientado a Objetos** |
| **Velocidad Lectura** | Media | Rápida | **Ultrarrápida (Memoria mapeada)** |
| **Soporte de Índices** | Sí | No | **Sí (Multi-columna)** |
| **Consultas Asíncronas**| Complejas | No soportadas | **Nativas integradas (Streams)** |

*   **Justificación de Isar:** Isar es la evolución de Hive. Ofrece un rendimiento extremadamente superior a SQLite y permite realizar consultas tipadas nativas y streams asíncronos. La app móvil guarda todos los pedidos y catálogos en Isar localmente en el dispositivo.
*   **Sincronización:** Cuando la app recupera conexión, un Worker en segundo plano (Workmanager) lee los cambios pendientes guardados en Isar localmente y los envía en lote (batch) al backend FastAPI para sincronizar el estado global.

---

### 15.3 Tiempo Real y Notificaciones

Para garantizar que la cocina o el operador reciba los pedidos de WhatsApp de inmediato:

1.  **WebSockets:** Al estar la aplicación en primer plano, se establece una conexión WebSocket persistente contra el servidor FastAPI. Al crearse una orden en el backend, se emite un payload JSON por la conexión activa que reproduce un sonido de alerta e inserta la tarjeta del pedido en la pantalla del operador con cero delay.
2.  **Push Notifications (FCM):** Si la aplicación está cerrada o en segundo plano, el backend FastAPI envía una notificación push de alta prioridad utilizando **Firebase Cloud Messaging (FCM)** para despertar el servicio móvil y alertar al usuario comercial.
