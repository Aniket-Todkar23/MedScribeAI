FROM python:3.11-slim

WORKDIR /app

# curl needed for the docker-compose healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Persistent upload directory
RUN mkdir -p /app/uploads/documents

ENV HOST=0.0.0.0
ENV PORT=3001
ENV PYTHONUNBUFFERED=1

EXPOSE 3001

# Run migrations then start the server
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 3001"]
