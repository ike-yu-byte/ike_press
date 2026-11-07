# 打包、签名与自动更新

> 第 8 站：从"能跑"到"能发给别人装"，中间隔着签名、公证、更新通道和三条 CI 流水线。这一篇给出可直接落地的 electron-builder 配置，以及 macOS / Windows / Linux 三端的签名与自动更新流程。

## 一、先分清两件事

| 阶段 | 做什么 | 工具 |
| --- | --- | --- |
| **构建（build）** | TS/框架代码 → 可运行的 JS 产物（`out/`） | Vite / electron-vite / tsc |
| **打包（package）** | 产物 + Electron 运行时 → 安装包（`.dmg`/`.exe`/`.AppImage`） | electron-builder / Forge makers |

常见误区：只跑了 `npm run build` 就以为能发布。必须在**干净环境**里跑一次 `package`，再用安装包验证（签名、资源路径、原生模块问题只在这时暴露）。

## 二、工具对比

| 工具 | 配置方式 | 产物 | 自动更新 | 评价 |
| --- | --- | --- | --- | --- |
| **electron-builder** | `electron-builder.yml` / `package.json#build` | dmg/exe/msi/AppImage/deb/snap | 与 `electron-updater` 深度集成 | 生态最大，文档最全，推荐 |
| electron-forge | `forge.config.ts` + makers | squirrel/dmg/deb/rpm/zip | 需配合 `update-electron-app` | 官方，插件化，适合新项目 |
| electron-packager | 命令行参数 | 免安装目录 | 无 | 只做"打包成目录"，其余自理 |

下文以 electron-builder 为例。

## 三、最小可用配置

```yaml
# electron-builder.yml
appId: com.example.myapp # 反向域名，签名/更新/单实例都依赖它
productName: MyApp
copyright: Copyright © 2026 Example Inc.

directories:
  output: release
  buildResources: build # 图标、entitlements、安装器背景图放这里

files:
  - out/**/* # electron-vite 的产物
  - package.json
  # node_modules 由 builder 按 dependencies 自动收集
  - '!**/*.map' # 不发布 sourcemap

asar: true
asarUnpack:
  - '**/*.node' # 原生模块必须解包
  - resources/** # 需要被外部程序读取的资源

extraResources:
  - from: resources/bin
    to: bin # 打包后位于 <app>/resources/bin

mac:
  category: public.app-category.productivity
  icon: build/icon.icns
  target:
    - target: dmg
      arch: [arm64, x64]
    - target: zip # 自动更新在 macOS 上需要 zip target
      arch: [arm64, x64]
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist

win:
  icon: build/icon.ico
  target:
    - target: nsis
      arch: [x64, arm64]

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  perMachine: false # 默认按用户安装，免管理员权限
  deleteAppDataOnUninstall: false # 卸载时保留用户数据（按产品决定）

linux:
  icon: build/icons
  category: Utility
  target: [AppImage, deb]

publish:
  provider: generic
  url: https://dl.example.com/myapp/${os}/${arch}/
```

```json
// package.json scripts
{
  "scripts": {
    "build": "electron-vite build",
    "dist": "npm run build && electron-builder",
    "dist:mac": "npm run build && electron-builder --mac",
    "dist:win": "npm run build && electron-builder --win",
    "dist:linux": "npm run build && electron-builder --linux"
  }
}
```

## 四、图标与产物命名

| 平台 | 格式 | 要求 |
| --- | --- | --- |
| macOS | `icon.icns` | 1024×1024 源图，用 `iconutil` 或在线工具转换 |
| Windows | `icon.ico` | 含 256/128/64/48/32/16 多尺寸 |
| Linux | 一组 PNG（`build/icons/512x512.png` 等） | 目录名不能改 |

产物命名建议包含版本与架构，便于灰度与排障：

```yaml
artifactName: ${productName}-${version}-${os}-${arch}.${ext}
```

## 五、macOS 签名与公证（最容易卡住的一步）

从 macOS 10.15 起，未公证的应用用户双击会看到"无法验证开发者"。完整链路是：**Developer ID 证书签名 → hardened runtime → 上传 Apple 公证 → 装订（staple）**。

### 1. 准备证书

在 Apple Developer 后台创建 **Developer ID Application** 证书，导入钥匙串，确认：

```bash
security find-identity -v -p codesigning
# 输出中应有：Developer ID Application: Your Name (TEAMID)
```

### 2. entitlements

```xml
<!-- build/entitlements.mac.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <!-- 允许 JIT（V8 需要） -->
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <!-- 使用摄像头/麦克风时才加 -->
    <key>com.apple.security.device.audio-input</key>
    <true/>
    <key>com.apple.security.device.camera</key>
    <true/>
  </dict>
</plist>
```

### 3. electron-builder 公证配置

```yaml
mac:
  notarize: true # 交给 builder 调 notarytool
```

环境变量（CI 里注入）：

```bash
# 方式 A：App Store Connect API Key（推荐，最稳定）
export APPLE_API_KEY=/path/AuthKey_XXXX.p8
export APPLE_API_KEY_ID=XXXX
export APPLE_API_ISSUER=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# 方式 B：Apple ID + 应用专用密码
export APPLE_ID=you@example.com
export APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
export APPLE_TEAM_ID=TEAMID
```

验证签名与公证：

```bash
codesign -dv --verbose=4 "release/mac-arm64/MyApp.app"
spctl -a -vvv -t install "release/mac-arm64/MyApp.app"
xcrun stapler validate "release/MyApp-1.0.0-mac-arm64.dmg"
```

> 常见失败：`The signature of the binary is invalid` → `asarUnpack` 里的二进制没被签名，检查 `mac.binaries`；`notarization failed: Invalid` → `entitlements` 缺 `allow-jit`，或包里混入了未签名的第三方 CLI。

## 六、Windows 签名

| 方式 | 说明 |
| --- | --- |
| 标准代码签名证书（OV） | 从 CA 购买 `.pfx`，用 `signtool` 签 |
| EV 证书 | 需硬件 token，能更快建立 SmartScreen 信誉 |
| Azure Trusted Signing | 云签名，CI 友好，近年主流 |

```yaml
win:
  signingHashAlgorithms: [sha256]
  # electron-builder 会自动读取以下环境变量
  # CSC_LINK / CSC_KEY_PASSWORD（pfx 方式）
```

```bash
# pfx 方式（CI secrets）
export CSC_LINK=/path/cert.pfx
export CSC_KEY_PASSWORD=your-password
```

自定义签名脚本（Azure Trusted Signing / 硬件 token）：

```js
// build/sign.js，配合 win.sign 或 afterPack 钩子
const { execFileSync } = require('node:child_process')

exports.default = async function sign(configuration) {
  execFileSync('signtool', [
    'sign', '/fd', 'sha256',
    '/tr', 'http://timestamp.digicert.com', '/td', 'sha256',
    '/f', process.env.CERT_PATH,
    '/p', process.env.CERT_PASSWORD,
    configuration.path,
  ])
}
```

要点：**必须加时间戳**，否则证书过期后已发布的安装包签名失效；签名后不要再用其他工具修改 exe（会破坏签名）。

## 七、Linux

- `AppImage`：免安装，但需要 `libfuse2`，部分新发行版要额外提示；
- `deb`/`rpm`：走包管理器，注意 `depends` 与桌面文件（`.desktop`）里的 `Exec` 路径；
- `snap`：需要 store 账号，沙箱限制较多（托盘、文件访问都要声明接口）；
- **Linux 一般不做代码签名**，靠仓库/校验和分发；可在发布页提供 `sha256sum`。

## 八、自动更新（electron-updater）

原理：应用启动后向 `publish` 配置的地址请求 `latest.yml`（macOS 是 `latest-mac.yml`），比较版本号，下载增量/全量包，校验签名后安装。

```ts
// main/updater.ts
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'

export function setupUpdater() {
  autoUpdater.logger = log
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => log.info('发现新版本', info.version))
  autoUpdater.on('update-downloaded', (info) => {
    // 也可以先问用户，再调用 quitAndInstall
    log.info('已下载', info.version)
    autoUpdater.quitAndInstall()
  })
  autoUpdater.on('error', (err) => log.error('更新失败', err))

  // 打包后才有意义；开发环境会因缺少签名/配置直接报错
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch((e) => log.error(e))
  }
}
```

| 平台 | 必需条件 | 常见失败 |
| --- | --- | --- |
| macOS | zip target + 已签名 + 已公证 | 未签名包会静默失败；只出 dmg 不生效 |
| Windows | NSIS 或 squirrel 产物 + 签名 | old version 缓存；离线安装后无 `latest.yml` |
| Linux | AppImage（推荐）/ deb | AppImage 需可执行位；deb 更新需仓库配合 |

`publish` 可选 provider：

| provider | 场景 |
| --- | --- |
| `generic` | 自建静态服务器（最灵活，需自己上传产物） |
| `github` | 公开仓库免费分发 |
| `s3` / `spaces` | 对象存储 + CDN |
| `s3`+私有 | 需要签名 URL 时用 `provider: s3` + `options` |

版本发布流程（generic）：

```bash
# 1. 改版本号
npm version patch   # 1.0.0 -> 1.0.1

# 2. 构建产物（会生成 yml 元数据）
npm run dist

# 3. 上传 release/ 下的安装包 + latest*.yml + 差分文件（.blockmap）
#    ⚠ 漏传 latest.yml = 永远不会提示更新
```

## 九、CI：三平台产物（GitHub Actions）

```yaml
name: release
on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        os: [macos-14, windows-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run dist
        env:
          # macOS
          APPLE_API_KEY_ID: ${{ secrets.APPLE_API_KEY_ID }}
          APPLE_API_ISSUER: ${{ secrets.APPLE_API_ISSUER }}
          APPLE_API_KEY: ${{ secrets.APPLE_API_KEY }}
          # Windows
          CSC_LINK: ${{ secrets.CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
          # 更新源
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - uses: actions/upload-artifact@v4
        with:
          name: dist-${{ matrix.os }}
          path: release/*
```

三个平台必须分开跑：**macOS 上不能签 Windows 安装包**（签名工具与证书限制），Windows 上也不能公证 macOS 包。

## 十、资源路径与运行时判断

```ts
// 开发时读源码目录，打包后读 resources
const binPath = app.isPackaged
  ? join(process.resourcesPath, 'bin', 'ffmpeg')
  : join(__dirname, '../../resources/bin/ffmpeg')

// 打包后 __dirname 在 asar 内，可以读文件，但不能执行，也不能被外部程序读取
```

| 想访问 | 正确路径 |
| --- | --- |
| 随应用分发的只读资源 | `process.resourcesPath`（`extraResources`） |
| 打包进去的 JS/HTML | `join(__dirname, ...)`（asar 内可读） |
| 需要给外部程序读取/执行的文件 | `asarUnpack` + `process.resourcesPath` 或 `__dirname` 下的 unpack 目录 |
| 用户数据 | `app.getPath('userData')` |

## 十一、体积优化

| 手段 | 效果 |
| --- | --- |
| 只打单架构（或分别出包，别做 universal） | 省 40~50% |
| `electron-builder` 压缩 `asar` + `compression: normal` | 安装包更小 |
| 剔除 `devDependencies` 与未使用依赖 | 直接反映到体积 |
| 资源压缩（图片转 WebP、字体子集化） | 中等 |
| 首启动不打包大资源，改为按需下载 | 显著，但要处理离线 |

> universal 包（arm64 + x64 合一）看起来省事，实际体积几乎翻倍。更好的做法是分别出包，下载页按架构引导。

## 十二、发布后的运维

| 事项 | 建议 |
| --- | --- |
| 版本回滚 | 保留上两个版本的安装包；`latest.yml` 回指旧版即可"降级更新"（需谨慎测试） |
| 灰度 | 自建服务按客户端 ID 返回不同 `latest.yml`；或先发内部版 |
| 强更 | 启动时比对 `app.getVersion()` 与远端最低版本，低于则弹不可关闭的更新页 |
| 数据迁移 | 版本升级可能改数据库结构，用 `PRAGMA user_version` 做迁移脚本 |
| 卸载残留 | `deleteAppDataOnUninstall: false` 时提醒用户手动清理 |
| 崩溃率监控 | crashReporter + Sentry，按版本对比 |

下一篇：[性能优化与调试排错](/electron/performance-debug)。
