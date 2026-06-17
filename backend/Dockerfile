FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema requeridas para compilar psycopg2 si es necesario
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copiar todo el monorrepósito para que backend/ tenga acceso a los módulos raíz
COPY . .

ENV PYTHONPATH=.

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
