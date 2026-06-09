# ==============================================================================
# Dockerfile — Django + Gunicorn Backend
# EV Telematics Platform | Production Build
# ==============================================================================
FROM python:3.11-slim AS base

# Prevent Python from writing .pyc files and enable unbuffered stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system dependencies required by psycopg2 and TimescaleDB client
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app

# Install Python dependencies (layer cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn==22.0.0

# Copy application source
COPY . .

# Create directories that Django expects
RUN mkdir -p /app/logs /app/staticfiles \
    && chown -R appuser:appuser /app

# Collect static files at build time
RUN python manage.py collectstatic --noinput 2>/dev/null || true

# Switch to non-root user
USER appuser

# Expose internal port
EXPOSE 8000

# Health check — hits the login endpoint which is unauthenticated
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/admin/login/ || exit 1

# Gunicorn production server
# - 3 workers (2*CPU + 1 for t3.micro's 2 vCPUs, capped for RAM)
# - 120s timeout for long DB queries on TimescaleDB
# - Bind to all interfaces inside the container
CMD ["gunicorn", \
     "DjangoProject.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info"]
