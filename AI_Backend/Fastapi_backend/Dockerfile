# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies required for audio processing (FFmpeg) and git
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt .

# Ensure setuptools (with pkg_resources) is present and upgrade pip
RUN pip install --no-cache-dir --upgrade pip "setuptools<75" wheel

# Install openai-whisper separately: its setup.py needs pkg_resources,
# which pip's build-isolation env may lack. --no-build-isolation uses
# the setuptools we just installed above.
RUN pip install --no-cache-dir --no-build-isolation openai-whisper==20240930

# Install remaining packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Define environment variables (these can be overridden at runtime)
ENV HOST=0.0.0.0
ENV PORT=8000
ENV MODAL_MEDGEMMA_URL=""
ENV HF_TOKEN=""

# Run the FastAPI application using Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]