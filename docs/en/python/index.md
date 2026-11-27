# Python → AI Development Knowledge Base

> A learning path from zero to LLM application development: Python language → web frameworks (Flask/Django) → data processing → machine/deep learning → LLM app development → engineering & deployment. Every stop has a chapter; just follow the order instead of wondering "what next?".
>
> **For frontend devs**: every Python topic in this library comes with a **JS counterpart**, anchored in the Node/Express/TS/Zod/TF.js you already know. Read the JS comparison first, then note the Python differences — fastest path.

## 1. Why this Python-to-AI road

- Python is AI's **only common currency**: model training (PyTorch), app development (LangChain/LlamaIndex), serving (FastAPI), data processing (Pandas) — all live in the Python ecosystem.
- In the 2026 market, "AI Application Engineer / LLM App Developer" JDs core out at: **Python engineering + LLM APIs/LangChain/RAG/Agent + serving & deployment** — you need not train foundation models, but you must turn model capability into a usable product.
- Flask/Django bridge "can write scripts" to "can write services": HTTP, databases, auth, deployment — the foundation of any backend or AI role.

**JS↔Python cheat sheet (used throughout the library):**

| Python ecosystem | JS / TS counterpart | Key difference |
| --- | --- | --- |
| `python` + `.venv` + `pip/uv` | `node` + `node_modules` + `npm/pnpm` | Python isolates by interpreter, JS by project node_modules |
| indentation is syntax | `{}` braces | the first culture shock |
| `list` / `dict` / `set` | `Array` / `Object` / `Set` | `bool([])` is False in Python, `true` in JS |
| `def` / `lambda` | `function` / arrow functions | both first-class |
| `class A(B):` | `class A extends B` | syntax differs, semantics match |
| `try/except/finally` | `try/catch/finally` | Python has no `catch`, but has `else` |
| `typing` + Pydantic | TypeScript + Zod | compile-time + runtime validation, same two layers |
| Flask / Django / FastAPI | Express / NestJS | FastAPI's auto Pydantic docs ≈ NestJS + Swagger |
| NumPy / Pandas | mathjs / Danfo.js / Arquero | no native vectorization in JS; Python faster at scale |
| PyTorch / transformers | TF.js / Transformers.js | same concepts; real training still Python-first |
| LangChain / LangGraph | LangChain.js / LangGraph.js | APIs map almost 1:1 (`|` → `.pipe()`) |
| openai-python | openai-js | same request shape, plus `await` |
| uvicorn + Gunicorn | node + PM2/cluster | both need multiple processes for multi-core |
| celery + Redis | BullMQ + Redis | isomorphic async jobs |

## 2. The Learning Order (seven stops)

```
Stop 1  Language basics     Stop 2  Language advanced     Stop 3  Web frameworks
Python syntax/OOP      →   concurrency/decorators/eng. →  Flask minimal → Django batteries
(2-3 wks)                   (2-3 wks)                     (2-3 wks each)
                                                          ↓
Stop 7  Engineering & job   Stop 6  LLM applications      Stop 4  Data processing
deploy/monitoring/resume ←  LangChain/RAG/Agent      ←   NumPy/Pandas/MySQL/Redis
(ongoing)                   (3-4 wks)                     (2-3 wks)
```

| Stop | Chapter | What you'll be able to do | Suggested time |
| --- | --- | --- | --- |
| 1 | [Python Basics](./python-basics) | Correct scripts: types, control flow, functions, OOP, exceptions, files | 2-3 wks |
| 2 | [Advanced & Engineering](./python-advanced) | Idiomatic Python: generators, decorators, typing, concurrency, venvs | 2-3 wks |
| 3a | [Flask Web Development](./flask) | Stand up a REST API: routing, blueprints, SQLAlchemy, auth | 2 wks |
| 3c | [FastAPI Fundamentals](./fastapi) | Write a modern async API: validation, DI, streaming, OpenAPI/Dify | 2 wks |
| 3b | [Django Full-Stack](./django) | Ship an admin-bearing site fast: ORM, Admin, DRF | 3 wks |
| 4 | [Data Processing Trio](./data-analysis) | NumPy vectorization, Pandas cleaning, SQL/Redis the Python way | 2-3 wks |
| 5 | [Machine & Deep Learning](./ml-dl) | End-to-end sklearn modeling; PyTorch tensors/autograd/training loop | 3-4 wks |
| 6 | [LLM Application Development](./llm-dev) | LLM APIs, LangChain/LlamaIndex, RAG, Agents, fine-tuning concepts | 3-4 wks |
| 7 | [AI Engineering & Job Hunting](./ai-engineering) | FastAPI serving, GPU/Docker deployment, monitoring, résumé projects | ongoing |

**Two hard rules about the order**:

1. **Don't skip stops 2 and 4 to jump straight into AI** — AI tutorials full of type hints and Pandas are unreadable otherwise; half of any AI-role interview tests Python engineering and data fundamentals.
2. **Stops 3 and 4 can run in parallel**; pure-AI candidates: learn just enough Flask, save the time for stops 5-6; backend candidates: pick one of Django/Flask and go deep.

## 3. Market JD crosswalk (2026 Python/AI roles)

| JD wording | Actual requirement | Chapter |
| --- | --- | --- |
| "Solid Python fundamentals, familiar with data structures" | mutable/immutable, shallow/deep copy, GIL, comprehensions, OOP, typing | [Basics](./python-basics) / [Advanced](./python-advanced) |
| "Familiar with Flask or Django" | routing & middleware, ORM, REST design, auth, layering | [Flask](./flask) / [Django](./django) |
| "Pandas/NumPy for data processing" | groupby/merge/pivot, vectorized thinking, missing values | [Data](./data-analysis) |
| "Understand ML fundamentals" | supervised/unsupervised, overfitting, metrics, sklearn workflow | [ML](./ml-dl) |
| "LangChain / RAG / Agent experience" | chains, vector stores, retrieval strategies, tool calling, memory | [LLM apps](./llm-dev) |
| "FastAPI / model serving & deployment" | Pydantic validation, async endpoints, streaming, Docker/GPU | [FastAPI](./fastapi) / [Engineering](./ai-engineering) |
| "PyTorch preferred" (algo roles) | tensor ops, autograd, training loop, transformers library | [Deep learning](./ml-dl) / [LLM apps](./llm-dev) |
| "Fine-tuning (LoRA/SFT) a plus" | concepts + one hands-on run; app roles won't derive backprop | [LLM apps](./llm-dev) fine-tune section |

## 4. A through-line project route

Build one runnable thing per stage — ten times more effective than finishing every tutorial:

1. **Stops 1-2**: a CLI tool — bulk renamer / bill CSV summarizer (file IO + argparse + type hints). JS counterpart: `commander` + `fs`.
2. **Stop 3**: a "todo API + tiny admin" in Flask or Django with SQLite and token auth. JS counterpart: Express + Prisma + JWT middleware.
3. **Stop 4**: a real public dataset (Kaggle Titanic), Pandas cleaning + visualization + written conclusions. JS counterpart: Danfo.js + Chart.js.
4. **Stop 5**: a classifier on the same data with sklearn — cross-validation + confusion matrix explained. JS counterpart: TF.js runs the same concepts with a different toolchain.
5. **Stops 6-7 (the résumé centerpiece)**: a **knowledge-base QA bot** — FastAPI + LangChain + RAG + vector store + streaming + Docker, walking the whole "from model API to online service" path. JS counterpart: Next.js/Express + LangChain.js + Pinecone + SSE — but **build at least one FastAPI version**, since JDs explicitly require Python engineering. It cross-validates with the Spring AI project in the Java section and the Agent knowledge base; pick one lead project per target role.

## 5. Learning resources

<div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;">
  <a href="https://docs.python.org/3/" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">Python docs</a>
  <a href="https://flask.palletsprojects.com/" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">Flask docs</a>
  <a href="https://docs.djangoproject.com/" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">Django docs</a>
  <a href="https://fastapi.tiangolo.com/" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">FastAPI docs</a>
  <a href="https://pandas.pydata.org/docs/" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">Pandas docs</a>
  <a href="https://pytorch.org/tutorials/beginner/basics/intro.html" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">PyTorch tutorials</a>
  <a href="https://python.langchain.com/" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">LangChain docs</a>
  <a href="https://huggingface.co/learn" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">HuggingFace courses</a>
  <a href="https://js.langchain.com/" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">LangChain.js docs (for comparison)</a>
  <a href="https://www.tensorflow.org/js" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">TensorFlow.js (for comparison)</a>
</div>

## 6. Version & toolchain cheat sheet (2026)

| Item | State of play | JS counterpart |
| --- | --- | --- |
| Python version | 3.12/3.13 mainstream in production; 3.14 (released 2025-10) ships experimental free-threading (no-GIL build) and JIT — knowing "what the GIL is and where it's heading" suffices for interviews | Node 22 LTS |
| Env/package management | `venv` + pip as baseline; **uv** (10-100× faster) or poetry for new projects; conda for data science | npm/pnpm + package.json + lock |
| Web frameworks | Flask (light) / Django (full-stack) / **FastAPI (async; the de-facto standard for AI serving)** | Express (light) / NestJS (full-stack) / Hono (edge) |
| Deep learning | PyTorch dominates research; ONNX/TensorRT common for industrial inference | TF.js / Transformers.js (inference-first) |
| LLM apps | LangChain / LlamaIndex / vendor SDKs (openai-python is compatible with most domestic providers); concepts in this site's [Agent knowledge base](/en/agent/) | LangChain.js / LangGraph.js / openai-js |

> Switching from frontend: at stops 1-2 focus on the JS↔Python mental gaps (indentation-as-syntax, the GIL, dynamic types + annotations); stop 3 maps one-to-one onto Node/Express concepts and can be skimmed. **Every stop now has a JS comparison — read that first, then the Python original.**
