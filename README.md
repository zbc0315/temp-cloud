# Temp Cloud

[![Publish Docker Image](https://github.com/zbc0315/temp-cloud/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/zbc0315/temp-cloud/actions/workflows/docker-publish.yml)
[![Create GitHub Release](https://github.com/zbc0315/temp-cloud/actions/workflows/release.yml/badge.svg)](https://github.com/zbc0315/temp-cloud/actions/workflows/release.yml)
[![Docker Image Version](https://img.shields.io/docker/v/zbc0315/temp-cloud?label=docker%20hub&sort=semver)](https://hub.docker.com/r/zbc0315/temp-cloud)
[![Docker Pulls](https://img.shields.io/docker/pulls/zbc0315/temp-cloud)](https://hub.docker.com/r/zbc0315/temp-cloud)

一个用于本地局域网的临时中转 Web 应用，支持：

- 上传文件
- 粘贴文本
- 粘贴图片
- 无密码共享
- 使用临时密码访问
- 自定义保存时长，默认 1 小时，最长 24 小时
- 过期自动清理

## 本地启动

```bash
npm install
npm start
```

默认监听：

```text
http://0.0.0.0:3000
```

局域网内其他设备可通过服务器 IP 访问，例如：

```text
http://192.168.1.10:3000
```

## 说明

- 数据保存在 `data/items.json`
- 上传文件保存在 `data/uploads/`
- 过期内容会在启动时和运行过程中自动删除
- 单文件上传限制为 100MB

## Docker 部署

已提供完整 Docker 部署方案：

```bash
chmod +x deploy.sh
./deploy.sh
```

详细说明见 [DEPLOYMENT.md](/home/zbc/Projects/temp-cloud/DEPLOYMENT.md)。

## Docker Hub

镜像地址：

```text
docker.io/zbc0315/temp-cloud
```

可用标签：

```text
latest
1.0.0
```

### 直接运行

```bash
docker run -d \
  --name temp-cloud \
  -p 2012:3000 \
  -v /path/to/temp-cloud-data:/app/data \
  --restart unless-stopped \
  zbc0315/temp-cloud:latest
```

### Docker Compose

```yaml
services:
  temp-cloud:
    image: zbc0315/temp-cloud:latest
    container_name: temp-cloud
    restart: unless-stopped
    ports:
      - "2012:3000"
    environment:
      TZ: Asia/Shanghai
      PORT: 3000
    volumes:
      - ./data:/app/data
```

适合 NAS 用户直接拉取运行，无需本地构建镜像。
