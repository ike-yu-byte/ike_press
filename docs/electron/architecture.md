# 进程模型与运行时架构

> 第 1 站：Electron 的绝大多数"诡异问题"都源于没搞清谁在哪个进程里运行。这一篇把运行时拆开看：有哪几种进程、各自能用什么、一次启动的完整时序、以及为什么主进程一卡全卡。

## 一、四种进程，四种世界

Electron 启动时不是"打开一个浏览器窗口"，而是像 Chrome 一样拉起一整套多进程架构：

```
                    ┌──────────────┐
                    │   主进程 main │  ← 你的 main.ts 在这里执行
                    └──┬───┬───┬───┘
        ┌──────────────┘   │   └──────────────┐
        ▼                  ▼                  ▼
 ┌────────────┐     ┌────────────┐     ┌──────────────────┐
 │ 渲染进程 ×N │     │ GPU 进程    │     │ utilityProcess ×N│
 │ 页面 UI     │     │ 合成/光栅   │     │ 你的重活         │
 └─────┬──────┘     └────────────┘     └──────────────────┘
       │ preload（同进程内的独立上下文）
       ▼
   隔离的 JS 上下文
```

| 进程 | 是否 Node | 是否能用 DOM | 崩了的影响 | 代码位置 |
| --- | --- | --- | --- | --- |
| 主进程 | ✅ 完整 | ❌ | 应用直接退出 | `main` 入口（`package.json` 的 `main`） |
| 渲染进程 | ❌（默认沙箱） | ✅ | 单窗口白屏，可重建 | 你的前端页面 |
| preload | ⚠️ 受限 | ⚠️ 可访问页面窗口对象，但运行在隔离上下文 | 该窗口桥接失效 | `webPreferences.preload` |
| GPU 进程 | ❌ | ❌ | 降级为软件渲染，画面卡顿 | 由 Chromium 管理 |
| utilityProcess | ✅ 完整 | ❌ | 单独退出，主进程可收到 `exit` | `utilityProcess.fork()` |

诊断时第一件事永远是确认"我现在在哪个进程"，这三个值可以直接打印：

```js
// 主进程里
console.log('type:', process.type) // 'browser'
console.log(process.versions) // { electron, chrome, node, v8, ... }

// 渲染进程里（页面控制台）
console.log(process.type) // 'renderer'
console.log(window.api) // preload 暴露的对象，没有就说明 preload 没生效

// preload 里
console.log('preload', process.type, process.contextIsolated) // 'renderer' true
```

## 二、一次启动的完整时序

```
1. 操作系统启动 electron 可执行文件
2. V8 加载主进程入口 → 执行 main.ts 顶层代码
   ⚠ 此时 app 还没 ready，不能创建窗口
3. 发出 ready → app.whenReady() 的回调执行
4. new BrowserWindow(...) → Chromium 分配渲染进程（此时 Node 不可用）
5. 渲染进程创建 window 环境 → 加载 preload → 执行 contextBridge
6. 加载 HTML → DOMContentLoaded → 页面脚本执行 → did-finish-load
7. 首次绘制完成 → ready-to-show → win.show()
```

几个常见误解：

- **`main.ts` 顶层代码早于 `ready`**：`new BrowserWindow()` 放在顶层是能运行的（Electron 做了兼容），但 `app.getPath()`、`Menu.setApplicationMenu()`、`Tray` 等会抛错或静默失败。统一放进 `whenReady()`。
- **preload 早于页面脚本**：所以 `window.api` 在页面里一定存在（除非 preload 抛错）。preload 里抛错不会让窗口打不开，只会让 `window.api` 变 `undefined`，非常隐蔽——开发时务必给 preload 加 try/catch + 日志。
- **`ready-to-show` 不保证必然触发**：如果页面在隐藏状态下没有完成首帧（例如加载失败），可能永远不触发。设置 `show: false` 时最好加兜底定时器。

## 三、生命周期：app 与窗口是两棵树

应用级事件（主进程）：

| 事件 | 时机 | 典型用途 |
| --- | --- | --- |
| `will-finish-launching` | macOS 特有，早期初始化 | 注册 `open-file` / `open-url` 监听 |
| `ready` | 初始化完成，可建窗口 | 创建主窗口、注册菜单/托盘/快捷键 |
| `activate` | macOS 点击 Dock | 无窗口时重新创建 |
| `second-instance` | 第二个实例启动（需单实例锁） | 聚焦已有窗口、处理深链接参数 |
| `before-quit` | 退出前 | 拦截未保存内容、`event.preventDefault()` |
| `will-quit` | 所有窗口关闭后 | 清理定时器、注销快捷键、flush 日志 |
| `window-all-closed` | 所有窗口关闭 | Windows/Linux 上默认退出，macOS 上通常不退出 |

窗口级事件（`BrowserWindow`）：

| 事件 | 说明 |
| --- | --- |
| `ready-to-show` | 推荐在此 `show()`，避免白屏 |
| `close` | 用户点关闭；可 `preventDefault()` 改为最小化到托盘 |
| `closed` | 已销毁，此时不要再访问窗口对象 |
| `focus` / `blur` | 窗口聚焦状态 |
| `enter-full-screen` / `leave-full-screen` | macOS 全屏状态 |
| `page-title-updated` | 标题变化 |

页面级事件（`webContents`）：

| 事件 | 说明 |
| --- | --- |
| `did-finish-load` | 页面资源加载完毕 |
| `did-fail-load` | 加载失败（含错误码，常见 `-102` 连接中断） |
| `render-process-gone` | 渲染进程崩溃/被杀，必须处理 |
| `will-navigate` | 即将导航，用于拦截外部链接 |
| `will-redirect` | 重定向 |
| `new-window`（已废弃） | 用 `setWindowOpenHandler` 代替 |

崩溃兜底写法：

```js
win.webContents.on('render-process-gone', (_event, details) => {
  console.error('渲染进程退出:', details.reason, details.exitCode)
  // reason: 'crashed' | 'oom' | 'killed' | 'clean-exit' ...
  if (details.reason !== 'clean-exit') {
    win.reload() // 或重建窗口；连续崩溃要退避，避免无限重启
  }
})
```

## 四、主进程为什么是瓶颈

Chromium 的渲染进程是并行独立的，但**主进程只有一个线程**（libuv 线程池只处理 IO 回调，不解决计算）：

```js
// ❌ 主进程里做重计算：所有窗口的 IPC、动画、菜单响应全部卡住
ipcMain.handle('parse:big-file', () => {
  return parseHugeCsv(syncReadFile(path)) // 3 秒的主进程阻塞
})

// ✅ 丢给 utilityProcess，主进程只负责转发
ipcMain.handle('parse:big-file', async (_e, path) => {
  const worker = utilityProcess.fork(path.join(__dirname, 'parser.js'))
  const result = await new Promise((resolve, reject) => {
    worker.once('message', resolve)
    worker.once('exit', (code) => code !== 0 && reject(new Error(`exit ${code}`)))
    worker.postMessage({ path })
  })
  worker.kill()
  return result
})
```

判断标准很简单：**单次耗时超过 50ms 的纯计算，就不要留在主进程**。IO 密集但体量大的操作（批量读写文件）也建议移出，避免 `fs` 回调排队延迟。

## 五、沙箱与隔离：默认就是安全的

现代 Electron 的默认值（`Electron 20+`）已经是安全基线：

| 选项 | 默认值 | 含义 |
| --- | --- | --- |
| `nodeIntegration` | `false` | 页面里没有 `require`/`process`/`Buffer` |
| `contextIsolation` | `true` | preload 与页面运行在**不同的 V8 上下文**，共享同一个 `window` 代理 |
| `sandbox` | `true` | 渲染进程和 preload 都在操作系统级沙箱中，preload 只能用有限的 Node 子集（`electron`、`events`、`timers`、`url`） |
| `webSecurity` | `true` | 同源策略照常生效 |

因此 **preload 里 `require('fs')` 在默认配置下会失败**——这不是 bug，是设计。文件操作应该在主进程完成，再通过 IPC 提供给页面。`contextIsolation` 的效果：

```js
// preload.js
window.secret = 'foo' // 页面里读不到
contextBridge.exposeInMainWorld('api', {
  getSecret: () => 'foo',
}) // 页面里只能通过 window.api 拿到白名单方法
```

如果你在页面里发现 `window.api === undefined`，排查顺序是：`webPreferences.preload` 路径是否正确（相对 `__dirname`，打包后要指向 asar 内路径）→ preload 是否抛错（看终端日志）→ 是否在 `loadURL` 之后才注入（不会，preload 永远先行）。

## 六、Electron / Chromium / Node 的关系

| 版本维度 | 影响你的什么 |
| --- | --- |
| Electron 大版本 | 决定 API 是否可用（如 `WebContentsView` 需要较新版本） |
| Chromium 版本 | 决定 CSS/JS 新特性支持（如 `:has()`、`View Transitions`）、DevTools 能力 |
| Node 版本 | 决定可用语法与内置模块（`node:test`、`fetch`、`AbortSignal.timeout`） |
| V8 版本 | 决定 JS 语言特性上限（如 `Array.fromAsync`、装饰器） |

查看当前环境：

```js
console.table(process.versions)
// 常见字段：electron / chrome / node / v8 / uv / zlib / openssl
```

版本策略建议：

1. **固定到具体大版本**（如 `"electron": "^3x"` 而非 `latest`），并在 CI 里锁定 lockfile；
2. 每次升级先跑 `npx electron --version` 与项目的冒烟用例；
3. 原生模块必须跟着 rebuild（ABI 变化），否则运行时报 `NODE_MODULE_VERSION` 不匹配。

## 七、多窗口与内存的关系

每个 `BrowserWindow`/`WebContentsView` 至少对应：一个渲染进程 + 若干内存层（JS 堆、DOM、GPU 纹理、缓存）。经验数据：

| 场景 | 粗略内存 |
| --- | --- |
| 空窗口 + 简单页面 | 80~120 MB |
| 正常业务页（含框架运行时） | 150~300 MB |
| 重型编辑器类页面 | 400 MB+ 每窗口 |

所以"多开窗口 = 多开进程"是真实成本。常见优化方向见 [性能优化与调试排错](/electron/performance-debug)：

- 用 `WebContentsView` 复用同一窗口承载多页，而不是开多个窗口；
- 后台窗口隐藏时用 `webContents.setBackgroundThrottling(true)`（默认开启）配合暂停轮询；
- 关闭窗口后清理监听器、定时器、`webContents` 引用，否则进程退出但不释放内存。

## 八、一张图记住职责边界

```
需要文件/系统/数据库？        → 主进程（或 utilityProcess）
需要 DOM/样式/框架？          → 渲染进程
需要给页面一个安全的方法？    → preload + contextBridge
需要跑 50ms 以上的计算？      → utilityProcess / worker_threads
需要窗口/菜单/托盘/更新？     → 主进程
```

下一篇：[环境、脚手架与第一个窗口](/electron/getting-started)，把这些概念落到一个真实工程骨架里。
