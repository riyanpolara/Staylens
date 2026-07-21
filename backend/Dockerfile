# StayLens Hybrid Search API
# Build context is the repo root so `backend/` is copied intact:
#   docker build -f backend/Dockerfile -t staylens-search .
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    LOG_DIR=/tmp/staylens-logs

WORKDIR /app

# deps first so layer caching survives source edits
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app

EXPOSE 8000

# $PORT is injected by Render/Railway/Fly; falls back to 8000 locally.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
