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
CMD ["python", "main.py"]
