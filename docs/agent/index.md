# Agent 知识库入口

> 这是面向 **Web 前端开发者** 的 AI Agent 知识体系：从大模型 API 的第一次调用，到能写进简历、撑得起面试的完整实战能力。所有内容对齐 2026 年招聘市场的高频要求——"AI 应用开发工程师 / Agent 工程师"岗位考察的不是训模型，而是**把大模型工程化地落进真实业务**：会调 API、懂 RAG、能编排 Agent、做得动流式 UI、说清评估与成本。

## 先立心智：这个领域到底在招什么人

把招聘 JD 里的黑话翻译成人话：

| JD 原文 | 实际要求 | 对应本库章节 |
| --- | --- | --- |
| "熟悉大模型原理" | 懂 token / 上下文窗口 / 采样参数的工程含义，**不需要手推反向传播** | [LLM 基础与 API](/agent/llm-basics) |
| "扎实的 Prompt 编写与调优能力" | 结构化提示词、few-shot、结构化输出、bad case 迭代 | [Prompt 工程](/agent/prompt-engineering) |
| "任务规划、工具调用、记忆机制、自主决策" | Agent loop 四件套，能徒手实现一个最小 Agent | [Agent 核心原理](/agent/agent-core) |
| "深度理解 RAG（重排序、多路召回、知识图谱结合）" | 检索管线每个环节为什么、怎么选、怎么调 | [RAG 检索增强](/agent/rag) |
| "了解 MCP 协议，能开发自定义 MCP Server" | 理解协议 + 用 TS SDK 写过 server | [工具生态与 MCP](/agent/mcp-tools) |
| "熟悉 LangChain / LangGraph / Dify 等框架" | 知道各框架定位与取舍，而非只会抄文档 | [框架与选型](/agent/frameworks) |
| "流式输出处理、多端落地" | SSE 解析、流式 Markdown 渲染、打字机与中断 | [前端 Agent 工程实战](/agent/agent-ui) |
| "Agent 效果评测与优化、生产环境部署" | Eval 数据集、LLM-as-judge、可观测、成本控制 | [生产落地与求职](/agent/production) |

**前端的独特优势要认清**：TypeScript 已是 Agent 生态一等公民——Vercel AI SDK、LangGraph.js、MCP 官方 TS SDK、Claude Agent SDK 都有完整 TS 支持；AI 产品的交互层（流式 UI、工作流可视化、低代码编排）恰恰是前端主场。别和算法工程师拼模型原理，**在产品落地和 Agent 工程化上建立优势**。

## 知识地图与子页导航

学习顺序即表格顺序，前四页是地基，后四页是实战：

| # | 章节 | 你会获得什么 |
| --- | --- | --- |
| 1 | [LLM 基础与 API 调用](/agent/llm-basics) | token/上下文/采样参数心智，OpenAI 兼容 API、流式 SSE、模型选型与计费 |
| 2 | [Prompt 工程与结构化输出](/agent/prompt-engineering) | 提示词结构模板、few-shot/CoT、JSON mode、Function Calling 完整机制 |
| 3 | [Agent 核心原理](/agent/agent-core) | 50 行手搓 Agent loop、ReAct、规划/工具/记忆/反思、Workflow vs Agent |
| 4 | [RAG 检索增强](/agent/rag) | 分块→Embedding→向量库→混合检索→Rerank→评测的全管线工程判断力 |
| 5 | [工具生态与 MCP](/agent/mcp-tools) | MCP 架构与三大原语，用 TS SDK 写自己的 MCP Server |
| 6 | [主流框架与选型](/agent/frameworks) | LangGraph.js / Vercel AI SDK / OpenAI Agents SDK / Mastra / Dify·Coze 的定位与取舍 |
| 7 | [前端 Agent 工程实战](/agent/agent-ui) | 流式聊天界面全栈：SSE 解析、useChat、Markdown 渲染、工具过程可视化、XSS 防护 |
| 8 | [生产落地与求职指南](/agent/production) | Eval、可观测、成本与延迟优化、安全防线，以及简历项目与高频面试题 |

## 推荐实战路线（三个可写进简历的项目）

面试官对"看过教程"和"做过项目"的区分非常粗暴——能不能讲清**异常处理和选型依据**。建议按这个顺序做：

1. **流式 AI 聊天应用**（1 周）：Vercel AI SDK 或原生 SSE + 自建 UI。要点：打字机渲染、停止生成（AbortController）、多轮上下文、Markdown 流式解析。→ 覆盖第 1、2、7 页。
2. **文档问答 RAG 助手**（2 周）：上传 PDF → 分块 → 向量化（pgvector/sqlite-vec）→ 混合检索 + Rerank → 引用溯源显示。要点：chunk 策略对比实验、检索质量评测。→ 覆盖第 4 页，是最常被追问的项目。
3. **工具调用 Agent**（2-3 周）：一个能查天气/搜网页/读文件的多步 Agent，或写一个 MCP Server 接进 Claude/Cursor。要点：工具失败重试、最大迭代数护栏、trace 日志。→ 覆盖第 3、5、6 页。

## 学习资源

- <a href="https://platform.openai.com/docs" target="_blank" rel="noopener noreferrer">OpenAI Platform Docs</a> —— API 事实标准，兼容协议看它就够了
- <a href="https://docs.anthropic.com" target="_blank" rel="noopener noreferrer">Anthropic Docs</a> 与 <a href="https://www.anthropic.com/engineering/building-effective-agents" target="_blank" rel="noopener noreferrer">Building Effective Agents</a> —— Agent 设计模式的经典文章（Workflow vs Agent 分类出处）
- <a href="https://sdk.vercel.ai" target="_blank" rel="noopener noreferrer">Vercel AI SDK</a> / <a href="https://langchain-ai.github.io/langgraphjs/" target="_blank" rel="noopener noreferrer">LangGraph.js</a> / <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer">MCP 官方站</a> —— TS 生态三大件
- <a href="https://python.langchain.com/docs/introduction/" target="_blank" rel="noopener noreferrer">LangChain</a> / <a href="https://docs.llamaindex.ai" target="_blank" rel="noopener noreferrer">LlamaIndex</a> / <a href="https://langfuse.com" target="_blank" rel="noopener noreferrer">Langfuse</a> —— Python 编排、RAG 专用框架、开源可观测
- <a href="https://github.com/Dify-ai/dify" target="_blank" rel="noopener noreferrer">Dify</a> / <a href="https://www.coze.cn" target="_blank" rel="noopener noreferrer">扣子 Coze</a> —— 低代码平台，快速验证想法
- <a href="https://www.deeplearning.ai/short-courses/" target="_blank" rel="noopener noreferrer">DeepLearning.AI 短课</a> —— 吴恩达系列，每个 1-2 小时，RAG/Agent 主题极全

---

准备好了就从第一课开始：[LLM 基础与 API 调用 →](/agent/llm-basics)
