#!/usr/bin/env bash

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "错误: 未检测到 docker，请先安装 Docker。"
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "错误: 未检测到 docker compose，请安装 Docker Compose 插件。"
  exit 1
fi

mkdir -p data/uploads
if [ ! -f data/items.json ]; then
  printf '{\n  "items": []\n}\n' > data/items.json
fi

echo "开始构建并启动 Temp Cloud 容器..."
"${COMPOSE_CMD[@]}" up -d --build

echo
echo "部署完成。"
echo "本机访问: http://127.0.0.1:${PORT:-3000}"

HOST_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
if [ -n "${HOST_IP:-}" ]; then
  echo "局域网访问: http://${HOST_IP}:${PORT:-3000}"
fi

echo
echo "查看状态:"
echo "  ${COMPOSE_CMD[*]} ps"
echo "查看日志:"
echo "  ${COMPOSE_CMD[*]} logs -f"
