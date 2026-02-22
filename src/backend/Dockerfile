FROM python:3.10-slim

# Set environment
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV DEBIAN_FRONTEND noninteractive

WORKDIR /app

# Install system dependencies (needed for OpenCV and basic compile)
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies targeting CPU (to keep image size small for MVP)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY . /app/src/backend/

# Use the $PORT environment variable, falling back to 8000 if not set
ENV PORT=8000
EXPOSE $PORT
CMD uvicorn src.backend.app.main:app --host 0.0.0.0 --port $PORT
