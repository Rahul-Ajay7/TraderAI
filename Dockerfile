FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*
COPY requirements-railway.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# kronos_src is gitignored — fetch at build time so boot doesn't need network git
RUN test -d model/kronos_src/model || git clone --depth 1 \
    https://github.com/shiyu-coder/Kronos.git model/kronos_src
# HF Spaces: container runs as non-root uid 1000 and serves on app_port 7860.
# Writable dirs needed for SQLite fallback + HF model cache.
RUN mkdir -p /app/db /app/.cache && chmod -R 777 /app/db /app/.cache
ENV PORT=7860 HF_HOME=/app/.cache
EXPOSE 7860
CMD ["python", "main.py"]
