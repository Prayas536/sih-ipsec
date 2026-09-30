FROM node:22-alpine AS frontend

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

FROM python:3.12-slim AS backend

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir --timeout 120 --retries 5 -r requirements.txt
COPY server ./server
COPY backend ./backend
COPY feature_extractor/extractor.py ./feature_extractor/extractor.py
COPY feature_extractor/ml/models ./feature_extractor/ml/models
RUN mkdir -p /app/data
EXPOSE 8765 8770
CMD ["python", "server/api_server.py"]