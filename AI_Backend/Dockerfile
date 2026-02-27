FROM python:3.11-slim

WORKDIR /app

# System deps for PyMuPDF, faster-whisper, and healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY AI_Backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY AI_Backend/ .

# ICD CSV files are mounted via docker-compose volumes
# Default paths point to /app/data/ (set via environment vars)
RUN mkdir -p /app/data

ENV ICD9_CSV_PATH=/app/data/unique_icd9_codes.csv
ENV ICD10_CSV_PATH=/app/data/unique_icd10_codes.csv
ENV HOST=0.0.0.0
ENV PORT=8000

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
