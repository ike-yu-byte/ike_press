# AI 工程化与求职

> 第 7 站（终点站）：把 demo 变成服务，把学习变成 offer。FastAPI 是 Python AI 服务化的事实标准——最后一站用它把前面所有能力收口。

## 一、FastAPI：现代 Python Web 的答案

```python
# main.py —— 类型注解即校验即文档，async 原生
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
            yield {"data": chunk}            # SSE：逐 token 推给前端
    return EventSourceResponse(gen())

@app.get("/healthz")                          # 探针端点：编排系统判断存活
async def health():
    return {"status": "ok"}
```

- 启动：`uvicorn main:app --reload`（开发）/ `--workers 4`（生产配 Gunicorn manager）。
- 三件套心智：**Pydantic 模型 = 请求/响应契约**（自动 422 校验 + OpenAPI 文档白送，`/docs` 即交互式 API 文档）；**Depends = 依赖注入**（DB 会话、当前用户，和 Spring 的 DI 殊途同归）；**async 端点 = 高并发 IO**（模型调用是典型慢 IO，异步收益最大）。
- 依赖注入示例：

```python
from typing import Annotated
from sqlalchemy.ext.asyncio import AsyncSession

async def get_db():
    async with SessionFactory()() as session:
        yield session                          # 请求级生命周期：进入建会话、结束自动关

async def current_user(token: str, db: Annotated[AsyncSession, Depends(get_db)]):
    uid = verify_jwt(token)                    # 401 抛 HTTPException
    return await db.get(User, uid)
```

## 二、AI 服务的特有工程问题

| 问题 | 对策 |
| --- | --- |
| 模型响应慢（秒级~分钟级） | 流式 SSE 降感知延迟；长任务转异步队列（Celery/ARQ + Redis），先回 task_id 再轮询/推送 |
| 上游限流/超时/抽风 | 指数退避重试（只重试幂等调用）、超时必设、降级兜底（备用模型/缓存答案） |
| 成本失控 | token 计量进日志、按用户配额（Redis 计数）、便宜模型路由、prompt cache |
| 并发压垮推理端 | 请求排队 + 批处理（vLLM continuous batching）、信号量限并发 |
| 输出不可控 | 结构化输出 + Pydantic 二次校验、敏感词/PII 出口过滤、注入检测（用户输入永不拼进 system） |
| 无法排障 | 每次调用记录 trace_id + prompt 全文 + token 用量（LangSmith/Langfuse），坏 case 进回归集 |

```python
# 超时与重试的最小姿势（裸 SDK）
from openai import OpenAI, APITimeoutError, APIStatusError
client = OpenAI(timeout=httpx.Timeout(30.0, connect=5.0), max_retries=2)   # SDK 自带指数退避
try:
    resp = client.chat.completions.create(...)
except APIStatusError as e:
    if e.status_code == 429: ...        # 限流：退避或切换备用渠道
```

## 三、部署：从笔记本到生产

```dockerfile
# Dockerfile —— 多阶段 + 轻量底座
FROM python:3.12-slim AS builder
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN pip install uv && uv export --frozen | uv pip install --system -r -   # 锁文件精确复现

FROM python:3.12-slim
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY app/ ./app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- **CPU 服务**（调云端模型 API 的应用）：普通容器 + K8s HPA 按 QPS 扩缩，与 Java 微服务部署无差别。
- **GPU 推理**（自托管开源模型）：**vLLM** 一条命令把 HF 模型变成 OpenAI 兼容服务（`vllm serve Qwen/Qwen2.5-14B-Instruct`），continuous batching + 量化（AWQ/GPTQ）把吞吐拉满；显存规划：模型权重（7B≈14GB fp16）+ KV Cache。
- 本地开发用 Ollama 顶替 GPU 端点，配置切换零代码改动。
- 配置与密钥全走环境变量（12-Factor）；`.env` 进 gitignore；上线前跑 `bandit`（安全静态扫）+ `pip-audit`（依赖漏洞）。

## 四、简历与面试（2026 Python/AI 岗口径）

**项目怎么写**（反例 → 正例）：

- ❌ "使用 LangChain 搭建聊天机器人" —— 描述不了细节就会被判 demo 水平。
- ✅ "企业知识库问答：5k 文档分块入库，混合检索+重排使 top4 命中率 71%→92%；SSE 流式输出 TTFT<800ms；golden set 120 题建回归评测，Prompt 迭代 6 版零回退；token 成本按用户配额，月账单降 40%"。
- 公式 = **场景 + 技术选型 + 量化结果 + 工程护栏**，每段项目两行以内。

**技能清单诚实版**（应用岗）：

```
Python（3 年）：类型注解/asyncio/pytest，工程化完整
Web：FastAPI 生产 2 个服务；了解 Flask/Django 与 WSGI/ASGI 差异
数据：Pandas/NumPy 日常清洗建模；SQL 熟练（窗口函数/执行计划）
AI：LLM API/RAG/Agent（LangChain+LangGraph）落地过 1 个线上项目；
    PyTorch 能读懂训练代码；LoRA 微调实验跑通；了解 vLLM 部署
```

**高频面试路径**（本站→全库索引）：

1. Python 基本功：GIL/装饰器/生成器/深浅拷贝 → [进阶章](./python-advanced)
2. 异步：协程原理、gather、async 里为什么不能 sleep 同步 → [进阶章](./python-advanced)
3. 框架对比：Flask/Django/FastAPI 选型 → [Flask](./flask) / [Django](./django)
4. Pandas 场景题：缺失值、groupby、大表内存 → [数据章](./data-analysis)
5. ML 概念：过拟合、评估指标、交叉验证 → [机器学习章](./ml-dl)
6. RAG 全链路展开 + 你踩过什么坑（必被追问，准备 2 个真实细节）→ [大模型章](./llm-dev)
7. Agent 安全与成本治理 → [大模型章](./llm-dev) / [工程章](./ai-engineering) 第二节
8. 项目深挖：架构图、指标怎么测的、下一步优化什么 → 贯穿项目路线（[入口页](./index)第四节）

## 五、学完之后：三条分叉

| 方向 | 补什么 | 本库资源 |
| --- | --- | --- |
| AI 应用工程师（当前主流需求） | 深化 RAG/Agent 工程、多模态、评测体系 | [Agent 知识库](/agent/) 全部章节 |
| AI 平台/后端（Java/Go 背景优势） | 模型网关、调度、GPU 资源池化 | [Java 库微服务/分布式](../java/microservices) |
| 算法工程师（门槛高，需学历/论文） | 数学、论文复现、分布式训练 | 深入 PyTorch/transformers 源码 |

> 学完 7 站的标志不是"看完了"，而是入口页第四节的贯穿项目**全部能跑起来、说清楚**。祝求职顺利。
