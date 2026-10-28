# AI Engineering & Job Hunting

> Stop 7 (the last one): turn demos into services and study into offers. FastAPI is the de-facto standard for serving Python AI — the final stop uses it to close out every skill before it.

## 1. FastAPI: modern Python's web answer

```python
# main.py — type annotations ARE validation ARE documentation; async native
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

app = FastAPI(title="Policy Bot", version="1.0")

class AskIn(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    session_id: str = "default"

@app.post("/api/ask")
async def ask(body: AskIn):
    answer = await rag_service.answer(body.question, body.session_id)
    return {"answer": answer}

@app.get("/api/ask/stream")
async def ask_stream(q: str, session_id: str = "default"):
    async def gen():
        async for chunk in rag_service.answer_stream(q, session_id):
            yield {"data": chunk}            # SSE: token by token to the frontend
    return EventSourceResponse(gen())

@app.get("/healthz")                          # probe endpoint: orchestrators check liveness
async def health():
    return {"status": "ok"}
```

- Run: `uvicorn main:app --reload` (dev) / `--workers 4` (prod, under a Gunicorn manager).
- The three-piece mindset: **Pydantic models = request/response contracts** (free 422 validation + free OpenAPI docs at `/docs`); **Depends = dependency injection** (DB sessions, current user — the same destination as Spring's DI by a different road); **async endpoints = high-concurrency IO** (model calls are slow IO — exactly where async pays).
- Injection example:

```python
from typing import Annotated
from sqlalchemy.ext.asyncio import AsyncSession

async def get_db():
    async with SessionFactory()() as session:
        yield session                          # request-scoped lifecycle: open on entry, close on exit

async def current_user(token: str, db: Annotated[AsyncSession, Depends(get_db)]):
    uid = verify_jwt(token)                    # failures raise HTTPException(401)
    return await db.get(User, uid)
```

## 2. The engineering problems AI services bring

| Problem | Playbook |
| --- | --- |
| Model latency (seconds to minutes) | SSE streaming to cut perceived delay; long jobs to an async queue (Celery/ARQ + Redis) — return task_id, poll or push |
| Upstream rate limits / timeouts / flakiness | exponential-backoff retries (idempotent calls only), mandatory timeouts, degradation path (backup model / cached answers) |
| Runaway cost | token accounting into logs, per-user quotas (Redis counters), cheap-model routing, prompt caching |
| Traffic crushing inference | request queueing + batching (vLLM continuous batching), semaphore caps |
| Uncontrolled output | structured output + Pydantic re-validation, PII/sensitive-word egress filters, injection checks (user input never joins the system prompt) |
| Ungreppable failures | log trace_id + full prompt + token usage per call (LangSmith/Langfuse); bad cases graduate into the regression set |

```python
# minimal timeout + retry posture (raw SDK)
from openai import OpenAI, APIStatusError
client = OpenAI(timeout=httpx.Timeout(30.0, connect=5.0), max_retries=2)   # SDK retries with backoff
try:
    resp = client.chat.completions.create(...)
except APIStatusError as e:
    if e.status_code == 429: ...        # rate-limited: back off or switch channel
```

## 3. Deployment: laptop to production

```dockerfile
# Dockerfile — multi-stage + slim base
FROM python:3.12-slim AS builder
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN pip install uv && uv export --frozen | uv pip install --system -r -   # lock file = exact reproduction

FROM python:3.12-slim
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY app/ ./app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- **CPU services** (apps calling cloud model APIs): ordinary containers + K8s HPA on QPS — identical to deploying Java microservices.
- **GPU inference** (self-hosted open models): **vLLM** turns an HF model into an OpenAI-compatible server in one command (`vllm serve Qwen/Qwen2.5-14B-Instruct`); continuous batching + quantization (AWQ/GPTQ) max out throughput. VRAM budget: weights (7B ≈ 14GB fp16) + KV cache.
- Develop locally against Ollama in place of the GPU endpoint — a config change, zero code change.
- Config and secrets via environment (12-Factor); `.env` gitignored; pre-launch run `bandit` (security static scan) + `pip-audit` (dependency CVEs).

## 4. Résumé and interviews (2026 Python/AI stance)

**Project bullets** (anti-pattern → pattern):

- ❌ "Built a chatbot with LangChain" — undetailable, instantly read as tutorial level.
- ✅ "Enterprise KB QA: 5k docs chunked & indexed; hybrid retrieval + rerank lifted top-4 hit rate 71%→92%; SSE streaming with TTFT <800ms; 120-question golden set as regression gate across 6 prompt iterations; per-user token quotas cut the monthly bill 40%."
- Formula = **scenario + selection rationale + quantified outcome + engineering guardrails**, two lines per project max.

**Honest skills list** (app roles):

```
Python (3 yrs): type hints / asyncio / pytest, full engineering hygiene
Web: two FastAPI services in production; Flask/Django, WSGI/ASGI differences understood
Data: daily Pandas/NumPy cleaning & modeling; solid SQL (window functions, plans)
AI: one shipped LLM product (LLM API / RAG / Agent via LangChain+LangGraph);
    reads PyTorch training code; ran one LoRA experiment; aware of vLLM serving
```

**The common interview path** (this stop → whole-library index):

1. Python basics: GIL / decorators / generators / copy semantics → [Advanced](./python-advanced)
2. Async: coroutine mechanics, gather, why sync sleep freezes the loop → [Advanced](./python-advanced)
3. Framework comparison: Flask/Django/FastAPI selection → [Flask](./flask) / [Django](./django)
4. Pandas scenario questions: missing values, groupby, OOM frames → [Data](./data-analysis)
5. ML concepts: overfitting, metrics, cross-validation → [ML](./ml-dl)
6. RAG full-chain walkthrough + "what bit you" (always probed — prepare two real war stories) → [LLM apps](./llm-dev)
7. Agent safety and cost governance → [LLM apps](./llm-dev) / section 2 above
8. Project deep-dive: architecture, how metrics were measured, next optimizations → through-line projects ([entry page](./index) section 4)

## 5. After the seven stops: three forks

| Direction | What to add | Library resources |
| --- | --- | --- |
| AI application engineer (mainstream demand now) | deeper RAG/Agent engineering, multimodal, evaluation systems | every chapter of the [Agent knowledge base](/en/agent/) |
| AI platform / backend (Java/Go background wins) | model gateways, scheduling, GPU pooling | [Java microservices/distributed](../java/microservices) |
| Algorithm engineer (high bar: degrees/papers) | math, paper reproductions, distributed training | PyTorch/transformers source mastery |

> Finishing the seven stops isn't measured by "read everything" — it's the entry page's through-line projects **all running and all explainable**. Good luck out there.
