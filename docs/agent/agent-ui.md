# 前端 Agent 工程实战

> 这是前端工程师转型 AI 应用开发**最大的差异化战场**：模型能力人人能调，但"把 AI 的不确定性体验包装成好用的产品交互"是前端的活。JD 里的"流式输出处理、多端落地、AI 功能埋点"全在这一课。学完你能徒手搭出一个体验达标的 AI 聊天/Agent 前端。

## 一个 AI 聊天产品的前端全景

```text
UI 层        消息列表 / 输入框 / 工具状态面板 / 引用溯源弹层
状态层       会话 store（messages: parts 模型）、流式状态机、乐观更新
传输层       fetch + SSE（或 WebSocket 双向）/ Vercel AI SDK 的 useChat
防御层       Markdown 渲染 + sanitize（XSS）/ 长列表性能 / 错误恢复
```

**消息数据结构是一切的地基**——字符串 content 不够用，一条 AI 回复可能同时包含：思考中→工具调用→工具结果→文本片段→引用列表。用 **parts 数组**建模：

```ts
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: Array<
    | { type: 'text'; text: string }
    | { type: 'tool-call'; callId: string; name: string; args: unknown; state: 'pending' | 'done' | 'error'; result?: unknown }
    | { type: 'reasoning'; text: string }              // 推理模型的思考过程（可折叠展示）
    | { type: 'file'; url: string; mime: string }
  >;
  status?: 'streaming' | 'ready' | 'error' | 'aborted';
}
```

渲染层按 `part.type` 分发组件，工具卡片的 pending/done 状态切换、思考过程折叠都自然落地。Vercel AI SDK 的 UIMessage 就是这套模型。

## 流式渲染：三个必须踩平的坑

### 坑 1：不完整的 Markdown

流式文本是逐 token 到达的，中间态必然出现"只写了一半"的语法：` ```python ` 开了没关、`**加粗` 没闭合、表格只来了一半。直接每帧重新 render 会闪瞎用户。

策略：**渲染前修补未闭合语法**——检测奇数个代码围栏就临时补一个闭合、截掉末尾孤立的 `*`/`` ` `` 碎片再渲染。成熟方案：Vercel 的 <a href="https://github.com/vercel/streamdown" target="_blank" rel="noopener noreferrer">Streamdown</a>（专为流式设计的 Markdown 渲染器）；或 `marked` + 自写补丁函数 + `DOMPurify`。

### 坑 2：高频更新的性能

token 每秒可到 50~100 个，每来一个 chunk 就 setState → 整棵 Markdown 重渲染 → 长回答直接卡成 PPT。

- **节流合并**：攒 30~60ms 的 chunk 一次性提交状态（rAF 或 setInterval 冲刷 buffer），肉眼无感、渲染次数降一个数量级
- **只更新最后一个气泡**：消息列表 memo 化，历史消息组件 `React.memo`/Vue `v-once` 思路隔离，流式只重渲染进行中的那条
- **长会话虚拟滚动**：几百条消息 + 富文本，上 `virtua`/`@tanstack/vue-virtual`
- 代码高亮别每帧全量跑：文本稳定后（该 part 完成态）再做高亮，流式中先按纯文本显示

### 坑 3：滚动管理

自动滚底 vs 用户往上翻看历史，冲突极常见。标准做法：**滚动跟随只在"用户本来就贴着底部"时启用**——每次更新前判断 `scrollHeight - scrollTop - clientHeight < 阈值(约 100px)`，是则跟随，否则显示"回到底部"悬浮按钮。这是 AI 聊天 UX 的细节分水岭，面试聊到直接加分。

## 打字机效果与停止生成

- **打字机**：数据层已是流式增量，UI 层可选再做"逐字显现"平滑（chunk 到达速率不均，直接上屏会一段一段蹦）。做法：维护"目标文本"与"已显示文本"两个指针，用定时器按固定字速追赶。注意**结尾闪烁光标**（CSS animation）能显著提升"活着"的感觉。
- **停止生成**：`AbortController` 贯穿始终——

```ts
const controller = new AbortController();

async function send(text: string) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: buildPayload(text) }),
    signal: controller.signal,                 // 1. 请求可中断
  });
  // ...SSE 解析循环（见 LLM 基础一课），每帧更新 parts 里最后一个 text
}

function stop() {
  controller.abort();                          // 2. 用户点"停止"：掐断连接，服务端也应随之终止生成（省 token！）
  markMessageAborted();                        // 3. 已生成的半截内容保留 + 标注"已停止"，别清空
}
```

配套细节：生成中禁用发送按钮但保留输入框可编辑；`error` 时保留用户原问题 + 一键重试；网络断连的半截消息标记 `aborted` 而不是假装成功。

## 工具调用过程可视化

Agent 执行 30 秒用户不知道在干嘛 = 焦虑流失。把 `tool-call` part 渲染成**步骤卡片流**：

```tsx
function ToolCard({ part }: { part: ToolCallPart }) {
  const icon = { pending: '⏳', done: '✅', error: '⚠️' }[part.state];
  return (
    <details className="tool-card" open={part.state === 'pending'}>
      <summary>{icon} {TOOL_LABELS[part.name] ?? part.name}
        {part.state === 'pending' && <span className="dots" />}</summary>
      <pre>{JSON.stringify(part.args, null, 2)}</pre>
      {part.result != null && <pre>{JSON.stringify(part.result, null, 2)}</pre>}
    </details>
  );
}
```

原则：**默认折叠只给一行状态摘要**（"正在搜索：北京天气…"），想深究再展开——普通用户不需要看 JSON。多步 Agent 用垂直 stepper 展示进度；引用来源渲染成角标 `[1]`，点击弹出原文卡片并高亮命中段落（RAG 溯源的前端半边）。

## 传输层选型：SSE / WebSocket / 轮询

| 方式 | 适用 |
| --- | --- |
| **SSE**（fetch 流） | 事实标准：单向服务端推流、走 HTTP/HTTP2、鉴权复用 header、Serverless 友好（Vercel/云函数都支持）。90% 的 AI 聊天选它 |
| WebSocket | 需要双向实时（协同、语音对话、barge-in 打断）；运维成本高、Serverless 支持差 |
| 轮询 | 兜底（代理层缓冲掉流的恶劣环境）或低频任务 |

::: warning 中间件会"攒完再发"
Nginx 默认 `proxy_buffering` 会把 SSE 攒满 buffer 一次性吐出——本地好好的、上线就"卡 10 秒后整段蹦出来"。要 `X-Accel-Buffering: no` 响应头或关 buffering；同理检查 CDN、网关、云函数的流式支持。部署翻车率极高，先记住。
:::

## 输入侧工程

- **多模态**：图片走 `multipart` 或 base64（注意体积）→ 视觉模型；语音用 MediaRecorder 录音 → ASR 接口（Whisper API）→ 文本进消息流
- **@ 引用 / 斜杠命令**：把"选择上下文"做成结构化操作（选中某文档 = 注入其 ID 让 Agent 用工具去读），比让用户复制粘贴体验好一个量级——这是 Copilot 类产品的基本功
- **上下文预算提示**：接近窗口上限时提示"将摘要较早对话"，把黑盒行为透明化
- **敏感词/长度前置校验**：别把明显违规的请求浪费一次 API 调用

## 安全：模型输出是不可信输入

**永远不要把模型输出直接 `v-html` / `dangerouslySetInnerHTML`**。模型会被诱导生成 `<img onerror=...>`、恶意链接、伪装的"系统消息"样式：

1. Markdown 渲染管线上 `DOMPurify`（或等价 sanitizer），禁 `script/iframe/on*` 属性
2. 链接加 `rel="noopener noreferrer"`、可疑域名二次确认样式
3. HTML 代码块默认转义展示源码，**不要**提供"渲染这段 HTML"按钮（经典 XSS 自杀）
4. 前端展示的用户隐私字段（手机号等）由服务端脱敏后再下发——别指望前端遮

## 埋点与指标（JD 里的"AI 功能调用成功率"）

传统前端埋点之外，AI 功能要专门埋这组：**TTFT 首 token 延迟、生成总时长、中断率、重试率、错误类型分布、每会话 token 成本（从响应 usage 字段拿）、赞/踩反馈**。"用户等待时长和重试次数"是 AI 体验直接指标，面试谈"如何衡量 AI 功能做得好不好"就答这组。

## 高频面试自检

1. 流式 Markdown 渲染有哪些坑？你怎么处理未闭合代码块？
2. 停止按钮按下之后，前后端各发生了什么？为什么能省 token？
3. 自动滚动怎么实现才不干扰用户回看？
4. 模型返回的 HTML/Markdown 为什么不能直接 innerHTML？
5. 你的 AI 聊天页，首屏到第一个字出现，链路上一共有哪些延迟来源？（网络、服务端排队、鉴权、模型 TTFT、代理缓冲）

## 下一站

- 上线之后：评测、成本、可观测与求职冲刺 → [生产落地与求职指南](/agent/production)
