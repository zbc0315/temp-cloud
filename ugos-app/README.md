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
| 文件上传 | **流式解析**（`r.MultipartReader` + `io.Copy`）+ `http.MaxBytesReader`，上限 100 MiB（与 multer 一致）。刻意不用 `ParseMultipartForm`，理由见 7.2 |
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
2. **移除 Google Fonts 外部依赖**：原前端从 Google 拉取 Manrope 字体（`styles.css` 里 `font-family: "Manrope", sans-serif`）。这对一个主打"数据留在内网"的工具是矛盾的——每次打开页面都会向第三方发起 DNS / TLS / 取 CSS / 取字体文件一串请求；NAS 又常处于无外网的内网环境。现已删除全部 `fonts.googleapis.com` / `fonts.gstatic.com` 引用，改用在各平台都自然、且覆盖中文字形的系统字体栈（`system-ui` / `Segoe UI` / `PingFang SC` / `Microsoft YaHei` …）。改写后 `index.html` 中 `https://` 引用数为 **0**，UI 完全自包含。

这两处改写由 `tools/sync_web.py` 自动化：它先从 `../public`（仓库根目录的原版前端）播种 `src/web`，再施加上述改写，最后校验**既无残留绝对路径、也无任何第三方字体请求**（任一残留都会直接报错退出）。上游前端更新后执行：

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

## 7. ⚠️ 两个平台坑

这两个坑都只有在真实设备上才能发现，且都不会在本地开发时暴露。

### 7.1 启动失败：GODEBUG 与新版本 Go 冲突

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

### 7.2 大文件上传失败：只读沙箱里没有临时目录

`ParseMultipartForm` 会把超过内存阈值的 part 溢写到**临时文件**，走的是 `os.TempDir()`，也就是 `/tmp`。而 UGOS 给应用生成的 systemd 单元是这样的：

```ini
TemporaryFileSystem=/:ro
BindReadOnlyPaths=/lib
BindPaths=/var/packages/{appid}/data
BindPaths=/var/packages/{appid}/cache
BindPaths=/var/packages/{appid}/log
```

整个根文件系统是只读 tmpfs，只有 `data` / `cache` / `log` 被显式挂成可写。**`/tmp` 不可写**，于是任何超过内存阈值的 multipart 解析都会失败，接口返回 400。

症状很容易误判 —— 表面上像是"网关限制了上传大小"，实际上后端直连也一样失败：

```
16 MB 直连 -> 201
19 MB 直连 -> 400     ← 后端自己的 bug，与网关无关
```

**正确修法不是去找临时目录，而是根本不产生临时文件。** `handleCreateItem` 改用 `r.MultipartReader()` 逐 part 流式处理，文件 part 直接 `io.Copy` 到 `uploads/` 下的最终路径：

- 不需要临时文件，因此在只读沙箱里正常工作；
- 内存占用与文件大小无关，100 MB 上传也只占常量内存；
- 少一次完整的磁盘写入（不再有"写临时文件 → 再搬走"）。

修复后实测：直连 19 / 21 / 60 / **100 MB** 全部 201，往返 SHA-256 一致。

### 7.3 结论：网关 20 MB、直连 100 MB

应用自身接受 100 MB，但 UGOS 网关（nginx）的 http 级 `client_max_body_size 20m` **不会**被第三方应用的 server 块覆盖（内置应用如 filemgr/vault 各自覆盖为 `0`，第三方模板不生成该指令）。因此：

| 访问方式 | 上传上限 |
|---|---|
| 经 UGOS 网关（桌面窗口，`:10003` / `:10004`） | **约 20 MB** |
| 直连后端端口（`:21039`） | **100 MB**（应用自身上限） |

前端对 413 / 500 做了专门处理，会给出可操作的提示（告知改用直连地址），而不是显示 nginx 的 413 HTML 页面。这是平台约束，无法通过 UPK 修复。

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
| **直连大文件阶梯 19 / 21 / 60 / 100 MB** | **全部 201，往返 SHA-256 一致** |
| **经网关阶梯 5 / 15 / 17 MB** | 201 |
| 经网关 21 MB | 413（平台限制，见 7.3；前端给出可操作提示） |
| Windows 经局域网访问网关 10003 / 10004 | 200 |
| 经网关完整上传→下载往返 | SHA-256 **一致** |
| 无密码访问受保护内容 | 403 |
| 正确密码换 token 后读取 | 200 + 正确内容 |
| 公开列表是否泄露受保护内容 | 否 |
| 数据落盘 | `/volume1/@appdata/.../items.json` + `uploads/` |
| **服务重启后数据保留** | 是 |

## 10. 隐私政策与上架合规

上架绿联云应用中心要求提交隐私政策链接，且格式有硬性规定（标准 HTTPS、可直接访问的静态页、无需登录或跳转、不得用图片/Word/博客页替代、内容须与**应用内展示版本一致**）。本项目已按规则落实。

**单一来源，两处一致。** 政策正文只有一份 `privacy/privacy.html`，构建时复制到两处：

| 用途 | 路径 | 说明 |
|---|---|---|
| 应用内展示 | `src/web/privacy.html` | 随包分发，经网关或内置后端提供 |
| 对外公开链接 | `docs/privacy.html` | GitHub Pages 发布，即 `project.yaml` 里 `privacy_policy_link` 的地址 |

`build.ps1` 复制后会比对两处 SHA-256，**不一致直接让构建失败** —— 这是"内容应与应用内展示版本保持一致"的机械保证。

**政策声明的是核实过的事实，不是模板套话。** 撰写前逐项验证：

- 后端无任何出站请求（`http.Get` / `net.Dial` / `Client.Do` 全部为空）
- 仅依赖 Go 标准库，无任何第三方模块
- 访问日志只记 `方法 路径 状态码 字节数 耗时`，**不含 IP、UA、查询串**
- 前端零外部资源加载（已移除 Google Fonts）

因此政策如实写明**不收集任何个人信息**，同时披露用户真正需要知道的事：上传内容为明文存储、无密码内容局域网内任何人可读、到期自动删除、临时密码仅保存 SHA-256 摘要。

**应用内入口**（由 `tools/sync_web.py` 注入）：

- 页脚常驻隐私政策链接，以及大陆上架所需的**「三清单」**（收集个人信息清单 / 个人信息共享清单 / 第三方 SDK 清单），二者均为"无"
- 首次打开弹出说明并链向全文。**它不拦截任何操作** —— 本应用不收集信息，不存在需要同意的处理活动，关闭弹窗不影响任何功能（符合规则"不得因拒绝而影响基本功能"）

**已实测：**

| 检查项 | 结果 |
|---|---|
| 公开链接 `https://zbc0315.github.io/temp-cloud/privacy.html` | HTTP **200** |
| 公开版本 vs 包内版本 SHA-256 | **完全一致** |
| 经 UGOS 网关取回的应用内政策页 vs 包内文件 | **完全一致** |
| 外部资源加载 | 0（仅联系方式是超链接） |
| 中英双语、三清单、联系方式 | 均在 |

> ⚠️ **上架前需替换**：政策中的运营者名称目前填的是开发者标识 `zbc0315`，联系方式用的是 GitHub Issues。提交审核前请替换为你注册时使用的**真实主体名称与联系方式**（平台也会在应用详情页公示该主体信息）。改完记得跑一次 `build.ps1`，它会自动同步两处并校验一致。

## 11. 已知事项

- **经网关上传上限约 20 MB**：平台约束（nginx `client_max_body_size`），无法通过 UPK 修复。大文件请用直连地址 `http://<NAS-IP>:21039/`，该路径支持应用自身的 100 MB 上限。详见 7.3。
- **桌面快捷方式**：`uginstall` 命令行安装**不会**创建系统桌面图标（该条目由 App Center 界面创建）。命令行安装后可手工补一个与系统约定一致的空标记文件：
  ```bash
  sudo touch /ugreen/.config/.nas/<uid>/desktop/<appid>.ugreenapp
  ```
  通过 App Center 图形界面安装则无需此步。重装应用不会删除该文件。
- **应用注册与固定**：UPK 内的 `config.json` 已声明 `proxy: [{location: api, target: 21039}]`，网关会把 `/api/` 前缀转发到后端。若在系统桌面点开图标后发现前端请求未走网关，可直接用 `http://<NAS-IP>:21039/` 访问——后端内嵌了完整 UI，两种方式都可用。
- **端口 21039** 为自选值（官方示例使用 21010 / 29090）。如与设备上其他服务冲突，改 `project.yaml` 的 `port` 与 `start_cmd` 后重新打包。
- **`depend_fw_version`** 填的是官方示例值 `1.13.0.0000`。文档建议向绿联确认有效固件版本号后再调整。
- **开源合规**：`project.yaml` 已配置 `source_code_link` 与 `license_agreement_link`（原项目为 MIT）。Go 重写部分已随本工程提交到 `https://github.com/zbc0315/temp-cloud`，与 `source_code_link` 指向一致。
