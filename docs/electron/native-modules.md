# 原生模块与本地能力

> 第 7 站：Electron 的一半价值在"能用 Node"。这一篇讲清三件事——哪些能力该放哪一层、原生模块（C++/N-API）怎么装怎么打包、以及重活怎么交给独立进程而不卡死界面。

## 一、能力分层：别让页面直接摸到系统

| 需求 | 放哪里 | 原因 |
| --- | --- | --- |
| 读文件、写日志、查数据库 | 主进程 | 有完整 Node 能力，且是可信边界 |
| CPU 密集（压缩、解析、加密、图像处理） | `utilityProcess` / `worker_threads` | 不阻塞主进程（主进程阻塞 = 全应用卡） |
| 系统 API（串口、打印、注册表） | 主进程 / 原生模块 | 需要系统权限，preload 沙箱里做不到 |
| 一次性 UI 交互（拖拽路径、剪贴板） | preload | 需要 DOM 对象（`File`、`ClipboardEvent`） |
| 界面逻辑与数据展示 | 渲染进程 | 常规前端代码 |

一句话：**preload 只做"翻译"，不做"处理"**。

## 二、常用内置能力速查

```ts
import { app } from 'electron'
import { join } from 'node:path'

app.getPath('userData') // 应用数据目录（推荐存配置/数据库）
app.getPath('logs') // 日志目录（需先 app.setAppLogsPath()）
app.getPath('downloads') // 系统下载目录
app.getPath('home')
app.getAppPath() // 应用根目录（asar 内路径）
app.getVersion() // package.json 的 version
app.isPackaged // 是否打包后运行（区分 dev/prod 的关键）
process.resourcesPath // 打包后 resources 目录（extraResources 落在这里）
```

```ts
// 网络：主进程的 net 模块走系统代理与系统证书，行为比 node:https 更接近浏览器
import { net } from 'electron'
const res = await net.fetch('https://api.example.com/ping')
const json = await res.json()

// 也可以直接用全局 fetch（Electron 较新版本可用），但代理/证书行为以 net 为准
```

## 三、原生模块（N-API / node-gyp）

典型代表：`better-sqlite3`、`keytar`（密钥链）、`sharp`（图像）、`node-pty`（终端）、`serialport`（串口）。

### 为什么需要 rebuild

原生模块编译时链接的是 **Node ABI**，而 Electron 内置的 Node 版本与本地 Node 不同，直接加载会报：

```
Error: The module was compiled against a different Node.js version using
NODE_MODULE_VERSION 115. This version of Node.js requires NODE_MODULE_VERSION 123.
```

解决：

```bash
# 方式一：electron-rebuild（最常用）
npm i -D @electron/rebuild
npx electron-rebuild -f -w better-sqlite3

# 方式二：electron-builder 自动处理（推荐）
# electron-builder 在打包时会自动执行 install-app-deps
npx electron-builder install-app-deps
```

`package.json` 里加钩子，保证每次 `npm install` 后 ABI 都是对的：

```json
{
  "scripts": {
    "postinstall": "electron-builder install-app-deps"
  }
}
```

### 打包时必须 unpack

原生模块是 `.node` 二进制，**不能放在 asar 归档里**（系统加载器无法从归档中直接加载）：

```json
// electron-builder 配置
{
  "asar": true,
  "asarUnpack": ["**/*.node", "node_modules/better-sqlite3/**"]
}
```

### 用哪个版本、怎么验证

```ts
// 主进程启动时自检，比运行时崩溃更好排查
try {
  const Database = require('better-sqlite3')
  new Database(':memory:').close()
} catch (error) {
  console.error('原生模块加载失败，通常是 ABI 不匹配', error)
  dialog.showErrorBox('启动失败', '数据库模块与当前版本不兼容，请重新安装应用。')
}
```

## 四、本地存储怎么选

| 方案 | 适合 | 不适合 | 备注 |
| --- | --- | --- | --- |
| `localStorage` | 少量 UI 偏好 | 结构化数据、跨窗口一致性 | 存在渲染进程，清除缓存会丢 |
| IndexedDB | 中等量结构化数据、离线缓存 | 复杂查询、事务一致性 | 渲染进程内，主进程访问不了 |
| `electron-store` | 配置项、窗口状态 | 大表、并发写 | 本质是 JSON 文件 + 防抖写入 |
| **SQLite（better-sqlite3）** | 业务数据、全文检索、大量记录 | 简单 KV | 同步 API 很快，但必须放主进程 |
| 直接写 JSON 文件 | 极少数据、可读性要求高 | 频繁写、并发 | 注意原子写（临时文件 + rename） |

`better-sqlite3` 的典型用法（放主进程）：

```ts
import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'node:path'

const db = new Database(join(app.getPath('userData'), 'app.db'))
db.pragma('journal_mode = WAL') // 并发读写更稳
db.pragma('synchronous = NORMAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    updated_at INTEGER NOT NULL
  )
`)

const insert = db.prepare('INSERT INTO notes (title, content, updated_at) VALUES (?, ?, ?)')
insert.run('第一条笔记', 'hello', Date.now())
```

> `better-sqlite3` 是**同步 API**。查询很快（毫秒级），但"一次插入 10 万条""全表扫描"这类操作必须放进事务或移到 `utilityProcess`，否则主进程会明显卡顿。

## 五、utilityProcess：把重活搬出去

`utilityProcess` 是 Electron 提供的独立 Node 子进程（比 `child_process.fork` 更贴合 Electron 生命周期）：

```ts
// main.ts
import { utilityProcess, MessageChannelMain } from 'electron'
import { join } from 'node:path'

const worker = utilityProcess.fork(join(__dirname, 'workers/import.js'), [], {
  serviceName: 'DataImporter',
  stdio: 'pipe', // 方便抓子进程的 console
})

worker.stdout?.on('data', (d) => console.log('[import]', d.toString()))
worker.on('message', (msg) => console.log('结果', msg))
worker.on('exit', (code) => console.log('worker 退出', code))

worker.postMessage({ cmd: 'import', file: '/tmp/big.csv' })

// 退出应用时记得清理
app.on('will-quit', () => worker.kill())
```

```js
// workers/import.js（纯 Node 代码，没有 electron 依赖）
process.parentPort.on('message', async (e) => {
  const { cmd, file } = e.data
  if (cmd !== 'import') return
  try {
    // 这里随你怎么阻塞，界面不受影响
    const count = await importCsv(file)
    process.parentPort.postMessage({ ok: true, count })
  } catch (err) {
    process.parentPort.postMessage({ ok: false, message: String(err) })
  }
})
```

| 方案 | 隔离级别 | 通信 | 适用 |
| --- | --- | --- | --- |
| `utilityProcess` | 独立进程 | `postMessage` / MessagePort | 大批量导入导出、解析、加密 |
| `worker_threads` | 同进程线程 | `postMessage` + `SharedArrayBuffer` | 纯计算、可共享内存 |
| `child_process` | 独立进程 | stdio / IPC | 调用外部命令行工具 |

## 六、文件系统：安全与体验细节

```ts
import { readFile, writeFile, rename } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { app } from 'electron'

// 原子写：先写临时文件再改名，避免断电/崩溃留下半个文件
export async function writeJsonAtomic(file: string, data: unknown) {
  const tmp = `${file}.${process.pid}.tmp`
  await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')
  await rename(tmp, file) // 同分区 rename 是原子操作
}

// 需要"随应用分发"的只读资源放在 resources 里
export const resourcePath = (name: string) =>
  app.isPackaged ? join(process.resourcesPath, name) : join(__dirname, '../../resources', name)
```

要点：

- **读写用户数据一律放 `userData`**，别写应用安装目录（macOS 可能只读、Windows 需要管理员权限）；
- 打包后 `__dirname` 指向 asar 内部，`__dirname` 下的相对路径仍然可读；**但可执行文件、原生模块、需要被外部程序读取的文件必须 unpack**；
- 大量小文件操作要节流/合并，避免主进程 IO 队列堆积；
- 监听文件变化用 `fs.watch`，但它在不同平台行为不一致（macOS 的 `recursive` 较可靠，Linux 早期不支持），跨平台建议用 `chokidar`。

## 七、日志与崩溃上报

```ts
// electron-log：主进程/渲染进程通用，自动按大小切割
import log from 'electron-log/main'

log.initialize()
log.transports.file.level = 'info'
log.transports.file.maxSize = 5 * 1024 * 1024

log.info('应用启动', app.getVersion())
log.error('同步失败', error)

// 渲染进程里也能用（通过 preload 暴露 logger，或 electron-log/renderer）
```

```ts
// crashReporter：收集主进程与渲染进程崩溃转储
import { crashReporter } from 'electron'

crashReporter.start({
  productName: 'MyApp',
  companyName: 'Example Inc.',
  submitURL: 'https://crash.example.com/submit',
  uploadToServer: true, // 自建服务或关闭后手动上传
})
```

崩溃文件默认落在 `app.getPath('crashDumps')`，本地排查时可以直接用 minidump 分析。配合 `render-process-gone` / `child-process-gone` 事件，把"哪个进程、什么原因、退出码"记进日志。

## 八、调用外部程序

```ts
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

// ✅ 用 execFile（参数数组），不要用 exec（字符串拼接）
export async function convertVideo(input: string, output: string) {
  return execFileAsync('ffmpeg', ['-i', input, '-c:v', 'libx264', output], {
    timeout: 10 * 60 * 1000,
  })
}
```

**绝对不要**把用户输入拼进 `exec` 的字符串里（`;`、`&&`、反引号都是命令注入）。用 `execFile` + 参数数组，并校验路径。

下一篇：[打包、签名与自动更新](/electron/build-release)。
