#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

IMAGE_NAME="${IMAGE_NAME:-zbc0315/temp-cloud}"
VERSION="${VERSION:-$(node -p "require('./package.json').version")}"
PUSH_LATEST="${PUSH_LATEST:-true}"
DOCKER_BIN="${DOCKER_BIN:-docker}"

if ! command -v "$DOCKER_BIN" >/dev/null 2>&1; then
  echo "错误: 未找到 docker 命令: $DOCKER_BIN"
  exit 1
fi

echo "构建镜像: ${IMAGE_NAME}:${VERSION}"
"$DOCKER_BIN" build -t "${IMAGE_NAME}:${VERSION}" .

if [ "$PUSH_LATEST" = "true" ]; then
  echo "附加 latest 标签"
  "$DOCKER_BIN" tag "${IMAGE_NAME}:${VERSION}" "${IMAGE_NAME}:latest"
fi

echo "推送镜像: ${IMAGE_NAME}:${VERSION}"
"$DOCKER_BIN" push "${IMAGE_NAME}:${VERSION}"

if [ "$PUSH_LATEST" = "true" ]; then
  echo "推送镜像: ${IMAGE_NAME}:latest"
  "$DOCKER_BIN" push "${IMAGE_NAME}:latest"
fi

echo
echo "发布完成:"
echo "  ${IMAGE_NAME}:${VERSION}"
if [ "$PUSH_LATEST" = "true" ]; then
  echo "  ${IMAGE_NAME}:latest"
fi
