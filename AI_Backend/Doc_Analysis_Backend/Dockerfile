FROM python:3.11-slim

WORKDIR /app

# System deps for PyMuPDF (PDF rendering)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create output directory for intermediate files
RUN mkdir -p /app/output

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import httpx; r = httpx.get('http://localhost:8001/api/v1/health'); r.raise_for_status()" || exit 1

# Run server
CMD ["uvicorn", "doc_main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
