# Temp Cloud —— 绿联云 UGOS Pro 原生应用

把 [temp-cloud](https://github.com/zbc0315/temp-cloud) 改造为可在绿联云 NAS（UGOS Pro）上安装运行的原生应用。

用户在局域网内临时中转文件、文本和图片，内容到期自动清理。

---

## 1. 成品

| 项 | 值 |
|---|---|
| 应用 ID | `com.zbc0315.tempcloud` |
| 版本 | `0.1.0`（打包产物 `0.1.0.0002`） |
| UPK 文件 | `build_dir/pkgs/upk/amd64_nasync_com.zbc0315.tempcloud_0.1.0.0002.upk` |
| 体积 | 约 2.5 MB |
| 架构 | amd64（`support_arch: [amd64]`） |
| 产品线 | nasync |
| 打开方式 | `inner`（系统桌面内独立窗口） |
| 运行时依赖 | **无**。单个静态链接 ELF，不需要 Node、不需要 Docker、不需要解释器 |
| 实测内存占用 | 约 4.8 MB |

## 2. 为什么用 Go 重写

官方文档中 **Native APP 只接受编译型语言**（C/C++/Go 等）产出的、可在 Linux 直接运行的可执行文件，没有 Node.js / Python 等解释型后端的支持说明。

本项目原本是 Node.js（Express + multer）。直接沿用 Node 只有两条路：

- **Docker APP**：需要把约 136 MB 的基础镜像 `docker save` 成 tar 打进 UPK，且设备必须安装 Docker 套件；
- **Native APP + 自建解释器**：把 Node 运行时塞进 `rootfs`，属于文档未覆盖的方案。

改为 **Go 重写后端 + 复用原前端** 后：单个约 6 MB 的静态二进制即可，`open_type: inner` 下前端静态文件由系统 web 服务器提供，无任何运行时依赖。

前端（`index.html` / `app.js` / `styles.css`）**原样复用**，仅做了两处必要改动（见第 5 节）。

## 3. 目录结构

本工程位于 `temp-cloud` 仓库的 `ugos-app/` 子目录，与仓库根目录下的 Node.js 原版共存：

```
temp-cloud/                     # 仓库根目录（原 Node.js 项目）
├── server.js  public/  Dockerfile  ...   # 原版，保持不变
└── ugos-app/                   # ← 本工程
    ├── project.yaml            # UGOS 应用配置（原生应用，非 Docker）
    ├── build.ps1               # 一键构建：编译 → 同步前端 → 生成图标 → ugcli check
    ├── .gitignore              # 排除构建产物
    ├── tools/
    │   ├── sync_web.py         # 从 ../public 播种 src/web 并施加必要改写
    │   └── make_icon.py        # 生成 256×256 应用图标
    ├── src/                    # Go 源码（不参与打包）
    │   ├── go.mod
    │   ├── main.go             # HTTP 服务、存储、过期清理、优雅退出
    │   ├── helpers.go          # 访问日志、缓存头、编码工具
    │   └── web/                # 前端源（go:embed 内嵌进二进制），由 tools/sync_web.py 生成
    ├── rootfs_common/
    │   ├── icon.png            # 256×256 应用图标（11.5 KiB，随仓库提交）
    │   └── www/                # 前端静态文件（构建产物，已 gitignore）
    └── rootfs_amd64/
        └── bin/                # 构建产物，已 gitignore
            └── tempcloud       # linux/amd64 静态二进制（0755）
```

`src/web/`、`rootfs_common/www/`、`rootfs_amd64/bin/` 都是派生产物，但 `src/web/` 刻意**随仓库提交**——这样普通克隆无需任何额外步骤就能编译。

`ugcli pack` 会自动叠加 `rootfs_common` → `rootfs_amd64`，并生成 `init.d/`、`server.d/`、`config.json`、`.check-app`。

## 4. 后端实现要点

对照原 Node 实现逐项等价：

| 能力 | 实现 |
|---|---|
| HTTP 服务 | `net/http`，`GET /api/config`、`/healthz`、`/api/items/public`、`POST /api/items`、`POST /api/access`、`GET /api/items/{id}/content`、`GET /api/files/{id}` |
| 文件上传 | `r.ParseMultipartForm` + `http.MaxBytesReader`，上限 100 MiB（与 multer 一致） |
| 文本 / 图片 | 文本存 `items.json`；图片存盘并在读取时转 data URL |
| 密码访问 | 密码 SHA-256 后比对，命中后签发 32 位十六进制 token，有效期 24 小时 |
| 过期清理 | 启动时执行一次，之后每 60 秒扫一次；过期条目连同其上传文件一并删除 |
| 前端托管 | `go:embed web` 内嵌，`http.FileServerFS` 提供（同时兼作直连 `IP:端口` 的兜底） |
| 优雅退出 | 捕获 `SIGTERM`，`http.Server.Shutdown` 10 秒超时（对齐 UGOS 的 `TimeoutStopSec=10s`） |
| 数据库损坏 | 备份为 `items.json.broken-<ts>` 后重置为空库，与原实现行为一致 |

### 目录与环境变量

严格遵循 UGOS 约定：**安装目录运行时只读**，可写状态一律放数据目录。

| 用途 | 路径 | 来源 |
|---|---|---|
| 程序与静态资源 | `/var/packages/{appid}/` | 只读 |
| 数据（工作目录） | `$UGAPP_DATA_DIR` → `/volume1/@appdata/{appid}/` | 读写 |
| 日志 | `$UGAPP_LOG_DIR` → `/volume1/@applog/{appid}/` | 读写 |

`main.go` 的 `resolveDataDir()` 依次尝试 `UGAPP_DATA_DIR` → `TEMPCLOUD_DATA_DIR` → `./data`，因此同一份二进制既能作为 UGOS 应用运行，也能本地直跑。

## 5. 前端的两处改动

原前端使用绝对路径（`/app.js`、`/api/...`），只有在站点根目录下才可用。UGOS 应用由系统网关提供，挂载点不保证是根路径。

1. **改为挂载点无关**：资源引用改为相对路径；`app.js` 里新增 `APP_BASE`，从 `app.js` 自身 URL 推导所在目录，所有 API 调用经 `apiUrl()` 解析。这样在站点根、或任意子路径下都能工作。
2. **Google Fonts 改为非阻塞**：NAS 常处于无外网的内网环境，原本渲染阻塞的远程样式表会拖慢首屏。改为 `media="print" onload="this.media='all'"` 异步加载。

这两处改写由 `tools/sync_web.py` 自动化：它先从 `../public`（仓库根目录的原版前端）播种 `src/web`，再施加上述改写，最后校验没有残留的绝对路径。上游前端更新后执行：

```powershell
pwsh -File ugos-app/build.ps1 -SyncWeb
```

## 6. 构建与打包

### 前置

| 工具 | 版本 | 说明 |
|---|---|---|
| Go | **1.26.x** | 见第 7 节，**不要用 1.27+** |
| ugcli | 1.1.0.25 | Windows 版可做 `create`/`check`；**`pack` 必须在 Linux 上执行** |
| Python + Pillow | — | 生成图标、同步前端 |
| WSL / Linux | Debian 12 或同等 | 官方要求 UPK 必须在 Linux 上打包，否则 Unix 权限位不保 |

### 构建

```powershell
pwsh -File ugos-app/build.ps1
```

脚本依次执行：`gofmt` + `go vet` → 编译 linux/amd64 → 同步前端到 `rootfs_common/www` → 生成图标 → `ugcli check`。

工具链按以下顺序解析：`-GoExe` / `-UgcliExe` 参数 → 环境变量 `TEMPCLOUD_GO` / `UGCLI` → `PATH`：

```powershell
$env:TEMPCLOUD_GO = "C:\path\to\go1.26\go\bin\go.exe"
$env:UGCLI        = "C:\path\to\ugcli.exe"
pwsh -File ugos-app/build.ps1
```

若 Go 版本不是 1.26.x，脚本会打印醒目告警（因为 1.27+ 的产物在 UGOS 上起不来）。

### 打包

```bash
# 必须在 Linux 上打包。WSL 的 /mnt/c 是 drvfs，Unix 权限位不可靠，
# 所以要先复制到 Linux 原生文件系统再修正权限位：
cp -r /mnt/c/Users/zhang/Documents/Projects/tempcloud/temp-cloud/ugos-app ~/ugbuild/
cd ~/ugbuild/ugos-app
find . -type d -exec chmod 0755 {} +
find . -type f -exec chmod 0644 {} +
chmod 0755 rootfs_amd64/bin/tempcloud
ugcli pack --arch amd64 --build 2
```

产物：`build_dir/pkgs/upk/amd64_nasync_com.zbc0315.tempcloud_<x.y.z.b>.upk`

> 同一 `x.y.z` 下构建号必须递增，不许重复。

## 7. ⚠️ 关键坑：UGOS 的 GODEBUG 与新版本 Go 冲突

UGOS Pro 在 `/etc/systemd/system.conf` 里设置了：

```
DefaultEnvironment="GODEBUG=tlskyber=0"
```

（`/etc/profile.d/go.sh` 里也有一份同样的 `export`。）**所有 systemd 服务都会继承它。**

`tlskyber` 是 crypto/tls 中控制 X25519Kyber768 后量子密钥交换的开关，**在 Go 1.27 中被移除**（[golang/go#75316](https://github.com/golang/go/issues/75316)）。Go 1.24 起，把**已移除**的 GODEBUG 设成旧值会让运行时在 `main()` 之前直接退出：

```
fatal error: removed GODEBUG "tlskyber" set to old value "0" in environment
```

表现为服务 `code=exited, status=2`、端口不监听，且日志里只有这段 fatal。

**解决方案：用 Go 1.26 编译。** 1.26 是最后一个仍认识 `tlskyber` 的版本，编译出的二进制在 UGOS 上开箱即跑，无需任何系统改动。

> 排查过程中确认过的其他路径（都已否决）：
> - 单元里的 `EnvironmentFile=-.../init.d/{appid}.env` **无法**覆盖 manager 的 `DefaultEnvironment`（实测无效）；
> - systemd drop-in 的 `Environment=` **可以**覆盖（实测有效），但那是系统级改动，**无法随 UPK 分发**。

## 8. 安装与卸载

### 安装

设备需先完成开发者授权（`ugdev.sig` → 管理员个人文件夹 → App Center 授权）。

**图形界面**：App Center → 手动安装 → 选择 `amd64_nasync_*.upk`。

**命令行**：

```bash
sudo /usr/sbin/uginstall -upk /path/to/amd64_nasync_com.zbc0315.tempcloud_0.1.0.0002.upk
```

### 卸载

```bash
sudo /usr/sbin/ugprerm -id com.zbc0315.tempcloud -workflow 3
```

或 App Center 中卸载。

> 卸载会删除 `/volume1/@appdata/com.zbc0315.tempcloud/`，其中的中转内容一并丢失——这对临时中转站而言是预期行为。

## 9. 验证结果（DXP4800，UGOS Pro 1.19.1.0126）

安装后无任何系统改动，逐项实测：

| 验收项 | 结果 |
|---|---|
| `uginstall` 安装 | `install success` / `result=ok` |
| systemd 服务 | `active (running)`，开机自启（`enabled`） |
| 端口 21039 | LISTEN `*:21039` |
| 服务环境 `GODEBUG` | **无**（证明不依赖任何系统 hack） |
| `/healthz` | 200 `{"ok":true,"service":"temp-cloud"}` |
| Web UI / app.js / styles.css | 全 200 |
| 跨机（Windows → NAS）上传 1 MiB | 成功 |
| 下载回环 SHA-256 | **完全一致** |
| 无密码访问受保护内容 | 403 |
| 正确密码换 token 后读取 | 200 + 正确内容 |
| 公开列表是否泄露受保护内容 | 否 |
| 数据落盘 | `/volume1/@appdata/.../items.json` + `uploads/` |
| **服务重启后数据保留** | 是 |

## 10. 已知事项

- **应用注册与固定**：UPK 内的 `config.json` 已声明 `proxy: [{location: api, target: 21039}]`，网关会把 `/api/` 前缀转发到后端。若在系统桌面点开图标后发现前端请求未走网关，可直接用 `http://<NAS-IP>:21039/` 访问——后端内嵌了完整 UI，两种方式都可用。
- **端口 21039** 为自选值（官方示例使用 21010 / 29090）。如与设备上其他服务冲突，改 `project.yaml` 的 `port` 与 `start_cmd` 后重新打包。
- **`depend_fw_version`** 填的是官方示例值 `1.13.0.0000`。文档建议向绿联确认有效固件版本号后再调整。
- **开源合规**：`project.yaml` 已配置 `source_code_link` 与 `license_agreement_link`（原项目为 MIT）。Go 重写部分已随本工程提交到 `https://github.com/zbc0315/temp-cloud`，与 `source_code_link` 指向一致。
