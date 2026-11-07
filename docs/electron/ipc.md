# IPC 进程通信全解

> 第 3 站：Electron 里 90% 的"功能做不出来"最后都归结为 IPC 没接对。这一篇把通道类型、数据序列化、错误传播、类型安全、安全校验、大文件与流式传输一次讲透，并给出可以直接抄进项目的封装。

## 一、三种通道，选错会很痛

| 通道 | 方向 | 语义 | 适用场景 | API |
| --- | --- | --- | --- | --- |
| **请求-响应** | 渲染 → 主 | Promise，一问一答 | 查询、读写文件、调用系统对话框 | `ipcRenderer.invoke` / `ipcMain.handle` |
| **单向消息** | 双向 | 发出去就不管了 | 主进程主动推送（进度、状态、日志） | `ipcRenderer.send` / `ipcMain.on`；`webContents.send` |
| **消息端口** | 双向流 | 建立后独立信道 | 大数据、持续流、双向高频通信 | `MessageChannelMain` / `MessagePort` |

选择原则：

```
需要返回值？ → invoke/handle
只是通知？   → send/on
要传流、传大 Buffer、持续推数据？ → MessagePort
```

**永远不要使用 `ipcRenderer.sendSync`**：它会同步阻塞渲染进程直到主进程返回，主进程一慢整个界面就冻结，且无法被 Promise 化。

## 二、请求-响应：invoke / handle

```ts
// 主进程
import { ipcMain } from 'electron'
import { readFile } from 'node:fs/promises'

ipcMain.handle('file:read', async (_event, filePath: string) => {
  const content = await readFile(filePath, 'utf8')
  return { content, size: content.length }
})
```

```ts
// preload
const api = {
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
}

// 页面
const { content } = await window.api.readFile('/tmp/a.txt')
```

主进程侧关键细节：

- `handle` **同一通道重复注册会抛错**（`Attempted to register a second handler`）。开发期热重启时常见，解决方式是先 `ipcMain.removeHandler('xxx')` 或在模块边界只注册一次；
- `handle` 的回调抛错 → 渲染进程的 `invoke` **Promise reject**，但错误信息会被序列化成 `Error invoking remote method 'xxx': <message>`，自定义字段（如 `code`）会丢失（见下文"错误传播"）；
- 返回值必须是**可结构化克隆**的数据（见第三节）。

## 三、序列化限制：什么能传、什么不能

Electron 的 IPC 使用 **Structured Clone Algorithm**（与 `postMessage` 同源），规则：

| 可以传 | 不可以传 |
| --- | --- |
| 原始类型、`Date`、`RegExp`、`Map`/`Set`、`ArrayBuffer`/TypedArray、普通对象/数组 | 函数、类实例（会退化成普通对象）、DOM 节点、`Error`（特殊处理）、Symbol、`Promise` |
| `Buffer`（会变成 `Uint8Array`，接收端需转换） | 循环引用的对象（部分场景可行但不推荐） |

实用写法：

```ts
// 发送二进制
ipcMain.handle('image:save', async (_e, data: Uint8Array) => {
  await writeFile('/tmp/out.png', Buffer.from(data)) // 渲染侧传 ArrayBuffer/Uint8Array
})

// 渲染侧读取本地图片再回传
const buf = await (await fetch(url)).arrayBuffer()
await window.api.saveImage(new Uint8Array(buf))
```

**类实例会丢原型**，所以 IPC 返回值请用"纯数据对象"（DTO），在两端各自映射成领域模型。这也是建议把 IPC 类型单独抽一层的原因。

## 四、错误传播：别指望 Error 原样传过去

```ts
// ❌ 渲染侧拿到的只有 message，err.code / err.details 全没了
ipcMain.handle('db:query', async () => {
  const err: any = new Error('记录不存在')
  err.code = 'NOT_FOUND'
  throw err
})
```

两种可靠做法：

**做法 1：统一返回结果对象（推荐）**

```ts
type Result<T> = { ok: true; data: T } | { ok: false; code: string; message: string }

ipcMain.handle('db:query', async (_e, sql: string): Promise<Result<Row[]>> => {
  try {
    return { ok: true, data: await db.query(sql) }
  } catch (e: any) {
    return { ok: false, code: e.code ?? 'UNKNOWN', message: e.message }
  }
})
```

页面侧 `if (!res.ok) { handleError(res.code) }`，类型可以完整推导，并且不会因为"意外异常"把错误栈泄露到 UI。

**做法 2：抛错但只依赖 message**

```ts
ipcMain.handle('x', () => {
  throw new Error(JSON.stringify({ code: 'NOT_FOUND', detail: '...' }))
})
// 渲染侧 try/catch 后 JSON.parse(err.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, ''))
```

这种做法脆弱（Electron 改了前缀就崩），只用于兜底。

## 五、主进程主动推送

```ts
// 主进程：向某个窗口推送
win.webContents.send('download:progress', { percent: 42 })

// preload：包装成事件订阅，返回取消订阅函数
const api = {
  onDownloadProgress: (cb: (p: { percent: number }) => void) => {
    const handler = (_e: unknown, payload: { percent: number }) => cb(payload)
    ipcRenderer.on('download:progress', handler)
    return () => ipcRenderer.removeListener('download:progress', handler)
  },
}

// 页面（Vue 示例）
const off = window.api.onDownloadProgress((p) => (progress.value = p.percent))
onBeforeUnmount(off) // 必须清理，否则组件卸载后监听器仍持有闭包
```

三个必须记住的点：

1. **`ipcRenderer.on` 的监听器不会自动随组件销毁**，必须显式移除，否则重复挂载会累积、并发触发；
2. **preload 里不要直接把 `ipcRenderer` 暴露给页面**（页面可以自己 `on` 任意通道，等于绕过白名单）；一定要包一层，只允许固定通道；
3. 主进程要防止向已销毁的窗口 `send`：`if (!win.isDestroyed()) win.webContents.send(...)`。

## 六、MessagePort：流与大数据的正确姿势

传一个 100MB 的 Buffer、或者持续推送日志流，用 `invoke` 会把数据整体复制一遍，内存翻倍。正确做法是建立 `MessagePort`：

```ts
// 主进程：窗口加载完成后建立端口
import { MessageChannelMain } from 'electron'

function pipeFileToRenderer(win: BrowserWindow, filePath: string) {
  const { port1, port2 } = new MessageChannelMain()

  // 把 port2 交给渲染进程，渲染侧通过 ipcRenderer.on('port', ...) 接收
  win.webContents.postMessage('port', null, [port2])

  const stream = createReadStream(filePath)
  port1.on('message', (e) => {
    if (e.data === 'start') {
      stream.on('data', (chunk) => port1.postMessage({ chunk }))
      stream.on('end', () => port1.postMessage({ done: true }))
    }
  })
  port1.start()
}
```

```ts
// preload
ipcRenderer.on('port', (event) => {
  const port = event.ports[0]
  contextBridge.exposeInMainWorld('fileStream', {
    start: () => port.postMessage('start'),
    onChunk: (cb: (chunk: Uint8Array) => void) => {
      port.onmessage = (e) => cb(e.data.chunk ?? new Uint8Array())
      port.start() // 关键：不调用 start 收不到消息
    },
  })
})
```

要点：`start()` 必须调用（`onmessage` 赋值会自动 start，`addEventListener` 不会）；端口在窗口销毁前要 `port.close()`。

## 七、类型安全的 IPC 封装

推荐"通道常量 + 映射表 + 泛型 invoke"三件套，任何一端改了签名另一端立即报错：

```ts
// shared/ipc.ts —— 主进程与 preload 都能 import（注意别 import electron）
export interface IpcContract {
  'app:version': { req: void; res: string }
  'file:read': { req: string; res: { content: string; size: number } }
  'download:start': { req: { url: string; savePath: string }; res: { taskId: string } }
}

export type Channel = keyof IpcContract
export type Req<C extends Channel> = IpcContract[C]['req']
export type Res<C extends Channel> = IpcContract[C]['res']
```

```ts
// 主进程辅助函数
import { ipcMain } from 'electron'
import type { Channel, Req, Res } from '../shared/ipc'

export function handle<C extends Channel>(
  channel: C,
  fn: (req: Req<C>, event: Electron.IpcMainInvokeEvent) => Res<C> | Promise<Res<C>>,
) {
  ipcMain.removeHandler(channel) // 支持热重启
  ipcMain.handle(channel, (event, req) => fn(req, event))
}
```

```ts
// preload 辅助函数
export const invoke = <C extends Channel>(channel: C, req: Req<C>): Promise<Res<C>> =>
  ipcRenderer.invoke(channel, req)

// 页面侧自动补全 + 类型检查
const version = await window.api.invoke('app:version', undefined)
```

这套写法的附加值：**通道名不会拼错、参数类型对得上、返回值可推导**，重构时是编译器帮你改代码，而不是上线后看日志。

## 八、安全：IPC 是攻击面

渲染进程可能被 XSS 或恶意第三方页面利用，因此主进程必须做三件事：

**1. 校验调用来源**

```ts
function trustSender(event: Electron.IpcMainInvokeEvent) {
  const url = event.senderFrame?.url ?? ''
  const allowed = ['app://myapp', 'http://localhost:5173'] // 生产用自定义协议，开发用 dev server
  if (!allowed.some((origin) => url.startsWith(origin))) {
    throw new Error(`IPC 来源不受信: ${url}`)
  }
}
```

> 如果你加载的是远程 https 页面（不推荐），务必校验 `event.senderFrame.origin === 'https://your-domain.com'`，绝不能放行任意来源。

**2. 校验入参**

```ts
import { z } from 'zod'

const ReadFileReq = z.object({
  path: z.string().max(1024),
  encoding: z.enum(['utf8', 'base64']).default('utf8'),
})

handle('file:read', async (raw) => {
  const { path, encoding } = ReadFileReq.parse(raw) // 不合法直接抛错
  // 还要限制目录：禁止读到 userData 之外（防路径穿越）
  const safe = resolve(app.getPath('userData'), path)
  if (!safe.startsWith(app.getPath('userData'))) throw new Error('非法路径')
  return readFile(safe).then((buf) => ({ content: buf.toString(encoding) }))
})
```

**3. 只暴露枚举型能力**

```ts
// ❌ 相当于把整个 shell 交给页面
contextBridge.exposeInMainWorld('api', { shell, exec: require('node:child_process').exec })

// ✅ 固定语义的方法
contextBridge.exposeInMainWorld('api', {
  openDocs: () => shell.openExternal('https://www.electronjs.org/docs/latest/'),
})
```

更完整的规则见 [安全加固清单](/electron/security)。

## 九、性能与体量建议

| 场景 | 建议 |
| --- | --- |
| 高频小消息（每帧） | 别走 IPC，改为渲染进程内计算；必要时节流到 30~60ms 一次 |
| 大数据一次性传递 | 用 `MessagePort` + 分块，避免主进程与渲染进程同时持有两份 |
| 进度类推送 | 合并通知（例如 200ms 一次），而不是每个字节一次 |
| 大量通道 | 按领域拆文件、统一注册，避免 `ipcMain.handle` 散落各处难以审计 |
| 长耗时任务 | 主进程只做路由，实际计算放 `utilityProcess`（见 [原生模块](/electron/native-modules)） |

## 十、高频坑清单

| 现象 | 原因 | 解法 |
| --- | --- | --- |
| `Attempted to register a second handler` | 开发热重启重复注册 | `removeHandler` 后再 `handle` |
| `window.api is undefined` | preload 路径/报错/未重启 | 看主进程日志，确认 `webPreferences.preload` |
| `An object could not be cloned` | 传了函数/类实例/DOM 节点 | 换成纯数据，类实例先 `.toJSON()` |
| `invoke` 永久 pending | 主进程 handler 里忘了 `return`，或通道名不一致 | 两端通道名统一常量 |
| 主进程推送收不到 | 没有 `ipcRenderer.on` 监听，或窗口已销毁 | 加订阅 API + 清理函数；发送前判 `isDestroyed()` |
| 进度条卡死 | 主进程同步阻塞（`readFileSync`、大循环） | 换异步/移到 utilityProcess |
| 监听器越积越多 | 组件卸载没移除监听 | 订阅 API 返回 unsubscribe，`onBeforeUnmount` 调用 |
| `event.senderFrame` 为 null | 调用来自已销毁的 frame | 先判空再校验 |

下一篇：[窗口与视图管理](/electron/window)，把这些能力落到看得见的界面上。
