# LLM Application Development (LLM Apps / LangChain / RAG / Agents)

> Stop 6: 2026's hottest job title. This stop cashes in everything before it: Python engineering (1-2) + API services (3) + data processing (4) + model intuition (5) = LLM app development. The concept system matches this site's [Agent knowledge base](/en/agent/) one-to-one; this chapter focuses on **the Python-side implementation**.
>
> **How to read**: every concept is immediately followed by a **JS counterpart (OpenAI JS SDK / LangChain.js)**. The HTTP APIs and concepts are language-agnostic; JS maps almost one-to-one.

## 1. Calling model APIs directly: the ground floor

<CodeCompare>

<template #python>

```python
# the openai-python SDK is the de-facto standard — Qwen/DeepSeek/Kimi/GLM/Ollama all expose OpenAI-compatible endpoints
from openai import OpenAI

client = OpenAI(
    api_key="sk-...",
    # from the environment; never into git
    base_url="https://api.deepseek.com",
    # switching vendors = changing this one line
)

resp = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "system", "content": "You are a rigorous legal assistant; answer only from the given texts."},
        {"role": "user", "content": "What is the maximum probation period by law?"},
    ],
    temperature=0.2,
    # factual tasks: keep it low
    stream=False,
)
print(resp.choices[0].message.content)
print(resp.usage.prompt_tokens, resp.usage.completion_tokens)
# cost control starts with token accounting

# streaming: the basis of typewriter UX and TTFT optimization
for chunk in client.chat.completions.create(model="deepseek-chat", messages=msgs, stream=True):
    delta = chunk.choices[0].delta.content
    if delta:
        print(delta, end="", flush=True)
        # every chunk is an incremental piece — splice deliberately
```

</template>

<template #js>

```js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // from the environment
  baseURL: "https://api.deepseek.com",
  // switching vendors = one line
});

const resp = await client.chat.completions.create({
  model: "deepseek-chat",
  messages: [
    { role: "system", content: "You are a rigorous legal assistant; answer only from the given texts." },
    { role: "user", content: "What is the maximum probation period by law?" },
  ],
  temperature: 0.2,
});
console.log(resp.choices[0].message.content);
console.log(resp.usage.prompt_tokens, resp.usage.completion_tokens);

const stream = await client.chat.completions.create({ model: "deepseek-chat", messages: msgs, stream: true });
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}
```

</template>

</CodeCompare>

> Python uses a synchronous `for` (or `async for` in async code); JS uses `for await`. The structure is nearly identical — `snake_case` becomes `camelCase` and `await` appears.

Raw APIs already build many apps; **frameworks buy you orchestration** — chains, retrieval, memory and tools as reusable patterns.

## 2. LangChain core abstractions: chains and prompts

<CodeCompare>

<template #python>

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

llm = ChatOpenAI(model="deepseek-chat", base_url="https://api.deepseek.com", temperature=0)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a {role}; answer within {limit} words."),
    ("user", "{question}"),
])

chain = prompt | llm | StrOutputParser()
# LCEL: the | pipes Runnables into chains
answer = chain.invoke({"role": "English teacher", "limit": 100, "question": "How does the subjunctive work?"})

# structured output: parseable JSON straight from the model (Pydantic defines the schema)
from pydantic import BaseModel

class Plan(BaseModel):
    steps: list[str]
    risk: str

structured = llm.with_structured_output(Plan)
# under the hood: tool-calling or JSON mode + validate & retry
plan: Plan = structured.invoke("Make a one-week Python study plan")
```

</template>

<template #js>

```js
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

const llm = new ChatOpenAI({ model: "deepseek-chat", configuration: { baseURL: "https://api.deepseek.com" }, temperature: 0 });
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a {role}; answer within {limit} words."],
  ["human", "{question}"],
]);

const chain = prompt.pipe(llm).pipe(new StringOutputParser());
// LCEL | → JS .pipe()
const answer = await chain.invoke({ role: "English teacher", limit: 100, question: "How does the subjunctive work?" });

import { z } from "zod";
// Zod ≈ Pydantic in JS
const Plan = z.object({ steps: z.array(z.string()), risk: z.string() });
const structured = llm.withStructuredOutput(Plan);
const plan = await structured.invoke("Make a one-week Python study plan");
```

</template>

</CodeCompare>

- Mindset: LangChain = "the Runnable protocol + a pile of adapters"; `invoke/stream/batch` run through every component. JS `.pipe()` is Python's `|`.
- Interview stance: frameworks are accelerators, not black boxes — **being able to say each abstraction is HTTP + prompt assembly + parse-retry underneath** is what survives the "could you do it without the framework" question.

## 3. RAG: knowledge-base QA (the #1 app-role exam topic)

<CodeCompare>

<template #python>

```python
# — offline indexing: load → split → embed → store —
from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

docs = DirectoryLoader("kb/", glob="**/*.pdf", loader_cls=PyPDFLoader).load()
splits = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50).split_documents(docs)
#                                       ↑ tune per script/language; overlap prevents mid-sentence cuts
vecstore = Chroma.from_documents(splits, OpenAIEmbeddings(model="text-embedding-v3"),
                                 collection_name="policy")

# — online answering: retrieve → augment → generate —
retriever = vecstore.as_retriever(search_kwargs={"k": 4})
rag_chain = (
    {"context": (lambda q: "\n\n".join(d.page_content for d in retriever.invoke(q))), "question": lambda q: q}
    | ChatPromptTemplate.from_template(
        "Answer only from the material; if absent, say so; cite by number.\n{context}\nQuestion: {question}")
    | llm | StrOutputParser()
)
print(rag_chain.invoke("What is the travel lodging allowance?"))
```

</template>

<template #js>

```js
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

const docs = await new PDFLoader("kb/policy.pdf").load();
const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
const splits = await splitter.splitDocuments(docs);
const store = await MemoryVectorStore.fromDocuments(splits, new OpenAIEmbeddings({ model: "text-embedding-v3" }));

const retriever = store.asRetriever({ k: 4 });
const ragChain = RunnableSequence.from([
  { context: async (q) => (await retriever.invoke(q)).map(d => d.pageContent).join("\n\n"), question: (q) => q },
  ChatPromptTemplate.fromTemplate("Answer only from the material:\n{context}\nQuestion: {question}"),
  llm,
  new StringOutputParser(),
]);
console.log(await ragChain.invoke("What is the travel lodging allowance?"));
```

</template>

</CodeCompare>

| RAG component | Python | JS |
| --- | --- | --- |
| Document loading | `PyPDFLoader` / `DirectoryLoader` | `PDFLoader` / `DirectoryLoader` |
| Splitting | `RecursiveCharacterTextSplitter` | `RecursiveCharacterTextSplitter` |
| Embeddings | `OpenAIEmbeddings` | `OpenAIEmbeddings` |
| Vector store | Chroma / FAISS / Milvus | MemoryVectorStore / Pinecone / Qdrant |
| Chain | LCEL `|` | `.pipe()` / `RunnableSequence` |

Engineering points (each one an interview expansion):

1. **Chunking strategy**: fixed → recursive separators → structural (Markdown headers / contract clauses); tables and code blocks handled specially.
2. **Retrieval quality trio**: hybrid search (BM25 + vector), reranking (bge-reranker: top20 → top4), metadata filters (time/department).
3. **Anti-hallucination trio**: "only from the material" prompt, low temperature, numbered citations in answers.
4. **Evaluation loop**: golden set from 50 questions; retrieval = hit rate, generation = faithfulness (RAGAS metrics) — rerun on every change; never tune by vibes.
5. LlamaIndex is the RAG-specialized alternative (richer data connectors); JS has the `llamaindex` package — concepts are isomorphic.

## 4. Agents: tool calling and autonomous planning

<CodeCompare>

<template #python>

```python
from langchain_core.tools import tool

@tool
def query_order(order_no: str) -> str:
    """Look up order status by order number."""
    # the docstring IS the tool manual the model reads — write it well!
    return order_service.status(order_no)

@tool
def refund(order_no: str, amount: float) -> str:
    """Refund the given order; amount must not exceed the paid total."""
    ...

from langgraph.prebuilt import create_react_agent

agent = create_react_agent(llm, [query_order, refund])
# loop: model picks a tool → framework executes → result fed back → model decides again, until final answer
result = agent.invoke({"messages": [("user", "Order SO123 arrived short — check it and refund the difference of $20")]})
```

</template>

<template #js>

```js
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const queryOrder = tool(async ({ orderNo }) => orderService.status(orderNo), {
  name: "query_order",
  description: "Look up order status by order number.",
  // ≈ Python docstring — the model reads this
  schema: z.object({ orderNo: z.string() }),
});

const agent = createReactAgent({ llm, tools: [queryOrder, refund] });
const result = await agent.invoke({ messages: [{ role: "user", content: "Order SO123 arrived short — check it and refund $20" }] });
```

</template>

</CodeCompare>

- **ReAct**: Reason → Act → Observe, looping — the agent's heartbeat.
- **LangGraph**: flows as state graphs (nodes = steps, edges = transitions) with branches/loops/human-in-the-loop (`interrupt`)/persistent checkpoints. JS counterpart: `@langchain/langgraph` — full parity.
- **Multi-turn memory**: history in Redis/DB keyed by `thread_id`; rolling-summarize long conversations (context-engineering concepts in the [Agent knowledge base](/en/agent/)).
- **Safety lines**: write-operations (refund/order) require **human confirmation** or allowlist caps; re-validate arguments tool-side (models confidently invent order numbers).
- **MCP**: the standardization protocol for tool ecosystems — one decorator in the Python SDK turns a function into an MCP tool; JS uses `@modelcontextprotocol/sdk`. Concepts in the [Agent MCP chapter](/en/agent/mcp-tools).

## 5. Prompt engineering and context management

- Structured prompt template: role / task / constraints / output format / few-shot examples — five sections; **format consistency of examples beats their quantity**. JS `ChatPromptTemplate.fromMessages` is the same API.
- Long-context strategy: bigger windows aren't better — "lost in the middle"; keep critical content at head and tail; summarize beyond the window.
- Cost control: stable content (system prompts, RAG material) as prefix hits prompt caching; route tiers — cheap model/rules first, escalate when hard.
- Eval sets are the moat: every prompt change replays the fixed case set; LangSmith/Langfuse trace inputs, outputs and token cost per call (JS uses the Langfuse JS SDK too).

## 6. Fine-tuning: the app-engineer's sufficient version

| Route | What | When |
| --- | --- | --- |
| Prompt/RAG | weights untouched | **default** — knowledge via RAG, behavior via prompts |
| LoRA/QLoRA | freeze base, train low-rank adapters (an order of magnitude less VRAM, single GPU) | domain tone / fixed formats / style, once RAG demonstrably can't |
| Full SFT | all-weight continued training | mostly a compute-lords' game, not app roles |
| RLHF/DPO | preference alignment | concept awareness is enough |

```python
# hands-on gist (unsloth / LLaMA-Factory compress the flow to a few lines):
# data = jsonl instruction/output pairs; 500-2000 clean samples beat 10k dirty ones
# train = LoraConfig(r=16, target_modules=["q_proj","v_proj"]) + 2-3 epochs
# accept = hold out 10% for blind A/B against the base model; watch for catastrophic forgetting
```

**JS counterpart:** fine-tuning has essentially no native JS solution — it relies on the CUDA/PyTorch ecosystem. The realistic JS-dev path: **fine-tune in Python → export the model → do inference and product integration in JS/TS**. Know the division of labor; don't hunt for LoRA in JS.

Interview line: "RAG first, fine-tune later — fine-tuning changes how a model speaks, not what it knows; refreshing knowledge by retraining is a disaster." That sentence beats 80% of the field.

## 7. Self-check

1. Why can't streaming chunks be stored as complete text? How is TTFT optimized? (JS `for await` counterpart?)
2. What protocol hides behind LCEL's `|`? invoke vs stream vs batch scenarios? (JS `.pipe()`)
3. Walk the full RAG chain: component options and trade-offs at each link.
4. How are chunk_size/overlap decided? How does evaluation drive the tuning?
5. When does a ReAct loop end? How do you cap runaway loops (max steps/budget)?
6. Why do tool docstrings matter? Safety design for write-side tools?
7. RAG vs fine-tuning — the boundary in one sentence?
8. Why must stable content sit at the prefix for prompt caching?

Next stop → [AI Engineering & Job Hunting](./ai-engineering): demo into service, study into offer.
