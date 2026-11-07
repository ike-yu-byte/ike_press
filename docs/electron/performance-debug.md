# 性能优化与调试排错

> 第 9 站：Electron 的"慢"和"卡"有明确来源——启动链路长、主进程单线程、每个窗口一个渲染进程。这一篇给出可量化的优化手段和一套调试路径，最后附一张"现象 → 原因 → 解法"的对照表。

## 一、启动耗时：拆开看才知道优化哪

```
[系统启动进程] → [主进程 JS 求值] → [app ready] → [创建窗口] → [页面首帧] → [数据就绪]
      ①                ②               ③            ④            ⑤           ⑥
```

| 阶段 | 常见耗时 | 主要成本 | 优化手段 |
| --- | --- | --- | --- |
| ① 进程启动 | 100~400ms | Electron 二进制加载、asar 解包 | 减少体积、关闭不必要开关、避免巨型 asar |
| ② 主进程求值 | 50~500ms | 顶层 `require` 了大量模块 | 懒加载（函数内 `require`）、拆分入口 |
| ③ `app ready` | 由系统决定 | Chromium 初始化 | 无法优化，但可以把初始化并行到 `ready` 前（仅限不依赖 app 的模块加载） |
| ④ 创建窗口 | 50~200ms | 渲染进程拉起 | 隐藏窗口预创建（需要时再 show）、避免一次性创建多个窗口 |
| ⑤ 页面首帧 | 200~1500ms | JS 体积、框架初始化 | 骨架屏、代码分割、`ready-to-show` 后再 show |
| ⑥ 数据就绪 | 不定 | IPC、SQLite、网络 | 先渲染骨架、并行请求、缓存上次结果 |

### 可测量的打点

```ts
// 主进程
const t0 = performance.now()
app.whenReady().then(() => {
  console.log('ready 耗时', performance.now() - t0)
})

win.once('ready-to-show', () => {
  console.log('首帧耗时', performance.now() - t0)
})

win.webContents.on('did-finish-load', () => {
  console.log('加载完成', performance.now() - t0)
})
```

```ts
// 页面侧：用 Performance API 看真实首屏
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(entry.name, entry.startTime.toFixed(0))
  }
}).observe({ type: 'paint', buffered: true }) // first-paint / first-contentful-paint
```

### 针对性优化

| 问题 | 做法 |
| --- | --- |
| 主进程入口加载慢 | 把 `require('better-sqlite3')`、`require('sharp')` 等重模块挪到首次使用时 |
| 首帧白屏久 | `show: false` + 骨架屏；HTML 里先放静态骨架，等框架挂载后替换 |
| 窗口出现闪白 | `backgroundColor` 与页面底色一致；深色主题别用默认白 |
| 多窗口同时开 | 只预创建主窗口；副窗口按需创建（创建成本 100ms+） |
| 冷启动读大量配置 | 配置文件异步加载，先渲染默认值 |

## 二、内存：泄漏点几乎都在"没清理"

```ts
// 主进程内存概览
const info = await process.getProcessMemoryInfo()
console.log(info) // { private, shared, resident }

// 渲染进程内存（DevTools → Memory，或 performance.memory）
```

| 泄漏源 | 表现 | 处理 |
| --- | --- | --- |
| `ipcRenderer.on` 未移除 | 每次页面切换监听器 +1，回调重复执行 | 订阅 API 返回 `unsubscribe`，组件卸载时调用 |
| `webContents` 引用了窗口 | 窗口关闭后进程内存不释放 | `closed` 时清空 Map 引用；避免闭包长时间持有 `win` |
| 定时器/轮询未清 | 后台窗口仍在跑 | `clearInterval`，或监听 `blur` 暂停 |
| 大 Buffer / 图片缓存 | 内存线性增长 | 分块处理，处理完置 `null`；用 `nativeImage` 控制尺寸 |
| 无限日志/事件堆积 | 数组越攒越大 | 环形缓冲（固定长度）或落盘 |
| 页面反复 `new WebContentsView` | 视图未 `removeChildView` | 移除后调用 `webContents.destroy()` |

验证方法：DevTools → Memory → Heap snapshot 对比；或开一个隐藏窗口反复开关 20 次，看进程数是否回落。

## 三、主进程阻塞：最容易被忽略的卡顿源

```ts
// ❌ 这些都会卡住整个应用
readFileSync('huge.log')
JSON.parse(fs.readFileSync('50mb.json', 'utf8'))
for (let i = 0; i < 1e8; i++) {} // 纯计算
execSync('git status')
db.prepare('SELECT * FROM big_table').all() // 大表全量查询
```

诊断：加一段"主进程心跳"日志，如果卡顿期间心跳不再打印，就是主进程被阻塞了。

```ts
setInterval(() => console.log('[heartbeat]', Date.now()), 1000)
```

解决方案优先级：

1. 换异步 API（`fs.promises`），避免 `*Sync`；
2. 分批处理 + `await new Promise(setImmediate)` 让出事件循环；
3. 重活移到 `utilityProcess` / `worker_threads`（见 [原生模块](/electron/native-modules)）；
4. 数据库加索引、分页，避免全表扫描。

## 四、渲染性能

Electron 的渲染进程就是 Chromium，优化手段与 Web 完全一致：

| 问题 | 手段 |
| --- | --- |
| 首屏 JS 太大 | 路由级代码分割、按需加载重型组件 |
| 长列表卡 | 虚拟滚动（`vue-virtual-scroller` / `@tanstack/virtual`） |
| 频繁 IPC 更新 UI | 合并节流（>=30ms）、批量提交 |
| 动画掉帧 | 用 `transform/opacity`；避免主线程长任务（Performance 面板看 Long Task） |
| 后台窗口耗电 | 保持 `backgroundThrottling: true`（默认），隐藏窗口时暂停动画/轮询 |
| GPU 异常 | 排查显卡驱动；必要时 `app.disableHardwareAcceleration()`（会让动画变卡，最后手段） |

## 五、调试工具箱

### 渲染进程

- `Ctrl/Cmd + Shift + I`：DevTools 全套（Performance、Memory、Network、Application）；
- Vue/React DevTools：随 Chromium 扩展安装到开发环境即可；
- 自定义：`win.webContents.openDevTools({ mode: 'detach' })` 单独窗口打开。

### 主进程

```bash
# 命令行 inspect，然后 Chrome 打开 chrome://inspect 或 VS Code attach
npx electron . --inspect=5858

# 需要断住第一行（调试启动流程）
npx electron . --inspect-brk=5858
```

```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Main (TS)",
  "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
  "args": ["./out/main/index.js", "--inspect=5858"],
  "outFiles": ["${workspaceFolder}/out/**/*.js"],
  "sourceMaps": true
}
```

### 系统级日志

```bash
npx electron . --enable-logging --v=1     # Chromium 日志
npx electron . --disable-gpu              # 排查 GPU 相关花屏/黑屏
```

日志位置：macOS `~/Library/Logs/YourApp/`，Windows `%APPDATA%\YourApp\logs`，Linux `~/.config/YourApp/logs`（具体以 `app.getPath('logs')` 为准）。

### 性能追踪（contentTracing）

```ts
import { contentTracing } from 'electron'

await contentTracing.startRecording({
  included_categories: ['toplevel', 'v8', 'blink', 'renderer.scheduler'],
})
setTimeout(async () => {
  const file = await contentTracing.stopRecording('/tmp/trace.json')
  // 用 Chrome 打开 chrome://tracing 载入 file 分析
}, 5000)
```

## 六、崩溃排查

```ts
// 渲染进程退出（OOM、崩溃、被杀）
win.webContents.on('render-process-gone', (_e, details) => {
  log.error('renderer gone', details)
  if (details.reason === 'oom') notifyUser('内存不足，已尝试恢复')
})

// GPU / 工具进程退出
app.on('child-process-gone', (_e, details) => {
  log.error('child gone', details)
})

// 未捕获异常（主进程）
process.on('uncaughtException', (err) => log.error('uncaught', err))
```

排查顺序：先看日志里 `reason` / `exitCode`；OOM 就查内存增长点；`crashed` 且必现就检查原生模块与 GPU 驱动；偶发则开启 `crashReporter` 分析 minidump。

## 七、高频坑对照表

| 现象 | 大概率原因 | 解法 |
| --- | --- | --- |
| 打包后白屏 | `loadFile` 路径错 / 渲染进程报错 | DevTools 打开看错误；检查 `out/renderer` 路径 |
| 打包后资源 404 | 用了相对路径或 `app.getAppPath()` 拼错 | 用 `__dirname` 或 `process.resourcesPath` + `app.isPackaged` |
| 打包后 preload 失效 | preload 产物是 ESM / 路径错 | sandbox 下 preload 必须 CJS，检查路径 |
| 原生模块 `NODE_MODULE_VERSION` 不匹配 | 未 rebuild | `electron-builder install-app-deps` |
| 原生模块找不到 | 被塞进 asar | `asarUnpack: ["**/*.node"]` |
| Windows 通知不弹 | 未设 AppUserModelId / 未签名 | `app.setAppUserModelId()`；正式签名 |
| macOS 提示"已损坏" | 未公证 / 公证后未 staple | 完整签名 + `notarize: true` |
| 自动更新无提示 | `latest.yml` 没上传 / 版本号未变 / 未签名 | 检查发布目录与 `app.getVersion()` |
| 第二个实例乱开 | 未加单实例锁 | `requestSingleInstanceLock()` |
| 关闭窗口后进程残留 | 托盘驻留 / 监听器未清 | 明确退出语义；`will-quit` 清理 |
| 窗口坐标丢失 | 多显示器负坐标 / 显示器被拔 | `screen.getAllDisplays()` 校验后回落居中 |
| `File.path` 报 undefined | 新版本移除了该属性 | `webUtils.getPathForFile(file)` |
| `BrowserView` 类型报错 | 已废弃 | 迁移到 `WebContentsView` |
| 菜单/托盘图标不显示 | 托盘对象被 GC / 图标尺寸不符 | 模块级持有 Tray；macOS 用 template 图 |
| 拖动区按钮点不动 | 父级 `-webkit-app-region: drag` | 子元素 `no-drag` |
| 更新后白屏（旧缓存） | service worker / 磁盘缓存 | 更新时清理 `session.clearCache()` 或换协议版本号 |

下一篇：[API 与踩坑速查表](/electron/cheatsheet)。
