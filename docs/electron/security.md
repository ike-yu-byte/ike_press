# 安全加固清单

> 第 6 站：Electron 的安全事故几乎都长一个样——页面被注入了一段脚本，而这段脚本能直接调用 `require('child_process')`。这一篇按"威胁 → 默认值 → 逐项加固 → 上线检查"的顺序，把攻击面收窄到最小。

## 一、威胁模型：攻击者从哪进来

| 入口 | 例子 | 后果 |
| --- | --- | --- |
| 加载远程内容 | 应用里内嵌第三方网页、广告、用户自定义首页 | 远端 JS 获得你的 preload 能力 |
| XSS / 恶意 Markdown | 用户输入的富文本、聊天消息、AI 返回的 HTML | 注入脚本调用暴露的 API |
| 供应链 | 依赖包被投毒、`postinstall` 脚本 | 构建期/运行期任意代码执行 |
| 本地文件 | 用户打开的 HTML/PDF/图片里带恶意载荷 | 通过自定义协议或 `file://` 逃逸 |
| 深链接 / 命令行参数 | `myapp://...`、拖拽文件 | 参数注入到 `shell`/`exec` |
| 更新通道 | 未签名的自动更新包 | 直接替换应用二进制 |

核心认知：**渲染进程是"不可信前端"，preload 暴露的每个方法都是一个新的 API 端点**。用后端的思路做桌面安全，基本不会错。

## 二、基线配置（三行决定 80% 的安全）

```ts
new BrowserWindow({
  webPreferences: {
    nodeIntegration: false, // 页面里没有 require / process / Buffer
    contextIsolation: true, // preload 与页面隔离在不同 V8 上下文
    sandbox: true, // 渲染进程与 preload 都在 OS 级沙箱内
  },
})
```

| 选项 | 默认值 | 关掉会怎样 |
| --- | --- | --- |
| `nodeIntegration: true` | `false` | 页面任何一段脚本都能 `require('child_process').exec()`，等于把机器交出去 |
| `contextIsolation: false` | `true` | 页面能改写 preload 里的 `ipcRenderer`，绕过白名单 |
| `sandbox: false` | `true` | preload 获得完整 Node 能力，一旦 preload 有漏洞即可提权 |

> 老教程里 `nodeIntegration: true` 的写法是 2018 年之前的风格，**不要照抄**。如果某个库（老版 jQuery 插件、旧的 Electron 专用库）依赖 Node，正解是把它移到主进程或改用 preload 提供等效能力。

## 三、preload：最小暴露面

```ts
// ✅ 固定语义、固定参数的方法
contextBridge.exposeInMainWorld('api', {
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  openDocs: () => ipcRenderer.invoke('shell:open-docs'),
  onUpdate: (cb: (p: { percent: number }) => void) => {
    const h = (_e: unknown, p: { percent: number }) => cb(p)
    ipcRenderer.on('update:progress', h)
    return () => ipcRenderer.removeListener('update:progress', h)
  },
})
```

```ts
// ❌ 以下几种都是"把枪递出去"
contextBridge.exposeInMainWorld('api', {
  ipcRenderer, // 页面可监听/调用任意通道
  require, // 直接给 Node
  exec: (cmd: string) => execSync(cmd), // 任意命令执行
  readAny: (p: string) => readFileSync(p), // 任意文件读取
})
```

三条规则：

1. **不要暴露对象，只暴露函数**（尤其是 `ipcRenderer`、`shell`、`fs`、`child_process`）；
2. **参数在白名单内**，不要接受页面传来的任意路径 / 任意 URL / 任意命令；
3. **主进程再校验一次**（preload 被篡改时主进程是最后防线）。

## 四、主进程侧校验

```ts
import { ipcMain, app } from 'electron'
import { resolve, relative, isAbsolute } from 'node:path'

function assertTrusted(event: Electron.IpcMainInvokeEvent) {
  const frameUrl = event.senderFrame?.url ?? ''
  const allowedPrefix = app.isPackaged ? 'app://' : 'http://localhost:5173'
  if (!frameUrl.startsWith(allowedPrefix)) throw new Error('untrusted sender')
}

ipcMain.handle('file:read', (event, rawPath: unknown) => {
  assertTrusted(event)
  if (typeof rawPath !== 'string' || rawPath.length > 512) throw new Error('bad param')

  const root = app.getPath('userData')
  const full = resolve(root, rawPath)
  // 防止 ../ 穿越到 userData 之外
  if (relative(root, full).startsWith('..') || isAbsolute(relative(root, full))) {
    throw new Error('path escape')
  }
  return readFile(full, 'utf8')
})
```

检查清单：

- 每个 `ipcMain.handle/on` 都做 sender 校验（可封装成装饰器/高阶函数）；
- 每个入参都过 schema 校验（`zod`/`valibot`）；
- 所有路径操作都用 `path.resolve` + `relative` 校验，禁止把用户字符串直接拼进命令；
- **禁止 `shell.openExternal` 接受任意字符串**，只放行 `http/https`（`file://`、`javascript:`、`smb://` 都可能触发危险行为）。

## 五、CSP：第二道防线

生产环境通过响应头下发（比 `<meta>` 更强，且能覆盖所有资源）：

```ts
import { session } from 'electron'

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'", // 用 CSS-in-JS 才需要放宽
            "img-src 'self' data: blob:",
            "font-src 'self' data:",
            "connect-src 'self' https://api.example.com",
            "object-src 'none'",
            "base-uri 'none'",
            "frame-ancestors 'none'",
          ].join('; '),
        ],
      },
    })
  })
})
```

| 指令 | 作用 | 常见错误 |
| --- | --- | --- |
| `script-src 'self'` | 禁止内联/远程脚本 | 图省事写 `'unsafe-inline' 'unsafe-eval'`，等于没有 CSP |
| `connect-src` | 限制可请求的接口域 | 上线才发现接口全被拦，记得把业务域名都列上 |
| `object-src 'none'` | 禁止 `<object>/<embed>` | 插件类攻击面 |
| `frame-ancestors 'none'` | 禁止被嵌入 | 防点击劫持 |

开发模式下 Vite 的 HMR 需要 `'unsafe-eval'` 与 ws 连接，所以要**区分 dev/prod 两套 CSP**，不要为了图方便把宽松策略带进生产。

## 六、导航与新窗口：把"浏览器"关掉

```ts
// 1. 禁止页面导航到外部地址（防止被诱导跳走，或跳到钓鱼页）
win.webContents.on('will-navigate', (event, url) => {
  const allowed = app.isPackaged ? 'app://' : 'http://localhost:5173'
  if (!url.startsWith(allowed)) {
    event.preventDefault()
    if (/^https?:/.test(url)) shell.openExternal(url)
  }
})

// 2. 禁止 window.open / target=_blank 创建新窗口
win.webContents.setWindowOpenHandler(({ url }) => {
  if (/^https?:/.test(url)) shell.openExternal(url)
  return { action: 'deny' }
})

// 3. 禁止 webview（除非确实需要，且要自行加固）
app.on('web-contents-created', (_e, contents) => {
  contents.on('will-attach-webview', (event) => event.preventDefault())
})
```

## 七、权限请求：默认全拒

```ts
session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
  const url = webContents.getURL()
  // 只允许自家页面，且只放行确实需要的权限
  const allowed = url.startsWith('app://') || url.startsWith('http://localhost:5173')
  const needed = ['clipboard-sanitized-write', 'media'] // 按需
  callback(allowed && needed.includes(permission))
})

// 部分权限还有同步检查接口
session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'clipboard-sanitized-write')
```

常见权限：`media`（摄像头/麦克风）、`geolocation`、`notifications`、`clipboard-read`、`midi`、`pointerLock`、`fullscreen`。**默认拒绝，用到再开**。

## 八、远程内容与证书

**不要**把 `loadURL('https://任意站点')` 当应用主界面。如果业务必须嵌入远程页面：

| 措施 | 做法 |
| --- | --- |
| 独立 session | `session.fromPartition('persist:remote')` 与主 session 隔离，Cookie/缓存分开 |
| 关闭 Node | 该 `webPreferences` 下 `nodeIntegration:false`、`sandbox:true`、`preload` 只暴露只读能力 |
| 限域导航 | `will-navigate` + `setWindowOpenHandler` 白名单 |
| 禁权限 | 该 session 单独设置 permission handler |
| 不注入敏感 API | 只提供"复制文本""上报埋点"这类无害能力 |

证书错误默认会被拒绝，**不要**写"忽略证书错误"的代码：

```ts
// ❌ 这行会让中间人攻击无声通过
app.on('certificate-error', (event) => event.preventDefault())
```

如果确实是内网自签证书，正确做法是把根证书装进系统信任库，或通过 `session.setCertificateVerifyProc` 做**指纹白名单**校验。

## 九、Fuses：编译期焊死危险开关

`@electron/fuses` 可以在打包时把一些"调试用"能力永久关掉，攻击者即使拿到二进制也改不回来：

```js
// electron-builder 的 afterPack 钩子里使用
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses')

exports.default = async function afterPack(context) {
  await flipFuses(context.appOutDir + '/MyApp(.exe 后缀按平台)', {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false, // 禁止把可执行文件当 node 用
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false, // 禁止 NODE_OPTIONS 注入
    [FuseV1Options.EnableNodeCliInspectArguments]: false, // 禁止 --inspect 调试
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true, // asar 完整性校验
    [FuseV1Options.OnlyLoadAppFromAsar]: true, // 只从 asar 加载代码
  })
}
```

代价：关闭 `RunAsNode` 后，某些依赖"用 Electron 二进制跑 Node 脚本"的工具会失效（不少脚本用它做 CI 提速），要评估后再关。

## 十、依赖与构建链

- `npm audit` / `pnpm audit` 进 CI，高危依赖阻断合并；
- 升级 Electron 时同步查安全公告（Electron 会为 Chromium 漏洞打补丁）；
- 锁定 lockfile，CI 用 `npm ci`；
- 谨慎引入带 `postinstall` 的包，必要时 `npm ci --ignore-scripts` 再手动执行必要脚本；
- **`asar` 不是加密**：任何人都能 `npx asar extract app.asar out`。里面不要放密钥、许可证私钥、内部接口 token。真正需要保护的内容放服务端。

## 十一、上线前检查清单

| # | 检查项 | 通过标准 |
| --- | --- | --- |
| 1 | `nodeIntegration` | 全项目 `false`（可全局搜索确认） |
| 2 | `contextIsolation` / `sandbox` | 全项目 `true` |
| 3 | preload 暴露面 | 只有函数，无 `ipcRenderer`/`require`/`fs` |
| 4 | IPC 校验 | 每个 handler 有 sender 与参数校验 |
| 5 | 导航拦截 | `will-navigate` + `setWindowOpenHandler` 已生效 |
| 6 | CSP | 生产模式无 `unsafe-eval`，`default-src 'self'` |
| 7 | 权限 | permission handler 默认拒绝 |
| 8 | 外链 | 全部走 `shell.openExternal` 且校验协议 |
| 9 | 文件路径 | 全部 `resolve` + 越界校验 |
| 10 | 调试开关 | 生产包无 DevTools 快捷键、无 `--inspect` |
| 11 | 更新签名 | 自动更新包已签名并校验 |
| 12 | 敏感信息 | asar 内无 token/私钥 |

下一篇：[原生模块与本地能力](/electron/native-modules)。
