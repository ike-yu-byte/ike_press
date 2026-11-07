# 菜单、托盘与系统集成

> 第 5 站：桌面应用和网页最直观的差别，是它"住在系统里"。这一篇覆盖应用菜单、右键菜单、托盘、全局快捷键、系统通知、任务栏/Dock、单实例、文件关联、深链接与电源事件——这些能力决定了应用像不像一个"正经软件"。

## 一、应用菜单（Menu）

```ts
import { app, Menu, shell, BrowserWindow } from 'electron'

const isMac = process.platform === 'darwin'

const template: Electron.MenuItemConstructorOptions[] = [
  // macOS 第一项必须是应用名菜单，否则"关于/退出"无处安放
  ...(isMac
    ? [{
        label: app.name,
        submenu: [
          { role: 'about' as const },
          { type: 'separator' as const },
          { role: 'services' as const },
          { type: 'separator' as const },
          { role: 'hide' as const },
          { role: 'hideOthers' as const },
          { role: 'unhide' as const },
          { type: 'separator' as const },
          { role: 'quit' as const },
        ],
      }]
    : []),
  {
    label: '文件',
    submenu: [
      {
        label: '新建窗口',
        accelerator: 'CmdOrCtrl+N',
        click: () => createWindow(),
      },
      {
        label: '打开…',
        accelerator: 'CmdOrCtrl+O',
        click: (_item, win) => win?.webContents.send('menu:open'),
      },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' },
    ],
  },
  {
    label: '编辑',
    submenu: [
      { role: 'undo', label: '撤销' },
      { role: 'redo', label: '重做' },
      { type: 'separator' },
      { role: 'cut', label: '剪切' },
      { role: 'copy', label: '复制' },
      { role: 'paste', label: '粘贴' },
      { role: 'selectAll', label: '全选' },
    ],
  },
  {
    label: '视图',
    submenu: [
      { role: 'reload', label: '重新加载' },
      { role: 'toggleDevTools', label: '开发者工具' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  },
  {
    role: 'help',
    label: '帮助',
    submenu: [
      { label: '官方文档', click: () => shell.openExternal('https://www.electronjs.org/docs/latest/') },
    ],
  },
]

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
})
```

要点：

- **`role` 优先于手写逻辑**：`copy`/`paste`/`reload`/`toggleDevTools` 等由系统实现，跨平台行为一致，还能自动带上快捷键与本地化；
- **`accelerator` 是应用级快捷键**，只在应用聚焦时生效；系统级见第五节 `globalShortcut`；
- **菜单点击时拿到的 `win` 可能是 `null`**（应用没有聚焦窗口），要做空判；
- 想在菜单里操作页面，用 `win.webContents.send('menu:xxx')`，让渲染进程决定行为（比如弹确认框），避免菜单回调里直接改业务状态；
- 隐藏菜单栏：`win.setMenuBarVisibility(false)` 或窗口选项 `autoHideMenuBar: true`（Alt 仍可唤出）。完全不要菜单就 `win.removeMenu()`（macOS 不支持，macOS 菜单是全局的）。

## 二、右键菜单（上下文菜单）

```ts
// 主进程里为每个 webContents 注册一次
win.webContents.on('context-menu', (_event, params) => {
  const items: Electron.MenuItemConstructorOptions[] = []

  if (params.selectionText) {
    items.push({ role: 'copy', label: '复制' })
  }
  if (params.isEditable) {
    items.push({ role: 'paste', label: '粘贴' }, { role: 'selectAll', label: '全选' })
  }
  if (params.linkURL) {
    items.push({
      label: '在浏览器中打开链接',
      click: () => shell.openExternal(params.linkURL),
    })
  }
  if (items.length) Menu.buildFromTemplate(items).popup({ window: win })
})
```

参数里常用的字段：`isEditable`（是否输入框）、`selectionText`、`linkURL`、`srcURL`（图片/媒体地址）、`misspelledWord`（拼写建议）、`x/y`（可用于定位）。

## 三、托盘（Tray）

```ts
import { app, Tray, Menu, nativeImage } from 'electron'

let tray: Tray | null = null

function createTray() {
  // macOS 建议用 16x16 的 template 图（命名 xxTemplate.png），会自动适配深浅色
  const icon = nativeImage.createFromPath(join(__dirname, '../../resources/tray.png'))
  icon.setTemplateImage(process.platform === 'darwin')

  tray = new Tray(icon)
  tray.setToolTip('My App')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示主窗口', click: () => showMainWindow() },
    { type: 'separator' },
    { label: '退出', click: () => { isQuitting = true; app.quit() } },
  ]))

  tray.on('click', () => showMainWindow()) // Windows 左键点击；macOS 上一般不绑定
}

app.whenReady().then(createTray)
```

注意事项：

- **托盘对象必须被长期持有**（模块级变量），局部变量会被 GC 回收导致图标消失；
- **Linux 下托盘依赖桌面环境**（GNOME 需扩展，AppIndicator 兼容性不一），要在目标发行版实测；
- 托盘菜单里记得提供"退出"——托盘驻留的应用若没有退出入口，用户只能杀进程；
- 退出流程：先 `isQuitting = true` 再 `app.quit()`，否则 `close` 拦截会把它变回隐藏。

## 四、系统通知

```ts
import { Notification } from 'electron'

function notify(title: string, body: string) {
  if (!Notification.isSupported()) return
  const n = new Notification({ title, body, silent: false })
  n.on('click', () => showMainWindow())
  n.show()
}
```

- **Windows** 上必须设置 `app.setAppUserModelId('com.example.app')`，否则通知不显示或归属错误；开发模式下未签名的应用也可能不弹，属正常现象；
- **macOS** 需要应用有图标（打包后正常），开发时偶尔不显示是系统节流；
- **Linux** 依赖通知守护进程（`libnotify`）；
- 频繁通知会被系统合并/限流，业务上不要用来刷进度。

## 五、全局快捷键

```ts
import { app, globalShortcut } from 'electron'

app.whenReady().then(() => {
  const ok = globalShortcut.register('CommandOrControl+Shift+Space', () => {
    toggleMainWindow()
  })
  if (!ok) console.warn('快捷键被其他程序占用')
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll() // 必须注销，否则退出后仍占着按键
})
```

| 类型 | 生效范围 | 用途 |
| --- | --- | --- |
| `Menu` 的 `accelerator` | 应用聚焦时 | 常规功能快捷键 |
| `globalShortcut` | 系统全局，即使应用在后台 | 唤起窗口、截图、录音 |

`globalShortcut` 有两个现实问题：**按键冲突无法检测**（`register` 返回 `false` 只说明失败，不告诉你被谁占用）；**用户体验敏感**，注册常用组合会被用户投诉，建议做成可配置项。

## 六、任务栏与 Dock

```ts
// 任务栏进度（Windows / Linux / macOS Dock 都支持）
win.setProgressBar(0.5)
win.setProgressBar(-1) // 移除
win.setProgressBar(2) // 不确定状态（indeterminate）

// macOS Dock
app.dock?.setBadge('3') // 需要 macOS 的 badge 权限，无权限时静默失败
app.dock?.bounce('informational') // 跳动提醒
app.dock?.setMenu(Menu.buildFromTemplate([{ label: '新建文档', click: () => {} }]))

// Windows 任务栏缩略图按钮
win.setThumbarButtons([
  {
    tooltip: '播放/暂停',
    icon: nativeImage.createFromPath(join(__dirname, '../../resources/play.png')),
    click: () => win.webContents.send('player:toggle'),
  },
])
```

## 七、单实例锁（几乎所有应用都需要）

```ts
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit() // 第二个实例直接退出
} else {
  app.on('second-instance', (_event, argv, workingDirectory) => {
    // 用户重复双击图标 / 通过文件打开时，聚焦已有窗口
    const win = getMainWindow()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
    const filePath = parseFileArg(argv, workingDirectory)
    if (filePath) win?.webContents.send('file:open', filePath)
  })
  app.whenReady().then(createWindow)
}
```

> 这段代码必须放在**主进程入口最顶层**，早于任何窗口创建。开发时多个 dev 实例会互相踢掉，可以通过 `--user-data-dir` 区分调试实例。

## 八、文件关联与深链接

**macOS**：在 `Info.plist`（electron-builder 的 `mac.extendInfo` 或 Forge 配置）声明 `CFBundleDocumentTypes` / `CFBundleURLTypes`，然后监听：

```ts
app.on('open-file', (event, path) => {
  event.preventDefault() // 必须，否则系统会重复处理
  openDocument(path)
})

app.on('open-url', (event, url) => {
  event.preventDefault()
  handleDeepLink(url) // myapp://doc/123
})
```

**Windows / Linux**：文件路径和 URL 通过 `process.argv` 传入（第二个实例还能从 `second-instance` 的 `argv` 拿）。

```ts
// 注册自定义协议（打包后才有意义）
if (process.defaultApp) {
  // 开发模式：electron . 的路径需要一起注册
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('myapp', process.execPath, [resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('myapp')
}
```

```ts
function parseFileArg(argv: string[], cwd: string) {
  // argv 里既有 Electron 自己的参数，也有 open 传入的路径，需要过滤
  const args = argv.slice(1)
  const candidate = args.find((a) => !a.startsWith('-') && !a.endsWith('.asar') && a !== '.')
  return candidate ? resolve(cwd, candidate) : undefined
}
```

深链接的安全底线：**URL 来自系统，等同外部输入**。`handleDeepLink` 里只允许白名单动作（打开文档、切页面），不要把 URL 拼进 `shell.openPath` 或直接 `loadURL`。

## 九、开机自启

```ts
app.setLoginItemSettings({
  openAtLogin: true,
  openAsHidden: true, // macOS：启动时不显示窗口
  // Windows 可加 args: ['--hidden']
})
```

- macOS 13+ 的"登录项"由系统设置管理，用户在系统设置里关掉后，你的 `openAtLogin: true` 也不再生效（读 `app.getLoginItemSettings().openAtLogin` 会返回真实状态）；
- Windows 上如果主程序路径变化（更新后安装目录变了），需要重新设置。

## 十、系统对话框与 shell

```ts
import { dialog, shell } from 'electron'

// 打开文件
const { canceled, filePaths } = await dialog.showOpenDialog(win!, {
  title: '选择配置文件',
  properties: ['openFile', 'multiSelections'],
  filters: [{ name: 'JSON', extensions: ['json'] }],
})
if (!canceled) console.log(filePaths)

// 保存文件
const { filePath } = await dialog.showSaveDialog(win!, { defaultPath: 'report.xlsx' })

// 消息框（返回用户点了哪个按钮）
const { response } = await dialog.showMessageBox(win!, {
  type: 'warning',
  buttons: ['取消', '仍然删除'],
  defaultId: 0,
  cancelId: 0,
  message: '确定要删除这个项目吗？',
  detail: '删除后无法恢复。',
})

// 用系统默认程序打开路径 / 在文件管理器里定位
await shell.openPath('/Users/me/Downloads')
shell.showItemInFolder('/Users/me/Downloads/a.zip')

// 打开外部链接：先校验协议，防命令注入类风险
function openExternal(url: string) {
  if (/^https?:\/\//.test(url)) shell.openExternal(url)
}
```

## 十一、剪贴板与拖拽

```ts
import { clipboard } from 'electron'

clipboard.writeText('hello')
clipboard.readText()
clipboard.writeImage(nativeImage.createFromPath('/tmp/a.png'))
```

**文件拖入**（重要变更）：渲染进程里 `File.path` 已被移除（较新版本），必须用 `webUtils.getPathForFile`：

```ts
// preload
import { webUtils } from 'electron'

contextBridge.exposeInMainWorld('api', {
  pathOf: (file: File) => webUtils.getPathForFile(file), // File 对象在校验后返回真实路径
})
```

```ts
// 页面
dropZone.addEventListener('drop', (e) => {
  e.preventDefault()
  const files = Array.from(e.dataTransfer?.files ?? [])
  const paths = files.map((f) => window.api.pathOf(f))
})
```

> 注意 `webUtils` 只能在 `preload`/主进程使用；不要把 `File` 对象直接通过 IPC 传给主进程（不可克隆）。

## 十二、电源与系统事件

```ts
import { powerMonitor } from 'electron'

powerMonitor.on('suspend', () => pauseSync())
powerMonitor.on('resume', () => resumeSync())
powerMonitor.on('on-ac', () => setPowerMode('ac'))
powerMonitor.on('on-battery', () => setPowerMode('battery'))
powerMonitor.on('lock-screen', () => hideSensitiveInfo())
powerMonitor.on('unlock-screen', () => showMainWindow())
```

适合场景：同步任务在休眠时暂停、演示类应用锁屏时隐藏内容、笔记本切电池时降频。

## 十三、自定义协议提供静态资源（替代 file://）

```ts
import { app, protocol, net } from 'electron'
import { pathToFileURL } from 'node:url'

// 必须在 app.ready 之前声明为特权协议
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
])

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const url = new URL(request.url)
    const filePath = join(__dirname, '../renderer', url.pathname)
    return net.fetch(pathToFileURL(filePath).toString()) // 自动处理 MIME 与 Range
  })
})
```

好处：页面 URL 变成 `app://index.html` 这样的"标准源"，`fetch`、CSP、`localStorage`、`serviceWorker` 行为都更像普通网站；比 `file://` 更安全也更可控（可以拦截非法路径）。

下一篇：[安全加固清单](/electron/security)。
