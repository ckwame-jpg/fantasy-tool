FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependencies first (better layer caching)
COPY requirements.txt ./
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy backend source
COPY . .

EXPOSE 8004

# Dev: enable autoreload
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8004", "--reload"]
