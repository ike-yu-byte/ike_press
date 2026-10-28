# Agent Knowledge Base

> An AI Agent knowledge system built **for web frontend developers**: from your first LLM API call to complete, interview-defensible practical skills. Everything is aligned with what 2026 job postings actually demand — "AI Application Engineer / Agent Engineer" roles don't ask you to train models; they ask you to **engineer LLM capability into real business**: call APIs well, understand RAG, orchestrate agents, build streaming UIs, and reason about evaluation and cost.

## First, the mindset: what this market is actually hiring for

Translating JD buzzwords into plain requirements:

| JD wording | What they really mean | Covered in |
| --- | --- | --- |
| "Familiar with LLM internals" | Understand the engineering meaning of tokens / context windows / sampling params — **no backprop by hand** | [LLM Basics & APIs](/en/agent/llm-basics) |
| "Strong prompt writing & tuning" | Structured prompts, few-shot, structured output, bad-case iteration | [Prompt Engineering](/en/agent/prompt-engineering) |
| "Task planning, tool use, memory, autonomous decisions" | The agent-loop quartet; implement a minimal agent from scratch | [Agent Core Principles](/en/agent/agent-core) |
| "Deep understanding of RAG (reranking, multi-way recall, KG integration)" | Every pipeline stage: why, what to pick, how to tune | [RAG](/en/agent/rag) |
| "Understand MCP; able to build custom MCP servers" | Know the protocol + have shipped a TS SDK server | [Tool Ecosystem & MCP](/en/agent/mcp-tools) |
| "Familiar with LangChain / LangGraph / Dify" | Know each framework's niche and trade-offs, not just doc-copying | [Frameworks & Selection](/en/agent/frameworks) |
| "Streaming output, multi-platform delivery" | SSE parsing, streaming Markdown rendering, typewriter & abort | [Frontend Agent Engineering](/en/agent/agent-ui) |
| "Agent evaluation & production deployment" | Eval datasets, LLM-as-judge, observability, cost control | [Production & Career Guide](/en/agent/production) |

**Know your edge as a frontend dev**: TypeScript is now a first-class citizen of the agent ecosystem — Vercel AI SDK, LangGraph.js, the official MCP TypeScript SDK, and the Claude Agent SDK all ship full TS support. The interaction layer of AI products (streaming UIs, workflow visualizers, low-code orchestration) is literally the frontend's home turf. Don't fight algorithm engineers on model internals — **build your advantage in product delivery and agent engineering**.

## Knowledge map & page navigation

Read in table order — the first four pages are foundations, the last four are practice:

| # | Page | What you gain |
| --- | --- | --- |
| 1 | [LLM Basics & API Calling](/en/agent/llm-basics) | Tokens/context/sampling mental model, OpenAI-compatible API, SSE streaming, model & pricing landscape |
| 2 | [Prompt Engineering & Structured Output](/en/agent/prompt-engineering) | Prompt templates, few-shot/CoT, JSON mode, the full Function Calling mechanism |
| 3 | [Agent Core Principles](/en/agent/agent-core) | A 50-line hand-built agent loop, ReAct, planning/tools/memory/reflection, workflow vs agent |
| 4 | [RAG](/en/agent/rag) | End-to-end engineering judgment: chunking → embeddings → vector DB → hybrid recall → rerank → eval |
| 5 | [Tool Ecosystem & MCP](/en/agent/mcp-tools) | MCP architecture and primitives; write your own MCP server with the TS SDK |
| 6 | [Frameworks & Selection](/en/agent/frameworks) | Where LangGraph.js / Vercel AI SDK / OpenAI Agents SDK / Mastra / Dify·Coze each fit |
| 7 | [Frontend Agent Engineering](/en/agent/agent-ui) | Full streaming chat stack: SSE parsing, useChat, Markdown rendering, tool-progress UI, XSS defense |
| 8 | [Production & Career Guide](/en/agent/production) | Eval, observability, cost & latency optimization, safety, plus resume projects and top interview questions |

## Recommended practice track (three resume-worthy projects)

Interviewers distinguish "followed a tutorial" from "built a project" brutally — can you explain **exception handling and selection rationale**? Build in this order:

1. **Streaming AI chat app** (1 week): Vercel AI SDK or raw SSE + your own UI. Must-haves: typewriter rendering, stop generation (AbortController), multi-turn context, streaming Markdown parsing. → Covers pages 1, 2, 7.
2. **Document-QA RAG assistant** (2 weeks): upload PDF → chunk → embed (pgvector/sqlite-vec) → hybrid recall + rerank → citation source view. Must-haves: chunking strategy A/B experiments, retrieval quality metrics. → Covers page 4; the project you'll be grilled on most.
3. **Tool-calling agent** (2–3 weeks): a multi-step agent that checks weather / searches the web / reads files, or write an MCP server plugged into Claude/Cursor. Must-haves: tool-failure retry, max-iteration guardrails, trace logs. → Covers pages 3, 5, 6.

## Learning resources

- <a href="https://platform.openai.com/docs" target="_blank" rel="noopener noreferrer">OpenAI Platform Docs</a> — the de facto API standard; understand the compatible protocol here
- <a href="https://docs.anthropic.com" target="_blank" rel="noopener noreferrer">Anthropic Docs</a> and <a href="https://www.anthropic.com/engineering/building-effective-agents" target="_blank" rel="noopener noreferrer">Building Effective Agents</a> — the canonical article on agent design patterns (source of the workflow-vs-agent taxonomy)
- <a href="https://sdk.vercel.ai" target="_blank" rel="noopener noreferrer">Vercel AI SDK</a> / <a href="https://langchain-ai.github.io/langgraphjs/" target="_blank" rel="noopener noreferrer">LangGraph.js</a> / <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer">MCP official site</a> — the three TS-ecosystem staples
- <a href="https://python.langchain.com/docs/introduction/" target="_blank" rel="noopener noreferrer">LangChain</a> / <a href="https://docs.llamaindex.ai" target="_blank" rel="noopener noreferrer">LlamaIndex</a> / <a href="https://langfuse.com" target="_blank" rel="noopener noreferrer">Langfuse</a> — Python orchestration, RAG-focused framework, open-source observability
- <a href="https://github.com/Dify-ai/dify" target="_blank" rel="noopener noreferrer">Dify</a> / <a href="https://www.coze.cn" target="_blank" rel="noopener noreferrer">Coze</a> — low-code platforms for fast idea validation
- <a href="https://www.deeplearning.ai/short-courses/" target="_blank" rel="noopener noreferrer">DeepLearning.AI short courses</a> — Andrew Ng's series, 1–2 hours each, excellent RAG/agent coverage

---

Ready? Start with lesson one: [LLM Basics & API Calling →](/en/agent/llm-basics)
