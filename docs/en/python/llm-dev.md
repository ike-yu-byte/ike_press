# LLM Application Development (LLM Apps / LangChain / RAG / Agents)

> Stop 6: 2026's hottest job title. This stop cashes in everything before it: Python engineering (1-2) + API services (3) + data processing (4) + model intuition (5) = LLM app development. The concept system matches this site's [Agent knowledge base](/en/agent/) one-to-one; this chapter focuses on **the Python-side implementation**.

## 1. Calling model APIs directly: the ground floor

```python
# the openai-python SDK is the de-facto standard — Qwen/DeepSeek/Kimi/GLM/Ollama all expose OpenAI-compatible endpoints
from openai import OpenAI

client = OpenAI(
    api_key="sk-...",                      # from the environment; never into git
    base_url="https://api.deepseek.com",   # switching vendors = changing this one line
)

resp = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "system", "content": "You are a rigorous legal assistant; answer only from the given texts."},
        {"role": "user", "content": "What is the maximum probation period by law?"},
    ],
    temperature=0.2,                       # factual tasks: keep it low
    stream=False,
)
print(resp.choices[0].message.content)
print(resp.usage.prompt_tokens, resp.usage.completion_tokens)   # cost control starts with token accounting

# streaming: the basis of typewriter UX and TTFT optimization
for chunk in client.chat.completions.create(model="deepseek-chat", messages=msgs, stream=True):
    delta = chunk.choices[0].delta.content
    if delta:
        print(delta, end="", flush=True)   # every chunk is an incremental piece — splice deliberately
```

Raw APIs already build many apps; **frameworks buy you orchestration** — chains, retrieval, memory and tools as reusable patterns.

## 2. LangChain core abstractions: chains and prompts

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

llm = ChatOpenAI(model="deepseek-chat", base_url="https://api.deepseek.com", temperature=0)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a {role}; answer within {limit} words."),
    ("user", "{question}"),
])

chain = prompt | llm | StrOutputParser()          # LCEL: the | pipes Runnables into chains
answer = chain.invoke({"role": "English teacher", "limit": 100, "question": "How does the subjunctive work?"})

# structured output: parseable JSON straight from the model (Pydantic defines the schema)
from pydantic import BaseModel

class Plan(BaseModel):
    steps: list[str]
    risk: str

structured = llm.with_structured_output(Plan)     # under the hood: tool-calling or JSON mode + validate & retry
plan: Plan = structured.invoke("Make a one-week Python study plan")
```

- Mindset: LangChain = "the Runnable protocol + a pile of adapters"; `invoke/stream/batch` run through every component.
- Interview stance: frameworks are accelerators, not black boxes — **being able to say each abstraction is HTTP + prompt assembly + parse-retry underneath** is what survives the "could you do it without the framework" question.

## 3. RAG: knowledge-base QA (the #1 app-role exam topic)

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

Engineering points (each one an interview expansion):

1. **Chunking strategy**: fixed → recursive separators → structural (Markdown headers / contract clauses); tables and code blocks handled specially.
2. **Retrieval quality trio**: hybrid search (BM25 + vector), reranking (bge-reranker: top20 → top4), metadata filters (time/department).
3. **Anti-hallucination trio**: "only from the material" prompt, low temperature, numbered citations in answers.
4. **Evaluation loop**: golden set from 50 questions; retrieval = hit rate, generation = faithfulness (RAGAS metrics) — rerun on every change; never tune by vibes.
5. LlamaIndex is the RAG-specialized alternative (richer data connectors); the concepts are isomorphic — learn one, pick up the other in a day.

## 4. Agents: tool calling and autonomous planning

```python
from langchain_core.tools import tool

@tool
def query_order(order_no: str) -> str:
    """Look up order status by order number."""   # the docstring IS the tool manual the model reads — write it well!
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

- **ReAct**: Reason → Act → Observe, looping — the agent's heartbeat.
- **LangGraph** (LangChain's orchestration layer): flows as state graphs (nodes = steps, edges = transitions) with branches/loops/human-in-the-loop (`interrupt`)/persistent checkpoints — a de-facto standard for production agents.
- **Multi-turn memory**: history in Redis/DB keyed by `thread_id`; rolling-summarize long conversations (see the [Agent memory chapter](/en/agent/memory-context)).
- **Safety lines**: write-operations (refund/order) require **human confirmation** or allowlist caps; re-validate arguments tool-side (models confidently invent order numbers).
- **MCP**: the standardization protocol for tool ecosystems — one decorator in the Python SDK turns a function into an MCP tool; concepts in the [Agent MCP chapter](/en/agent/mcp-tools).

## 5. Prompt engineering and context management

- Structured prompt template: role / task / constraints / output format / few-shot examples — five sections; **format consistency of examples beats their quantity**.
- Long-context strategy: bigger windows aren't better — "lost in the middle"; keep critical content at head and tail; summarize beyond the window.
- Cost control: stable content (system prompts, RAG material) as prefix hits prompt caching; route tiers — cheap model/rules first, escalate when hard.
- Eval sets are the moat: every prompt change replays the fixed case set; LangSmith/Langfuse trace inputs, outputs and token cost per call.

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

Interview line: "RAG first, fine-tune later — fine-tuning changes how a model speaks, not what it knows; refreshing knowledge by retraining is a disaster." That sentence beats 80% of the field.

## 7. Self-check

1. Why can't streaming chunks be stored as complete text? How is TTFT optimized?
2. What protocol hides behind LCEL's `|`? invoke vs stream vs batch scenarios?
3. Walk the full RAG chain: component options and trade-offs at each link.
4. How are chunk_size/overlap decided? How does evaluation drive the tuning?
5. When does a ReAct loop end? How do you cap runaway loops (max steps/budget)?
6. Why do tool docstrings matter? Safety design for write-side tools?
7. RAG vs fine-tuning — the boundary in one sentence?
8. Why must stable content sit at the prefix for prompt caching?

Next stop → [AI Engineering & Job Hunting](./ai-engineering): demo into service, study into offer.
