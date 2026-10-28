# 主流框架与选型

> JD 写"熟悉 LangChain / LangGraph / LlamaIndex / AutoGen / Dify 等框架"——**不是要你把每个都学完，而是要有选型判断力**：知道每个框架解决什么、边界在哪、什么时候该跳出框架手写。这一课以 TS 生态为主（你的主场），Python 侧点到为止。

## 全景一张表

| 框架 | 语言 | 定位 | 什么时候选它 |
| --- | --- | --- | --- |
| **Vercel AI SDK** | TS | 前端友好的 LLM UI 工具箱：统一多供应商接口 + 流式 + `useChat` | 做 AI 产品的 Web/UI 层，几乎是无脑首选 |
| **LangChain** | Py/JS | 组件积木：模型抽象、prompt 模板、检索器、chain | 快速拼装、吃文档生态；简单链够用 |
| **LangGraph** | Py/JS | **有状态图编排**：节点/边/循环/分支/持久化/断点 | 复杂 Agent、多 Agent、需要可控状态流转 |
| **LlamaIndex** | Py/JS | **RAG 优先**：数据连接器、索引、查询引擎 | 项目核心是"文档/数据问答" |
| **OpenAI Agents SDK** | Py/TS | 轻量 Agent 循环 + handoffs + guardrails | 主用 OpenAI、想要官方范式 |
| **Mastra** | TS | TS 原生的"Next.js 风"Agent 框架（底层用 LangGraph 思想） | 想要纯 TS 端到端、工作流 + RAG + eval 一体 |
| **AutoGen / CrewAI** | Py | 多 Agent 对话/角色协作 | 研究性多智能体、非生产优先 |
| **Dify / Coze / n8n** | 低代码 | 可视化编排、开箱即用、快速验证 | 需求明确、要快、非工程团队维护 |

::: tip 别在框架上"从零学起"
正确顺序永远是：**先徒手实现（[Agent 核心原理](/agent/agent-core)）→ 遇到痛点 → 看框架哪个抽象能解你的痛点**。直接上 LangChain 的人，出了 bug 会卡在层层抽象里无从下手——这是面试常问的"你怎么调试一个不工作的 chain"。
:::

## Vercel AI SDK：前端的主场

TypeScript 优先，统一了 OpenAI/Anthropic/Google/国产等 100+ 模型接口。核心三件套：

```ts
// app/chat/route.ts —— Next.js Route Handler，服务端隐藏 apiKey
import { streamText, tool, convertToModelMessages } from 'ai';   // npm i ai
import { deepseek } from '@ai-sdk/deepseek';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: deepseek('deepseek-chat'),
    messages: await convertToModelMessages(messages),
    tools: {
      weather: {
        description: '查询城市天气',
        inputSchema: z.object({ city: z.string() }),
        execute: async ({ city }) => ({ city, temp: 22, sky: '晴' }),
      },
    },
  });
  return result.toUIMessageStreamResponse();   // 一行：把流转成前端 useChat 能吃的格式
}
```

```tsx
// components/chat.tsx —— 客户端：useChat 把流式聊天全套状态给你管好
'use client';
import { useChat } from '@ai-sdk/react';

export function Chat() {
  const { messages, sendMessage, status, stop, error } = useChat();
  return (
    <div>
      {messages.map((m) => m.role === 'user'
        ? <p key={m.id}>我：{m.content}</p>
        : <p key={m.id}>AI：{m.content}</p>)}
      <button onClick={() => status === 'streaming' && stop()}>停止</button>
      <form onSubmit={(e) => { e.preventDefault(); /* sendMessage(...) */ }}>
        <input name="prompt" /><button type="submit">发送</button>
      </form>
    </div>
  );
}
```

它把[前端 Agent 工程实战](/agent/agent-ui)里要手写的东西（SSE 解析、增量渲染、中断、工具状态）都封装好了。**学习曲线最平、最快出作品**，做简历项目强烈推荐。局限：复杂多 Agent 状态编排不是它的菜——那交给 LangGraph。

## LangGraph：把 Agent 画成状态图

LangChain 提供积木，**LangGraph 提供"带循环、分支、持久化"的编排引擎**。核心心智：把 Agent 流程建模成**图**——节点是"一步动作"（调模型/调工具/自定义逻辑），边决定下一步去哪，状态在节点间流转并可 checkpoint。

```ts
// 概念示意：LangGraph.js
import { StateGraph, MessagesAnnotation } from '@langchain/langgraph';

const graph = new StateGraph(MessagesAnnotation)
  .addNode('agent',  callModel)          // 决策：要不要调工具
  .addNode('tools',  runTools)           // 执行工具
  .addEdge('__start__', 'agent')
  .addConditionalEdges('agent', shouldContinue, { tools: 'tools', __end__: '__end__' })
  .addEdge('tools', 'agent');            // 循环回去——这就是 Agent loop 的图化

const app = graph.compile({ checkpointer });   // checkpointer：状态持久化，可中断/恢复/时光回溯调试
```

LangGraph 的杀手锏是**可控性**：`interrupt`（human-in-the-loop 审批）、`checkpointer`（长任务断点续跑、时间旅行调试）、子图（多 Agent 编排）。代价是抽象多、上手陡。判断标准：**流程有循环/分支/并行/需要恢复 → LangGraph；线性几步 → 直接写函数**。

## LlamaIndex：RAG 专精

数据连接器（几百种源）→ 索引 → 检索器 → 查询引擎，RAG 管线开箱即用，高级检索（递归检索、路由、合并查询）支持好。核心是"把数据组织好喂给 LLM"。做重 RAG 项目可优先考虑，配合[本库 RAG 页](/agent/rag)的原理理解使用。

## OpenAI Agents SDK 与 Mastra

- **OpenAI Agents SDK**（有 TS 版）：官方轻量范式，核心是 **Agent loop + Handoffs（Agent 间移交）+ Guardrails（输入/输出校验）+ Sessions**。想学"官方怎么看 Agent 架构"很值得读，抽象干净。
- **Mastra**：新兴 TS 原生框架，"AI 界的 Next.js"定位，工作流引擎 + RAG + eval + 多 Agent 一体，纯 TS 端到端体验好，适合想全程留在 JS 生态的团队。

## 低代码：Dify / Coze / n8n

别鄙视拖拽平台——**验证需求、非工程角色维护、内部提效工具**上它们是王者。Dify 开源可自部署（企业内网常见），Coze（扣子）国内生态全，n8n 偏自动化工作流集成。面试聊"为什么不用 X 框架而用低代码"或反之，考的是**成本/可控性/团队能力的权衡**，没有标准答案，讲清权衡即可。

## 选型决策树（面试直接背）

```text
是纯 UI/产品原型，要最快上线？        → 低代码（Dify/Coze）
做 Web AI 产品的交互与流式层？         → Vercel AI SDK
核心是私有文档问答（重检索）？          → LlamaIndex（+ 向量库）
Agent 有复杂状态：循环/分支/并行/可恢复？ → LangGraph
主用 OpenAI 且想要官方轻量范式？        → OpenAI Agents SDK
要纯 TS 端到端全家桶？                 → Mastra
流程简单到 50 行能写完？               → 别引框架，直接手写 loop
```

::: warning 框架不是简历加分项，"为什么用它"才是
面试官不关心你会不会调 `new StateGraph()`，关心的是：**你这个项目为什么需要 LangGraph 而不是 Vercel AI SDK？你踩过框架什么坑、怎么绕的？** 用[本库推荐路线](/agent/index)里的三个项目各配一个合适框架，把选型理由写进简历，比罗列十个框架名强。
:::

## 高频面试自检

1. LangChain 和 LangGraph 什么关系？各自解决什么？
2. 一个 Next.js + 流式聊天 + 工具调用的产品，你会用什么？（期待 Vercel AI SDK，讲得出理由）
3. 什么时候该跳出框架手写 Agent loop？
4. Dify 和自研框架怎么选？（考权衡思维）
5. Vercel AI SDK 的 `useChat` 帮你解决了哪些前端流式处理的脏活？

## 下一站

- 框架之上，把 AI 交互层做到极致 → [前端 Agent 工程实战](/agent/agent-ui)
