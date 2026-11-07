# Electron 知识库入口

> 用写网页的方式写桌面应用。这一套文档不教你 HTML/CSS，而是回答"网页和桌面程序之间到底差了什么"——双进程模型、IPC、窗口与系统能力、安全边界、打包签名与自动更新，最后落到一套能上线、能维护的工程结构。

## 一、Electron 到底是什么

很多介绍会说"Electron = Chromium + Node.js"，这句话对，但不够用。更准确的理解是：

**一个由主进程调度、内置了一个完整 Chromium 的 Node.js 应用。** 你的界面跑在 Chromium 里（和 Chrome 打开网页一模一样），你的系统能力跑在 Node.js 里（和命令行脚本一模一样），中间用一套 IPC 通道连接。

| 组成 | 提供什么 | 对应你的经验 |
| --- | --- | --- |
| Chromium（Content 模块） | HTML/CSS/JS 渲染、DevTools、Web API、GPU 合成 | 你写 Vue/React 的那套东西原样可用 |
| Node.js | 文件、网络、进程、`fs`/`net`/`child_process`、npm 生态 | 服务端那套写法，只是跑在本机 |
| Electron 原生 API | 窗口、菜单、托盘、剪贴板、通知、自动更新、系统对话框 | 浏览器没有的"桌面特供" |
| V8 隔离机制 | `contextBridge` + 沙箱，把 Node 能力和页面隔开 | 类似后端的"最小权限"设计 |

一句话记忆：**渲染进程是"浏览器标签页"，主进程是"后端服务"，preload 是两者之间唯一被允许的窄门。**

## 二、和其它桌面方案怎么选

| 方案 | 原理 | 安装包体积 | 内存占用 | 上手成本 | 系统能力 | 典型场景 |
| --- | --- | --- | --- | --- | --- | --- |
| **Electron** | 内置 Chromium + Node | 80~150 MB | 高（每个窗口一个渲染进程） | 前端零门槛 | 全（Node 生态 + 原生 API） | VS Code、Slack、Figma 桌面版、钉钉 |
| Tauri | 系统 WebView + Rust 后端 | 3~15 MB | 低 | 要会 Rust 或写插件 | 强，但依赖系统 WebView | 轻量工具、体积敏感型 |
| Web 套壳（PWA/独立浏览器窗口） | 就是个网页 | 0 | 取决于浏览器 | 最低 | 几乎没有 | 内部后台、能用浏览器解决的 |
| 原生（Qt / WPF / SwiftUI） | 平台原生 UI | 中 | 低 | 高，且要分平台 | 最强 | 重交互、专业软件 |

选 Electron 的核心理由通常不是"性能好"，而是：**一套代码三平台、前端团队零迁移成本、Node 生态直接复用（数据库、串口、文件处理都有现成包）**。代价要提前接受：体积大、内存高、必须认真做安全加固。

## 三、心智模型：四种进程

```
┌─────────────────────────────────────────────────────────────┐
│ 主进程 Main（只有一个）                                      │
│ Node.js 全能力 · app / BrowserWindow / Menu / Tray / 更新     │
└───────────────▲──────────────────────────▲──────────────────┘
                │ IPC (ipcMain.handle / on) │
┌───────────────┴───────────┐   ┌───────────┴─────────────────┐
│ preload（每个窗口一个）     │   │ utilityProcess（可选，0~N 个）│
│ 沙箱内运行 · 唯一桥接层     │   │ 纯 Node 子进程 · 干重活       │
│ contextBridge 暴露最小 API │   │ 不阻塞主进程                  │
└───────────────▲───────────┘   └─────────────────────────────┘
                │ window.api.xxx（普通函数调用）
┌───────────────┴─────────────────────────────────────────────┐
│ 渲染进程 Renderer（每个窗口一个）                             │
│ Chromium：你的 Vue/React 页面 · 无 Node（默认沙箱）           │
└─────────────────────────────────────────────────────────────┘
```

| 进程 | 数量 | Node 能力 | 主要职责 | 崩了会怎样 |
| --- | --- | --- | --- | --- |
| 主进程 | 1 | 完整 | 生命周期、窗口、菜单、IPC 路由、更新 | 整个应用退出 |
| 渲染进程 | 每窗口 1 | 默认无（沙箱） | 页面渲染与交互 | 单个窗口白屏，可监听 `render-process-gone` 重载 |
| preload | 每窗口 1 | 受限（有 `require`，但只能碰白名单模块） | 用 `contextBridge` 暴露受控 API | 该窗口失去桥接能力 |
| utilityProcess | 按需 | 完整（独立 Node 环境） | 压缩、解析、计算等 CPU 密集任务 | 单独退出，不影响主进程 |

关键结论：**主进程是单线程的"总开关"，任何同步阻塞都会让整个应用卡住**（包括所有窗口的 IPC 响应）。重活必须丢给 `utilityProcess` 或 `worker_threads`，详见 [原生模块与本地能力](/electron/native-modules)。

## 四、能力边界：什么该做、什么别做

**适合**：企业内部工具、IDE/编辑器、IM 与协作客户端、下载器、跨平台数据采集与报表、需要读写本地文件或调用系统的 Web 应用。

**不适合**：

- 对安装体积、冷启动有硬性要求的场景（考虑 Tauri）；
- 需要大量原生控件质感（macOS 的 NSVisualEffect、Windows 的 Ribbon）——Electron 做得到但要自己画；
- 把"网页直接加载远程站点"当桌面应用——那样等于把整个 Node 暴露给远端，安全模型直接失效（见 [安全加固清单](/electron/security)）。

## 五、这个分区怎么读

| 序号 | 主题 | 你会学到 |
| --- | --- | --- |
| 1 | [进程模型与运行时架构](/electron/architecture) | 主/渲染/preload/utility 的职责边界、生命周期、Chromium 与 Node 版本关系、崩溃隔离 |
| 2 | [环境、脚手架与第一个窗口](/electron/getting-started) | Node 版本要求、Forge / electron-vite 选型、目录结构、最小可运行代码、调试与热重载 |
| 3 | [IPC 进程通信全解](/electron/ipc) | `invoke/handle`、`send/on`、MessagePort 流、类型安全封装、序列化限制、错误传播 |
| 4 | [窗口与视图管理](/electron/window) | `BrowserWindow` 选项、`ready-to-show`、多窗口、无边框与自定义标题栏、`WebContentsView` |
| 5 | [菜单、托盘与系统集成](/electron/system-integration) | 应用菜单、托盘、全局快捷键、通知、Dock/任务栏、文件关联、深链接、单实例锁 |
| 6 | [安全加固清单](/electron/security) | `contextIsolation`/`sandbox`/CSP、IPC 校验、导航与新窗口拦截、权限处理器、Fuses |
| 7 | [原生模块与本地能力](/electron/native-modules) | better-sqlite3 等原生模块重编译、`asarUnpack`、文件与数据库选型、`utilityProcess` |
| 8 | [打包、签名与自动更新](/electron/build-release) | electron-builder / Forge、macOS 公证、Windows 签名、`electron-updater`、CI 多平台产物 |
| 9 | [性能优化与调试排错](/electron/performance-debug) | 启动耗时拆解、内存泄漏定位、主进程阻塞、崩溃上报、高频坑对照表 |
| 10 | [API 与踩坑速查表](/electron/cheatsheet) | 常用 API、配置片段、报错关键字 → 原因 → 解法 |

建议路径：**1 → 2 → 3 必读**，这三篇决定了你后面所有代码的形状；4~6 按项目需要查；7~9 在做交付、上线时才真正痛。

## 六、30 分钟最小可运行项目

不装脚手架，先看清骨架。四个文件即可跑起来：

```json
// package.json
{
  "name": "electron-demo",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron ."
  },
  "devDependencies": {
    "electron": "^37.0.0"
  }
}
```

> `electron` 必须放在 `devDependencies`：打包工具会把它当成"运行时外壳"单独处理，放进 `dependencies` 会让安装包多塞一份无用的内核。版本号以 npm 上当前最新稳定大版本为准（`npm view electron version` 查看），这里仅作示例。

```js
// main.js —— 主进程：Node 世界
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false, // 先隐藏，等页面准备好再显示，避免白屏闪烁
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // 默认值，显式写出更安全
      nodeIntegration: false, // 默认值，页面里拿不到 require
      sandbox: true, // 默认值，preload 也在沙箱里
    },
  })

  win.once('ready-to-show', () => win.show())
  win.loadFile('index.html')
}

// 只注册一次：渲染进程通过 window.api.getUserDataPath() 调用
ipcMain.handle('app:user-data-path', () => app.getPath('userData'))

app.whenReady().then(() => {
  createWindow()
  // macOS：点 Dock 图标且没有窗口时，重新开一个
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Windows / Linux：关掉所有窗口就退出；macOS 习惯是驻留
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

```js
// preload.js —— 唯一桥接层：只暴露白名单方法
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  getUserDataPath: () => ipcRenderer.invoke('app:user-data-path'),
})
```

```html
<!-- index.html —— 渲染进程：浏览器世界 -->
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <!-- CSP 是第二道防线：禁止内联脚本与远程脚本，按需放宽 -->
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'" />
    <title>Electron Demo</title>
  </head>
  <body>
    <button id="btn">用户数据目录在哪？</button>
    <pre id="out"></pre>
    <script src="./renderer.js"></script>
  </body>
</html>
```

```js
// renderer.js
document.getElementById('btn').addEventListener('click', async () => {
  const dir = await window.api.getUserDataPath()
  document.getElementById('out').textContent = dir
})
```

```bash
npm install
npm start
```

跑通之后请记住三条铁律，后面所有章节都围绕它们展开：

1. **页面里不要出现 `require`**，要用什么就让 preload 暴露一个方法；
2. **主进程不要做耗时计算**，否则窗口集体卡死；
3. **任何来自渲染进程的入参都要当作不可信**，尤其是路径与 URL。

## 七、工程选型速查

| 关注点 | 推荐方案 | 备注 |
| --- | --- | --- |
| 脚手架 | `electron-vite`（Vue/React + HMR）或 `electron-forge`（官方，集成打包） | 团队已有 Vite 就选前者；想要"一条命令出安装包"选 Forge |
| 语言 | TypeScript 优先 | 主进程与 preload 也要 TS，共享 IPC 的类型定义 |
| 打包 | `electron-builder`（配置直观、生态大）或 Forge makers | 见 [打包发布](/electron/build-release) |
| 自动更新 | `electron-updater` | 内置 `autoUpdater` 仅适合 macOS/Windows 的特定后端 |
| 本地存储 | `better-sqlite3` 或 `electron-store`（轻量 JSON） | 数据量大用 SQLite，配置项用 JSON |
| 日志 | `electron-log` | 主进程与渲染进程统一落盘，自动按大小轮转 |
| 崩溃监控 | `crashReporter` + Sentry | 主进程崩溃与渲染进程崩溃分开上报 |
| 测试 | Vitest（纯逻辑）+ Playwright（E2E，`_electron.launch`） | E2E 能真正验证 IPC 与窗口行为 |

## 八、版本策略（容易被忽略但很关键）

- Electron 跟随 Chromium 快速迭代，**大版本节奏约每 8 周一次，官方只维护最近三个大版本**。锁版本、定期升级，别让项目停在两年前的版本上。
- 升级前先看 `BREAKING CHANGES` 文档：历史上 `remote` 模块移除、`BrowserView` 被 `WebContentsView` 取代、`File.path` 被 `webUtils.getPathForFile` 取代，都是"代码能编译但运行报错"的类型。
- 原生模块（SQLite、串口、加密库）与 Node ABI 绑定，**升级 Electron 后必须 rebuild**（见 [原生模块](/electron/native-modules)）。
- 查当前版本信息：

```bash
npx electron --version        # Electron 版本
# 应用运行时（主进程）里：
# process.versions.electron / .chrome / .node / .v8
```

## 九、官方与生态资源

- <a href="https://www.electronjs.org/docs/latest/" target="_blank" rel="noopener noreferrer">Electron 官方文档</a>：API 参考最权威，重点读 `Process Model`、`Security`、`Best Practices` 三篇。
- <a href="https://www.electronjs.org/docs/latest/tutorial/security" target="_blank" rel="noopener noreferrer">Security Checklist</a>：上线前逐条对照。
- <a href="https://www.electron.build/" target="_blank" rel="noopener noreferrer">electron-builder 文档</a>：签名、公证、更新源配置都在这里。
- <a href="https://electron-vite.org/" target="_blank" rel="noopener noreferrer">electron-vite</a>：主进程 / preload / 渲染进程三端统一 Vite 构建。
- <a href="https://www.electronjs.org/fiddle" target="_blank" rel="noopener noreferrer">Electron Fiddle</a>：几十行代码验证一个 API，排查"到底是我的问题还是 Electron 的问题"时非常好用。
