# LLM 基础与 API 调用

> 应用岗 JD 写"熟悉大模型原理"，真实要求是：**理解 token、上下文窗口、采样参数这些概念的工程含义，知道它们如何影响你的成本、延迟和 UI**。这一课把这些地基打牢，然后动手调通 OpenAI 兼容 API——包括流式输出，这是后面所有实战的前提。

## 一句话原理：它在预测下一个 token

大模型（LLM）本质上只做一件事：**给定前文，预测下一个 token 的概率分布，采样输出，再把它拼回前文继续预测**。这叫 next-token prediction。

理解了这个，很多现象就通了：

- **为什么会幻觉**：它不是在"查库"，是在生成"看起来最像正确答案的文字"。没把握时它也不会说"我不知道"，因为那样反而不像训练数据里的样子。
- **为什么上下文窗口是硬约束**：每次调用都是把全部历史消息重新塞进去算一遍，模型没有隐藏记忆。
- **为什么流式输出能提前返回**：token 是一个一个生成出来的，边生成边推送天然可行。

::: warning 应用工程师需要懂到哪一层
Transformer 的 attention 机制、训练三阶段（预训练/SFT/RLHF）知道**是什么、解决什么问题**即可。面试被问"讲讲 Transformer"时，答到"自注意力让模型在处理每个 token 时能看到全序列相关信息，是上下文窗口和 KV Cache 成本的来源"这个深度就够用了。把时间花在工程落地上，回报率高得多。
:::

## Token：计费和上下文的字数单位

Token 不等于字。模型用 BPE 类算法把文本切成子词片段：

- 英文：1 token ≈ 0.75 个单词，`"unbelievable"` 会被切成 `un`/`believ`/`able` 约 3 个 token
- 中文：1 个汉字 ≈ 1~2 token（常见字约 1 个，生僻字更碎）
- 代码：缩进、符号都单独成 token，实际消耗比肉眼估计高

**为什么必须关心它**：API 按 token 计费（输入、输出两个单价，输出通常贵 3~5 倍）；上下文窗口按 token 限制；延迟主要由**输出 token 数**决定。工程上的直接推论：system prompt 和工具 schema 每次请求都算输入 token，**冗长的提示词是真金白银**。

估算工具：OpenAI 的 <a href="https://platform.openai.com/tokenizer" target="_blank" rel="noopener noreferrer">Tokenizer 页面</a>，或 npm 包 `gpt-tokenizer` 在本地预检。

## 上下文窗口：不是越大越好

模型各有窗口上限（8K/32K/128K/200K/1M 不等），但工程使用要记住三件事：

1. **窗口 = 输入 + 输出共享**。留不出输出空间会直接报错或截断。
2. **Lost in the middle**：模型对超长上下文的**中间部分**注意力显著下降。关键指令放开头（system）和结尾（最近消息），检索到的资料按相关性排序而不是按时间堆。
3. **长上下文 ≠ 免费记忆**。塞 100K token 的历史，意味着每次请求都为这 100K 付输入费用和延迟。所以才有"对话摘要压缩""RAG 按需召回"这些手段——**只把当前需要的上下文放进去**。

## 关键采样参数

| 参数 | 作用 | 工程建议 |
| --- | --- | --- |
| `temperature` | 采样随机度（0 = 贪心取最大概率） | 抽取/分类/代码用 0~0.3；创意文案 0.7~1。注意它和 top_p 一般只调一个 |
| `top_p` | 核采样：只从累计概率达 p 的候选池里抽 | 与 temperature 二选一 |
| `max_tokens` / `max_completion_tokens` | 限制输出长度 | 必设！防跑飞烧钱；也用于强制简洁 |
| `stop` | 遇到指定字符串立即停止生成 | 配合自定义格式（如 `\n\n###`）截断 |
| `seed` | 固定种子提升可复现性 | 做 Eval 回归测试时用 |
| `stream` | 流式返回 | 聊天类产品必开，见下文 |
| `response_format` | 约束输出为 JSON | 结构化抽取场景，详见 [Prompt 工程](/agent/prompt-engineering) |

## 消息结构：一次调用的数据形状

Chat Completions API 的入参就是**一个消息数组**，每条消息有 `role`：

```ts
const messages = [
  { role: 'system', content: '你是一个严谨的合同审核助手，只依据给定条款回答。' },
  { role: 'user', content: '这条违约金条款有什么风险？' },
  { role: 'assistant', content: '违约金约定为总价的 80%，可能被法院酌减……' },  // 模型上一轮的回答
  { role: 'user', content: '那合理的比例一般是多少？' },                          // 本轮提问
];
```

**多轮对话的本质**：所谓"记忆"，就是你把历史 messages 原样带上再追加新问题。会话管理 = 对这个数组的增删改（截断、摘要、清理工具消息）。

各 role 的分工：`system`（或新式的 `developer`）定义人设与规则、优先级最高；`user` 是用户输入；`assistant` 是模型输出（回传历史时保留）；`tool` 是工具执行结果回填（Function Calling 用，见下一课）。

## 第一次调用：OpenAI 兼容协议

OpenAI 的 `/v1/chat/completions` 已成事实标准：DeepSeek、Kimi、智谱、Qwen（DashScope 兼容模式）、Ollama 本地部署**全部兼容**，换 `baseURL` + `apiKey` + `model` 就能切换供应商。这就是 JD 里"模型接入与调用、对接 OpenAI/Claude/Gemini/Qwen/DeepSeek 等 API"的实际工作量。

```ts
// node 18+ 自带 fetch；浏览器里千万别这么写——apiKey 会泄露到前端
const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.API_KEY}`,
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: '用一句话解释什么是闭包' }],
    temperature: 0.3,
    max_tokens: 200,
  }),
});
const data = await res.json();
console.log(data.choices[0].message.content);
console.log(data.usage);   // { prompt_tokens, completion_tokens, total_tokens } —— 记账用它
```

::: danger 密钥永远留在服务端
把 apiKey 写进前端代码/环境变量暴露给浏览器，等于把信用卡挂在网上。前端请求 → 自己的后端/Serverless 函数（隐藏密钥、加鉴权、加限流）→ 再转发模型 API。国内"云开发/函数计算"对前端极其友好，一周内能上手，这正是前端转型的护城河之一。
:::

用官方 SDK 则省掉手写 fetch（自动重试、类型齐全）：

```ts
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.API_KEY,
  baseURL: 'https://api.deepseek.com/v1',   // 一行切换供应商
});

const completion = await client.chat.completions.create({
  model: 'deepseek-chat',
  messages: [{ role: 'user', content: '你好' }],
});
```

## 流式输出：SSE 格式必须亲手解一次

聊天产品不开流式 = 让用户盯着 10 秒白屏。协议是 **SSE（Server-Sent Events）**：响应 `Content-Type: text/event-stream`，正文是一行行 `data: {...}`，最后以 `data: [DONE]` 结束。

```ts
const res = await fetch(baseUrl + '/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
  body: JSON.stringify({ model, messages, stream: true }),
});

const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  // 按行切分；最后一行可能不完整，留在 buffer 里等下个 chunk——这是手写解析最常见的 bug
  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';
  for (const line of lines) {
    const payload = line.replace(/^data: ?/, '').trim();
    if (!payload || payload === '[DONE]') continue;
    const json = JSON.parse(payload);
    const delta = json.choices[0]?.delta?.content ?? '';   // 注意是 delta 不是 message
    if (delta) process.stdout.write(delta);                // 增量片段，拼接成完整回答
  }
}
```

流式返回的每个 chunk 只含**增量**（`delta`），完整回答 = 所有 delta 拼接。UI 侧的渲染处理（打字机、Markdown 增量解析、中断）是重头戏，放在[前端 Agent 工程实战](/agent/agent-ui)展开。

**两个延迟指标要背下来**：TTFT（Time To First Token，首 token 延迟，决定"感觉快不快"，靠流式与 prompt 缓存优化）与总生成时间（决定"实际快不快"，靠输出长度与并行）。

## Embedding：把文本变成向量

Embedding 模型（如 `text-embedding-3-small`、国产 `bge-m3`）把任意文本映射成一个高维向量（几百到几千维），**语义相近 → 向量距离近**。它是 RAG 检索的基石，此处先建立概念，管线细节见 [RAG 检索增强](/agent/rag)。

```ts
const emb = await client.embeddings.create({
  model: 'text-embedding-3-small',
  input: ['今天天气不错', '阳光明媚适合出门'],
});
// emb.data[0].embedding 是 number[]，两句的余弦相似度会明显高于无关句子
```

## 模型版图速览（2026）

| 阵营 | 代表 | 应用工程师要知道的 |
| --- | --- | --- |
| 闭源旗舰 | GPT 系列、Claude、Gemini | 能力最强、价格最高；Claude 长文本与代码、Gemini 多模态与超大窗口 |
| 国产一线 | DeepSeek、Kimi、Qwen、豆包/方舟 | 便宜、国内直连、多数兼容 OpenAI 协议；企业内网常见选择 |
| 开源自部署 | Qwen、Llama、GLM、DeepSeek 开源版 | 数据不出域场景（合规要求）用 Ollama/vLLM 部署；要算 GPU 成本 |
| 小模型/边缘 | 各 1B~8B 蒸馏模型 | 分类、抽取等窄任务够用，延迟成本极低——**模型路由**里当"廉价档" |

选型三问，面试标准答案：**能不能接受数据出境/出网（合规）→ 任务需要多强的推理（效果）→ 单位请求成本与延迟预算（钱）**。不要无脑旗舰，弱模型 + 好 Prompt + 精确上下文经常反超。

## 高频面试自检

1. temperature 和 top_p 的区别？各自什么时候调？
2. 上下文窗口 128K，是不是可以把 200 页文档直接塞进去？（考 lost-in-the-middle、成本、RAG 对比）
3. 流式响应里 `delta` 和完整 `message` 的关系？`[DONE]` 是什么？
4. 多轮对话的记忆是怎么实现的？（考"模型无状态、历史靠回传"）
5. 为什么输出 token 比输入 token 贵？（考 prefill 可并行 vs decode 逐 token 自回归）

## 下一站

- 让模型稳定输出你要的格式 → [Prompt 工程与结构化输出](/agent/prompt-engineering)
- 把检索塞进生成前 → [RAG 检索增强](/agent/rag)
