# API 与踩坑速查表

> 临时查东西用这一页：命令、目录、常用 API、配置片段、报错对照。详细解释回各自章节。

## 一、命令速查

```bash
# 版本与环境
npx electron --version
npx electron -v
node -v

# 开发 / 构建 / 打包（electron-vite 项目）
npm run dev
npm run build            # 只产出代码到 out/
npm run preview          # 用生产产物跑一次
npm run dist             # 出安装包
npm run dist:mac         # --mac / --win / --linux

# 原生模块
npx electron-rebuild -f -w better-sqlite3
npx electron-builder install-app-deps

# 调试
npx electron . --inspect=5858
npx electron . --inspect-brk=5858
npx electron . --enable-logging --v=1
npx electron . --disable-gpu

# 签名验证（macOS）
security find-identity -v -p codesigning
codesign -dv --verbose=4 "App.app"
spctl -a -vvv -t install "App.app"
xcrun stapler validate "App.dmg"

# 查看 asar 内容（记住：asar 不是加密）
npx asar list app.asar
npx asar extract app.asar out
```

## 二、路径速查

| 目的 | 获取方式 |
| --- | --- |
| 用户数据目录 | `app.getPath('userData')` |
| 日志目录 | `app.getPath('logs')`（先 `app.setAppLogsPath()`） |
| 下载目录 | `app.getPath('downloads')` |
| 临时目录 | `app.getPath('temp')` |
| 应用根（asar 内） | `app.getAppPath()` |
| 打包后的 resources | `process.resourcesPath` |
| 是否打包运行 | `app.isPackaged` |
| 当前构建产物目录 | `__dirname`（asar 内也可读） |

## 三、主进程 API 速查

| 需求 | API |
| --- | --- |
| 应用生命周期 | `app.whenReady()` / `app.on('activate')` / `app.on('window-all-closed')` / `app.quit()` |
| 单实例 | `app.requestSingleInstanceLock()` / `app.on('second-instance')` |
| 路径 | `app.getPath(name)` / `app.setAppLogsPath()` |
| 版本 | `app.getVersion()` / `app.getName()` |
| 开机自启 | `app.setLoginItemSettings({ openAtLogin })` |
| 协议 | `app.setAsDefaultProtocolClient(scheme)` / `app.on('open-url')` / `app.on('open-file')` |
| 窗口列表 | `BrowserWindow.getAllWindows()` / `BrowserWindow.fromWebContents(wc)` / `fromId(id)` |
| 新窗口/视图 | `new BrowserWindow(opts)` / `new WebContentsView(opts)`（替代 `BrowserView`） |
| 菜单 | `Menu.buildFromTemplate()` / `Menu.setApplicationMenu()` / `Menu.popup()` |
| 托盘 | `new Tray(nativeImage)` / `tray.setContextMenu()` |
| 全局快捷键 | `globalShortcut.register(acc, cb)` / `unregisterAll()` |
| 通知 | `new Notification({ title, body }).show()` |
| 剪贴板 | `clipboard.readText()` / `writeText()` / `writeImage()` |
| 对话框 | `dialog.showOpenDialog()` / `showSaveDialog()` / `showMessageBox()` |
| shell | `shell.openExternal(url)` / `openPath(p)` / `showItemInFolder(p)` |
| 屏幕 | `screen.getPrimaryDisplay()` / `getDisplayNearestPoint()` / `getAllDisplays()` |
| 电源 | `powerMonitor.on('suspend'/'resume'/'on-ac'/'on-battery')` |
| 子进程 | `utilityProcess.fork(path)` |
| 崩溃上报 | `crashReporter.start({ submitURL })` |
| 更新 | `electron-updater` 的 `autoUpdater.checkForUpdatesAndNotify()` |

## 四、窗口 / webContents 速查

```ts
// 状态
win.isMaximized() / isMinimized() / isFullScreen() / isDestroyed()
win.getBounds() / getContentBounds() / getNormalBounds()
win.getSize() / win.getPosition()

// 控制
win.show() / hide() / focus() / minimize() / maximize() / restore() / close() / destroy()
win.setAlwaysOnTop(flag, level)
win.setProgressBar(0.5 | -1 | 2)
win.setSkipTaskbar(true)
win.setOpacity(0.9)
win.setTitle('xxx')
win.setResizable(false)

// 渲染侧
win.loadURL(url) / loadFile(path)
win.webContents.send(channel, ...args)
win.webContents.openDevTools({ mode: 'detach' })
win.webContents.reload() / reloadIgnoringCache()
win.webContents.setWindowOpenHandler(handler)
win.webContents.setBackgroundThrottling(true)
win.webContents.capturePage()
win.webContents.printToPDF({ printBackground: true })
win.webContents.session.clearCache()

// 事件
ready-to-show / close / closed / focus / blur / resize / move / enter-full-screen
webContents: did-finish-load / did-fail-load / render-process-gone / will-navigate / context-menu
```

## 五、webPreferences 基线

```ts
webPreferences: {
  preload: join(__dirname, '../preload/index.js'),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  spellcheck: false,
  backgroundThrottling: true,
}
```

## 六、IPC 三种写法

```ts
// 1) 请求-响应
ipcMain.handle('a:read', async (_e, arg) => result)     // 主
await ipcRenderer.invoke('a:read', arg)                 // 渲染（经 preload 包装）

// 2) 主 → 渲染推送
win.webContents.send('a:progress', data)                // 主
ipcRenderer.on('a:progress', (_e, data) => {})          // preload 内包装
ipcRenderer.removeListener('a:progress', handler)       // 必须清理

// 3) 端口（流/大块数据）
const { port1, port2 } = new MessageChannelMain()
win.webContents.postMessage('a:port', null, [port2])
port1.postMessage(chunk)                                // 渲染侧 event.ports[0]
```

## 七、electron-builder 最小配置

```yaml
appId: com.example.myapp
productName: MyApp
directories:
  output: release
  buildResources: build
files: ['out/**/*', 'package.json', '!**/*.map']
asar: true
asarUnpack: ['**/*.node']
mac:
  target: [{ target: dmg, arch: [arm64, x64] }, { target: zip, arch: [arm64, x64] }]
  hardenedRuntime: true
  notarize: true
  entitlements: build/entitlements.mac.plist
win:
  target: [{ target: nsis, arch: [x64, arm64] }]
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
linux:
  target: [AppImage, deb]
publish:
  provider: generic
  url: https://dl.example.com/myapp/${os}/${arch}/
```

## 八、报错 → 原因 → 解法

| 报错 / 现象 | 原因 | 解法 |
| --- | --- | --- |
| `require is not defined` | 页面里直接用了 Node API | preload + `contextBridge` 暴露函数 |
| `window.api is undefined` | preload 路径错 / 抛错 / 未重启 | 检查 `webPreferences.preload`，给 preload 加日志 |
| `Unable to load preload script` | 产物是 ESM 或路径不存在 | sandbox 下 preload 用 CJS，路径基于 `__dirname` |
| `Attempted to register a second handler` | 热重载重复 `handle` | 先 `ipcMain.removeHandler(ch)` |
| `An object could not be cloned` | 传了函数 / 类实例 / DOM | 传纯数据，类实例转 DTO |
| `NODE_MODULE_VERSION` 不匹配 | 原生模块 ABI 不对 | `electron-builder install-app-deps` |
| `Cannot find module 'xxx.node'` | 原生模块在 asar 内 | `asarUnpack: ["**/*.node"]` |
| `ERR_REQUIRE_ESM` | 主进程 CJS 里 `require` 了 ESM 包 | 改为动态 `await import()` 或换 CJS 版本 |
| 打包后白屏 | 生产路径与 dev 不同 / 报错 | 开 DevTools；检查 `loadFile` 与 `out` 结构 |
| 打包后图标/资源缺失 | 用了 `app.getAppPath()` 相对路径 | `app.isPackaged` + `process.resourcesPath` |
| macOS「App 已损坏」 | 未公证或未 staple | 签名 + `notarize: true` + `stapler validate` |
| Windows SmartScreen 警告 | 未签名 / 新证书无信誉 | 代码签名（EV 或 Trusted Signing） |
| 自动更新不触发 | `latest.yml` 未上传 / 版本未变 / 未签名 | 检查发布目录、`app.getVersion()`、签名 |
| `File.path` 是 undefined | 新版移除了该属性 | `webUtils.getPathForFile(file)`（preload 内） |
| `BrowserView` 类型错误 | 已废弃 | 改用 `WebContentsView` |
| 通知不弹（Windows） | 缺 AppUserModelId / 未签名 | `app.setAppUserModelId('com.example.app')` |
| 托盘图标消失 | Tray 局部变量被 GC | 提升为模块级变量 |
| 拖动区按钮点不到 | 父级 `-webkit-app-region: drag` | 子元素 `-webkit-app-region: no-drag` |
| 主进程卡顿导致全应用卡 | 同步 IO / 大循环 | 异步化或移入 `utilityProcess` |
| 二次启动重复开窗 | 未加单实例锁 | `requestSingleInstanceLock()` |

## 九、上线前 10 秒自检

```text
[ ] nodeIntegration=false  contextIsolation=true  sandbox=true
[ ] preload 只暴露函数，不暴露 ipcRenderer/shell/fs
[ ] 每个 IPC handler 校验 sender + 参数
[ ] will-navigate / setWindowOpenHandler 已拦截
[ ] 生产 CSP 无 unsafe-eval
[ ] 外链只允许 http/https
[ ] 用户数据写 userData，不写安装目录
[ ] 原生模块已 rebuild 且 asarUnpack
[ ] 自动更新包已签名，latest.yml 已上传
[ ] 生产包无 DevTools 快捷键、无 --inspect
```
