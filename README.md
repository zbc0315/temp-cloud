# Temp Cloud

[![Publish Docker Image](https://github.com/zbc0315/temp-cloud/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/zbc0315/temp-cloud/actions/workflows/docker-publish.yml)
[![Create GitHub Release](https://github.com/zbc0315/temp-cloud/actions/workflows/release.yml/badge.svg)](https://github.com/zbc0315/temp-cloud/actions/workflows/release.yml)
[![Docker Image Version](https://img.shields.io/docker/v/zbc0315/temp-cloud?label=docker%20hub&sort=semver)](https://hub.docker.com/r/zbc0315/temp-cloud)
[![Docker Pulls](https://img.shields.io/docker/pulls/zbc0315/temp-cloud)](https://hub.docker.com/r/zbc0315/temp-cloud)

中文 | [English](#english)

一个面向局域网场景的临时中转站，用来在不同设备之间快速传递文件、文本和图片。

适合这些使用场景：

- 电脑 1 上传一个文件，电脑 2 立即下载
- 在手机上粘贴验证码、命令、链接，在电脑上直接复制
- 把截图临时贴到网页里，再在另一台设备下载或复制
- 使用无密码模式进行快速共享
- 使用临时密码给特定内容加一道简单访问门槛

## 功能特性

- 文件、文本、图片三种内容类型
- 支持拖拽、上传、文本粘贴、图片粘贴
- 无密码共享和密码访问两种模式
- 自定义保留时间，默认 1 小时，最长 24 小时
- 过期自动清理
- 下载文件、复制文本、复制图片
- 简洁界面，支持中英文和亮色/暗色主题
- 适合本地服务器、NAS、家庭实验室和办公室局域网

## 使用方法

### 1. 上传或粘贴内容

打开网页后，在“上传与粘贴”页签中：

- 选择内容类型：文件、文本或图片
- 上传文件，或者直接粘贴文本/图片
- 可选填写标题
- 可选填写临时密码
- 选择保存时间
- 点击“保存”

### 2. 在另一台设备获取内容

打开同一个网页后，在“下载与复制”页签中：

- 无密码内容会直接显示
- 如果内容设置了密码，输入对应密码后会显示该密码下的内容
- 文件可直接下载
- 文本可一键复制
- 图片可下载，也可在支持的浏览器中直接复制

## 安装方法

### 方式一：直接使用 Docker Hub 镜像

镜像地址：

```text
docker.io/zbc0315/temp-cloud
```

直接运行：

```bash
docker run -d \
  --name temp-cloud \
  -p 2012:3000 \
  -v /path/to/temp-cloud-data:/app/data \
  --restart unless-stopped \
  zbc0315/temp-cloud:latest
```

Docker Compose：

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

这是最适合 NAS 用户的安装方式，不需要本地构建镜像。

### 方式二：本地部署源码

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

### 方式三：使用项目内置 Docker 部署脚本

```bash
chmod +x deploy.sh
./deploy.sh
```

详细部署说明见 [DEPLOYMENT.md](/home/zbc/Projects/temp-cloud/DEPLOYMENT.md)。

## 数据与限制

- 数据文件保存在 `data/items.json`
- 上传文件保存在 `data/uploads/`
- 过期内容会自动删除
- 单文件上传限制为 100MB

---

## English

Temp Cloud is a temporary LAN transfer hub for quickly moving files, text, and images between devices on the same network.

Typical use cases:

- Upload a file on computer A and download it from computer B
- Paste a code, command, or link on one device and copy it on another
- Paste a screenshot into the page and retrieve it from another device
- Share content instantly in public mode
- Protect temporary content with a simple password

## Features

- Three content types: file, text, and image
- Supports drag and drop, upload, text paste, and image paste
- Public mode and password-protected mode
- Custom retention time, default 1 hour, maximum 24 hours
- Automatic cleanup after expiration
- File download, text copy, and image copy
- Clean interface with bilingual UI and light/dark themes
- Suitable for local servers, NAS devices, homelabs, and office LANs

## How To Use

### 1. Upload or paste content

Open the web page and go to the `Upload & Paste` tab:

- Choose the content type: file, text, or image
- Upload a file, or paste text/image directly
- Optionally add a title
- Optionally add a temporary password
- Select the retention time
- Click `Save`

### 2. Retrieve content on another device

Open the same web page on another device and go to the `Download & Copy` tab:

- Public content appears automatically
- For protected content, enter the password to reveal matching items
- Files can be downloaded
- Text can be copied with one click
- Images can be downloaded and, in supported browsers, copied directly

## Installation

### Option 1: Use the Docker Hub image

Image:

```text
docker.io/zbc0315/temp-cloud
```

Run directly:

```bash
docker run -d \
  --name temp-cloud \
  -p 2012:3000 \
  -v /path/to/temp-cloud-data:/app/data \
  --restart unless-stopped \
  zbc0315/temp-cloud:latest
```

Docker Compose:

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

This is the best option for NAS users because it does not require local image builds.

### Option 2: Run from source

```bash
npm install
npm start
```

Default listen address:

```text
http://0.0.0.0:3000
```

Other devices on the same LAN can access it through the server IP, for example:

```text
http://192.168.1.10:3000
```

### Option 3: Use the built-in Docker deployment script

```bash
chmod +x deploy.sh
./deploy.sh
```

See [DEPLOYMENT.md](/home/zbc/Projects/temp-cloud/DEPLOYMENT.md) for full deployment details.

## Data And Limits

- Metadata is stored in `data/items.json`
- Uploaded files are stored in `data/uploads/`
- Expired content is removed automatically
- Maximum single file size is 100MB
