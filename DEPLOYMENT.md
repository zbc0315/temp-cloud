# Docker 部署文档

本文档说明如何将 Temp Cloud 部署到本地局域网服务器中。

## 1. 环境要求

- Linux 服务器一台
- 已安装 Docker
- 已安装 Docker Compose 插件
- 服务器开放访问端口，默认 `3000`

检查命令：

```bash
docker --version
docker compose version
```

## 2. 部署文件

项目已包含以下部署文件：

- [Dockerfile](/home/zbc/Projects/temp-cloud/Dockerfile)
- [docker-compose.yml](/home/zbc/Projects/temp-cloud/docker-compose.yml)
- [deploy.sh](/home/zbc/Projects/temp-cloud/deploy.sh)

## 3. 一键部署

在项目目录执行：

```bash
cd /home/zbc/Projects/temp-cloud
chmod +x deploy.sh
./deploy.sh
```

脚本会自动完成：

- 初始化 `data/` 持久化目录
- 初始化 `data/items.json`
- 构建 Docker 镜像
- 启动容器

部署完成后，访问地址通常为：

```text
http://服务器IP:3000
```

例如：

```text
http://192.168.1.10:3000
```

## 4. 持久化说明

容器内的 `/app/data` 挂载到宿主机的 `./data` 目录。

这意味着以下数据在容器重建后仍然保留：

- `data/items.json`
- `data/uploads/`

## 5. 常用运维命令

启动或更新：

```bash
docker compose up -d --build
```

查看状态：

```bash
docker compose ps
```

查看日志：

```bash
docker compose logs -f
```

停止服务：

```bash
docker compose down
```

重启服务：

```bash
docker compose restart
```

## 6. 修改端口

默认映射为宿主机 `3000 -> 容器 3000`。

如果需要改成例如 `8080`，可在启动前执行：

```bash
PORT=8080 ./deploy.sh
```

或者直接运行：

```bash
PORT=8080 docker compose up -d --build
```

访问地址会变为：

```text
http://服务器IP:8080
```

## 7. 开机自启

`docker-compose.yml` 已设置：

```yaml
restart: unless-stopped
```

因此在 Docker 服务随系统启动后，容器会自动恢复运行。

如果服务器尚未启用 Docker 开机自启，可执行：

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

## 8. 健康检查

应用暴露了健康检查接口：

```text
GET /healthz
```

容器会定期检查：

```text
http://127.0.0.1:3000/healthz
```

## 9. 升级部署

代码更新后，在项目目录重新执行：

```bash
./deploy.sh
```

脚本会重新构建镜像并以后台方式更新容器，已有数据仍会保留。

## 10. 防火墙说明

如果局域网其他设备无法访问，通常是宿主机防火墙未开放端口。需要确保开放部署端口，例如 `3000`。

例如在 Ubuntu 使用 `ufw`：

```bash
sudo ufw allow 3000/tcp
```
