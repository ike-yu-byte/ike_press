# 环境、脚手架与第一个窗口

> 第 2 站：Electron 项目最容易"死在起步"——依赖装错位置、ESM 与 CJS 打架、HMR 不生效、preload 路径找不到。这一篇给一套能长期用的工程骨架，而不是复制粘贴一个 Hello World。

## 一、环境准备

| 项 | 要求 | 说明 |
| --- | --- | --- |
| Node.js | 与所选 Electron 内置的 Node 版本接近（用 LTS 最稳） | `process.versions.node` 是运行时版本，与本地 Node 不必完全一致 |
| 包管理器 | npm / pnpm / yarn 均可 | pnpm 需注意 `node_modules` 软链对打包的影响（见下文） |
| 系统工具 | macOS 需 Xcode Command Line Tools；Windows 需 VS Build Tools（原生模块才需要） | 只做纯 JS 可以不装 |
| Electron 安装位置 | `devDependencies` | 打包器会把它排除在业务依赖之外 |

不装脚手架先验证环境：

```bash
mkdir electron-check && cd electron-check
npm init -y
npm i -D electron
npx electron --version
```

能打印版本号说明下载与缓存正常（Electron 会从 GitHub 下载二进制，国内网络常见失败，见最后一节）。

## 二、三种脚手架怎么选

| 方案 | 组成 | 优点 | 适合 |
| --- | --- | --- | --- |
| **electron-vite** | Vite 三端构建（main/preload/renderer）+ electron-builder | HMR 快、TS/框架开箱即用、和 Web 开发心智一致 | 已有 Vue/React 团队，**推荐** |
| **electron-forge** | 官方工具链 + 多种模板 + makers | 官方维护、模板多、`make` 直接出安装包 | 想要"一条命令打包"的新项目 |
| 手动（自建） | 自己配 Vite + electron-builder | 完全可控 | 老项目迁移、需要深度定制 |

```bash
# 方案 A：electron-vite（Vue 模板为例）
npm create @quick-start/electron@latest my-app -- --template vue-ts

# 方案 B：electron-forge
npm init electron-app@latest my-app -- --template=vite-typescript
```

选 A 的话，生成的目录长这样（下文都以此为例）：

```
my-app/
├── electron.vite.config.ts     # 三端构建配置
├── package.json
├── src/
│   ├── main/
│   │   └── index.ts            # 主进程入口
│   ├── preload/
│   │   └── index.ts            # 桥接层
│   └── renderer/
│       ├── index.html
│       └── src/                # 你的 Vue/React 代码
├── resources/                  # 打包时随应用分发的资源
├── build/                      # 图标、entitlements、安装器素材
└── out/                        # 构建产物（含打包后的 app）
```

关键约定：**渲染进程的代码不能 import 任何 `node:` 模块**。构建配置里通常已给 main/preload 加了 `externalizeDepsPlugin`，给 renderer 用的是纯浏览器目标。

## 三、最小但完整的骨架代码

### 主进程

```ts
// src/main/index.ts
import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#ffffff', // 避免首帧黑闪（深色主题填 #1e1e1e）
    autoHideMenuBar: true, // Windows/Linux 隐藏默认菜单栏
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 兜底：某些情况下 ready-to-show 不触发
  const timer = setTimeout(() => mainWindow?.show(), 3000)

  mainWindow.on('ready-to-show', () => {
    clearTimeout(timer)
    mainWindow?.show()
  })

  // 外部链接交给系统浏览器，绝不在应用内打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.example.myapp') // Windows 通知/任务栏归属
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window) // 开发期 F12 / 刷新等快捷键
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

### preload

```ts
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

// 只暴露"函数级"能力，不要暴露 ipcRenderer 本身
const api = {
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),
  openFile: (): Promise<string | null> => ipcRenderer.invoke('dialog:open-file'),
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('exposeInMainWorld 失败', error)
  }
} else {
  // 仅在显式关闭 contextIsolation 时才会走到这里（不推荐）
  ;(window as any).api = api
}

export type Api = typeof api
```

```ts
// src/renderer/src/env.d.ts —— 让页面侧的 window.api 有类型
import type { Api } from '../../preload'

declare global {
  interface Window {
    api: Api
  }
}
```

> 共享类型是这个骨架最值钱的地方：**IPC 的通道名、入参、返回值都从同一份类型推导**，改主进程会立刻在前端报错。详见 [IPC 进程通信全解](/electron/ipc)。

### 页面

```ts
// src/renderer/src/App.vue（Vue 示例，React 同理）
const version = await window.api.getVersion()
```

## 四、开发工作流

```json
// package.json scripts（electron-vite 模板生成）
{
  "scripts": {
    "dev": "electron-vite dev",          // 启动开发：主进程 + 渲染进程 HMR
    "dev:watch": "electron-vite dev -w", // 主进程改动自动重启
    "build": "electron-vite build",      // 只产出代码（不打包安装器）
    "preview": "electron-vite preview",  // 用生产产物跑一次
    "build:mac": "electron-vite build && electron-builder --mac",
    "build:win": "electron-vite build && electron-builder --win",
    "build:linux": "electron-vite build && electron-builder --linux"
  }
}
```

要点：

- **渲染进程有 HMR，主进程没有**：改主进程代码会重启整个应用（`-w`），所以状态会丢，把可调试的业务放渲染进程；
- **preload 改动也必须重启**，因为它注入到新窗口里；
- 生产包一定要先用 `preview` 验证一次——`loadFile` 与 `loadURL` 的路径差异、asar 内资源路径问题只在生产模式暴露。

## 五、调试

### 渲染进程

`Ctrl/Cmd + Shift + I`（或 `win.webContents.openDevTools()`）。Vue DevTools / React DevTools 可直接从 Chrome 商店安装后在此使用。

### 主进程

```json
// .vscode/launch.json —— 用 VS Code 断点调试主进程
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Electron: Main",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "args": [".", "--inspect=5858"],
      "console": "integratedTerminal",
      "sourceMaps": true
    }
  ]
}
```

TS 项目的 `sourceMaps` 需要构建产物带 sourcemap（electron-vite 开发模式默认开启）。

### 命令行排查开关

```bash
# 打开 Chromium 日志（网络失败、GPU 回退、沙箱报错都在这）
npx electron . --enable-logging --v=1

# 只启用主进程 inspect（外部调试器 attach 5858）
npx electron . --inspect=5858
```

## 六、常见起步报错对照

| 报错关键字 | 原因 | 解法 |
| --- | --- | --- |
| `Electron failed to install correctly` | 二进制下载失败 | 删 `node_modules/electron` 重装；配置镜像 `ELECTRON_MIRROR` |
| `Cannot find module 'electron'` | 装到了 `dependencies` 但打包后没有，或未安装 | 放 `devDependencies`，CI 里 `npm ci` |
| `require is not defined`（页面） | 页面里直接写了 `require` | 通过 preload + `contextBridge` 暴露 |
| `Unable to load preload script` | preload 路径错误或构建未产出 | 检查 `join(__dirname, '../preload/index.js')` 与构建目录结构 |
| `window.api is undefined` | preload 抛错 / 路径错 / 未重启 | 给 preload 加日志，改完重启应用 |
| `ERR_REQUIRE_ESM` / `exports is not defined` | 主进程 ESM 与 CJS 混用 | 主进程 `"type": "module"` 时要配 ESM 构建；**sandbox 下 preload 必须是 CJS** |
| `NODE_MODULE_VERSION xxx` 不匹配 | 原生模块未按 Electron ABI 重编译 | `npx electron-rebuild -f -w <模块名>` |
| 窗口打开是空白 | `loadFile` 相对路径错 / 渲染进程报错 | 打开 DevTools 看控制台；确认 `ready-to-show` 时机 |
| 打包后图标/资源 404 | 使用了 `__dirname` 之外的相对路径 | 用 `app.isPackaged` 分支或 `process.resourcesPath` |

## 七、关于 ESM 的现实建议

Electron 较新版本支持 ESM 主进程，但工程上仍有坑：

| 位置 | 推荐模块格式 | 原因 |
| --- | --- | --- |
| 主进程 | CJS 或 ESM 都可 | 用 ESM 需确保构建产物 `.mjs` 或在 `package.json` 声明 `type: module` |
| preload | **CJS**（尤其开 `sandbox: true`） | 沙箱中的 preload _不支持_ ESM，用 ESM 会直接加载失败 |
| 渲染进程 | 由 Vite/Rollup 处理，写 ESM 即可 | 无需关心 |

所以最省心的组合是：**渲染进程写 ESM，preload 产物强制 CJS，主进程跟构建工具默认走**。electron-vite 已按这个约定处理，手写配置时注意 `build.rollupOptions.output.format`。

下一篇：[IPC 进程通信全解](/electron/ipc)，把 preload 暴露的这些方法真正接到主进程能力上。
