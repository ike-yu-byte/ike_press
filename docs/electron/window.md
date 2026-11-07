# 窗口与视图管理

> 第 4 站：窗口是桌面应用的门面。这一篇覆盖 `BrowserWindow` 的每个关键选项、多窗口的组织方式、无边框与自定义标题栏的实现细节，以及新版 `WebContentsView` 相比 `BrowserView` 的变化。

## 一、创建窗口：推荐的配置模板

```ts
import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'

function createMainWindow() {
  // 按主显示器工作区居中，而不是写死坐标
  const { workAreaSize } = screen.getPrimaryDisplay()

  const win = new BrowserWindow({
    width: Math.min(1280, workAreaSize.width - 80),
    height: Math.min(820, workAreaSize.height - 80),
    minWidth: 900,
    minHeight: 600,
    center: true,
    title: 'My App',
    backgroundColor: '#ffffff', // 首帧背景，避免黑闪
    show: false, // 等 ready-to-show 再显示
    autoHideMenuBar: process.platform !== 'darwin',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true, // 默认 true，显式写出
      nodeIntegration: false, // 默认 false
      sandbox: true, // 默认 true
      spellcheck: false, // 中文应用可关掉，省内存
      backgroundThrottling: true, // 后台窗口降频（默认开启）
    },
  })

  win.once('ready-to-show', () => win.show())
  return win
}
```

| 选项 | 建议值 | 说明 |
| --- | --- | --- |
| `show` | `false` + `ready-to-show` | 避免白屏/黑屏闪烁，提升"启动快"的主观感受 |
| `backgroundColor` | 与主题一致的色值 | 首帧未绘制前的底色，深色主题务必改成深色 |
| `minWidth` / `minHeight` | 按最窄布局设 | 防止拖到布局崩坏的尺寸 |
| `titleBarStyle` | macOS 常用 `hiddenInset` | 自绘标题栏时用，见下文 |
| `trafficLightPosition` | `{ x: 12, y: 14 }` | macOS 红绿灯位置微调 |
| `webPreferences.sandbox` | `true` | 保持默认，别为省事关掉 |
| `webPreferences.preload` | 绝对路径 | 打包后仍在 asar 内，靠 `__dirname` 定位 |

## 二、窗口状态持久化

用户希望"下次打开还是上次的大小和位置"。别自己算，用 `electron-window-state` 或几十行手写：

```ts
import { app, BrowserWindow, screen } from 'electron'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

interface WinState { width: number; height: number; x?: number; y?: number; maximized?: boolean }

const stateFile = join(app.getPath('userData'), 'window-state.json')

function loadState(): WinState {
  try {
    const s = JSON.parse(readFileSync(stateFile, 'utf8')) as WinState
    // 校验：上次关闭时所在显示器可能已拔掉
    const visible = screen.getAllDisplays().some((d) => {
      const b = d.workArea
      return s.x !== undefined && s.y !== undefined &&
        s.x >= b.x - s.width && s.y >= b.y - s.height &&
        s.x <= b.x + b.width && s.y <= b.y + b.height
    })
    return visible ? s : { width: s.width, height: s.height }
  } catch {
    return { width: 1200, height: 800 }
  }
}

function saveState(win: BrowserWindow) {
  if (win.isMinimized() || win.isFullScreen()) return
  const b = win.getNormalBounds()
  writeFileSync(stateFile, JSON.stringify({ ...b, maximized: win.isMaximized() }))
}
```

在窗口 `close` 时调用 `saveState`，创建时 `...loadState()` 并 `if (state.maximized) win.maximize()`。

## 三、多窗口的组织

```ts
// 建立"窗口注册表"，避免到处 new 造成重复窗口
const windows = new Map<string, BrowserWindow>()

export function openSingleton(key: string, create: () => BrowserWindow) {
  const existed = windows.get(key)
  if (existed && !existed.isDestroyed()) {
    existed.focus()
    return existed
  }
  const win = create()
  windows.set(key, win)
  win.on('closed', () => windows.delete(key))
  return win
}
```

常见模式：

| 模式 | 实现 | 场景 |
| --- | --- | --- |
| 主窗口 + 设置窗口 | 主窗口 `parent` 指向设置窗口？不，反过来：设置窗口 `parent: mainWindow, modal: true` | 设置、关于、确认框 |
| 每个文档一个窗口 | 用 `Map<docId, BrowserWindow>`，关闭时清理 | 编辑器类应用 |
| 单窗口多页面 | 一个 `BrowserWindow` + 前端路由 | 后台工具，推荐，省内存 |
| 窗口间通信 | 走主进程转发，或 `MessageChannel` 直连 | 多窗口联动 |

窗口间通信最稳的做法仍是"主进程当路由器"：

```ts
// 窗口 A 修改了数据 → 主进程广播给其他窗口
ipcMain.handle('doc:update', (_e, payload) => {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('doc:changed', payload)
  }
})
```

## 四、WebContentsView：新版多视图方案

`BrowserView` 已被废弃，替代者是 `WebContentsView`（配合 `BaseWindow` 或作为 `BrowserWindow` 的子视图）。

```ts
import { BaseWindow, WebContentsView } from 'electron'

const win = new BaseWindow({ width: 1200, height: 800 })

const sidebar = new WebContentsView({
  webPreferences: { preload: join(__dirname, 'preload.js') },
})
const content = new WebContentsView({
  webPreferences: { preload: join(__dirname, 'preload.js') },
})

win.contentView.addChildView(sidebar)
win.contentView.addChildView(content)

// 手动布局：没有 CSS，视图位置全部由你算
function layout() {
  const { width, height } = win.getContentBounds()
  sidebar.setBounds({ x: 0, y: 0, width: 260, height })
  content.setBounds({ x: 260, y: 0, width: width - 260, height })
}
win.on('resize', layout)
layout()

sidebar.webContents.loadURL('app://sidebar')
content.webContents.loadURL('app://content')
```

| 对比 | `BrowserView`（旧） | `WebContentsView`（新） |
| --- | --- | --- |
| 状态 | 已废弃，仅兼容 | 推荐使用 |
| 与窗口关系 | 附属于 `BrowserWindow` | 是视图树节点，可嵌套、可叠放 |
| 布局 | `setBounds` | `setBounds`，父视图变化需自行计算 |
| 透明度/圆角 | 支持有限 | 更灵活（配合 CSS 与 `transparent`） |

**什么时候需要多视图？** 需要"主界面 + 独立侧栏/浮层，且各自是独立页面上下文"时（例如浏览器标签页、IDE 的多面板）。普通业务用前端路由 + CSS 布局即可，别过度设计。

## 五、无边框窗口与自定义标题栏

以 macOS 的 `hiddenInset` 为例（保留红绿灯，内容延伸到标题栏）：

```ts
const win = new BrowserWindow({
  titleBarStyle: 'hiddenInset',
  trafficLightPosition: { x: 14, y: 16 },
  // Windows / Linux 上想要"原生控件 + 自绘背景"：
  // titleBarStyle: 'hidden',
  // titleBarOverlay: { color: '#ffffff', symbolColor: '#333', height: 40 },
  webPreferences: { preload: join(__dirname, '../preload/index.js') },
})
```

页面侧：

```css
/* 可拖动区域：整个标题栏高度 */
.titlebar {
  height: 40px;
  -webkit-app-region: drag; /* 关键：让系统接管拖动 */
  display: flex;
  align-items: center;
}

/* 拖动区里的按钮必须"解 drag"，否则点不到 */
.titlebar button {
  -webkit-app-region: no-drag;
}

/* macOS 红绿灯占位，避免内容被遮挡 */
.platform-darwin .titlebar {
  padding-left: 80px;
}
```

要点：

- `-webkit-app-region: drag` 会**吞掉**该区域内的鼠标事件，按钮/输入框必须 `no-drag`；
- 拖动区内无法选中文字，这是系统行为；
- Windows 的 `titleBarOverlay` 由 Electron 绘制系统按钮，颜色要跟你的主题同步（`win.setTitleBarOverlay()`）；
- 双击拖动区最大化需要自己实现（`titleBarStyle: 'hidden'` 时系统不自动处理）：

```ts
document.querySelector('.titlebar')?.addEventListener('dblclick', () => window.api.toggleMaximize())
```

## 六、窗口与屏幕

```ts
import { screen } from 'electron'

// 监听显示器变化（外接屏拔插、分辨率调整）
screen.on('display-added', () => relayout())
screen.on('display-removed', () => relayout())
screen.on('display-metrics-changed', () => relayout())

// 光标当前所在显示器
const point = screen.getCursorScreenPoint()
const display = screen.getDisplayNearestPoint(point)
```

多显示器坑：**窗口坐标可能是负数**（副屏在主屏左侧），任何"x > 0 才算有效位置"的校验都会把窗口丢到不可见区域。

## 七、常用窗口操作

```ts
win.minimize()
win.maximize() / win.unmaximize()
win.setFullScreen(true)
win.setAlwaysOnTop(true, 'floating') // 置顶（macOS 的 level 有差异）
win.setOpacity(0.95)
win.setResizable(false)
win.flashFrame(true) // 任务栏闪烁提醒（Windows/Linux）
win.setProgressBar(0.4) // 任务栏进度（-1 取消，>1 表示不确定态）
win.setSkipTaskbar(false) // 是否隐藏任务栏图标
```

截图与打印（不需要额外依赖）：

```ts
const image = await win.webContents.capturePage() // 返回 NativeImage
await writeFile(join(app.getPath('pictures'), 'shot.png'), image.toPNG())

// 导出 PDF：适合报表、发票
const pdf = await win.webContents.printToPDF({ printBackground: true, pageSize: 'A4' })
await writeFile('/tmp/report.pdf', pdf)
```

## 八、隐藏窗口 / 托盘驻留

```ts
// 关闭时最小化到托盘，而不是退出
win.on('close', (event) => {
  if (!isQuitting) {
    event.preventDefault()
    win.hide()
  }
})

app.on('before-quit', () => {
  isQuitting = true // 真正退出时放行
})
```

注意：隐藏窗口**不会释放内存**。长期隐藏的大量窗口仍然占用渲染进程，必要时用 `win.webContents.destroy()` 或直接 `win.destroy()` 并重建。

## 九、高频坑

| 现象 | 原因 | 解法 |
| --- | --- | --- |
| 窗口白屏 | `ready-to-show` 前就显示，或渲染进程报错 | 打开 DevTools；`show:false` + `ready-to-show` |
| 首帧黑闪 | `backgroundColor` 与主题不一致 | 设置与页面底色相同的 `backgroundColor` |
| 自绘标题栏点不动按钮 | 父元素 `-webkit-app-region: drag` | 按钮加 `no-drag` |
| 窗口跑到屏幕外 | 保存了失效坐标 | 用 `screen.getDisplayNearestPoint` 校验并回落到居中 |
| 关闭窗口后仍在后台 | 托盘驻留逻辑，或监听器未清理 | 明确"关闭=隐藏"的产品语义；`will-quit` 清理 |
| `win` 已销毁仍被调用 | 异步回调里持有旧引用 | 每次使用前 `if (win.isDestroyed()) return` |
| 多窗口内存暴涨 | 每窗口一个渲染进程 | 合并为单窗口多路由，或复用 `WebContentsView` |
| 打包后 preload 找不到 | 相对路径在 asar 内失效 | 用 `join(__dirname, ...)`，不要用 `app.getAppPath()` 拼相对路径 |

下一篇：[菜单、托盘与系统集成](/electron/system-integration)。
