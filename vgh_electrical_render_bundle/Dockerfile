# Render.com Dockerfile for Flask app
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1     PYTHONUNBUFFERED=1     PIP_NO_CACHE_DIR=1

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends     build-essential     libpq-dev   && rm -rf /var/lib/apt/lists/*

# App directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt ./
RUN pip install -r requirements.txt && pip install gunicorn==21.2.0

# Copy source
COPY . .

# Create instance dir for SQLite
RUN mkdir -p instance

# Expose port for Render
EXPOSE 10000

# Gunicorn config
CMD ["gunicorn", "-c", "gunicorn.conf.py", "app.app:app"]
