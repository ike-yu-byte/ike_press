# 大模型应用开发（LLM App / LangChain / RAG / Agent）

> 第 6 站：2026 招聘市场的当红炸子鸡。这一站把前五站全部变现：Python 工程（1-2 站）+ API 服务（3 站）+ 数据处理（4 站）+ 模型心智（5 站）= LLM 应用开发。概念体系与本站 [Agent 知识库](/agent/) 完全互通，本章聚焦 **Python 侧的落地写法**。

## 一、直接调用模型 API：一切的地基

```python
# openai-python SDK 是事实标准——通义/DeepSeek/Kimi/GLM/Ollama 全部提供 OpenAI 兼容端点
from openai import OpenAI

client = OpenAI(
    api_key="sk-...",                      # 环境变量注入，永不进 git
    base_url="https://api.deepseek.com",   # 换服务商只改这一行
)

resp = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "system", "content": "你是严谨的法规助手，只依据给定条文回答。"},
        {"role": "user", "content": "试用期最长可以约定多久？"},
    ],
    temperature=0.2,                       # 事实型任务调低
    stream=False,
)
print(resp.choices[0].message.content)
print(resp.usage.prompt_tokens, resp.usage.completion_tokens)   # 成本从 token 统计开始

# 流式：打字机效果与首字延迟(TTFT)优化的基础
for chunk in client.chat.completions.create(model="deepseek-chat", messages=msgs, stream=True):
    delta = chunk.choices[0].delta.content
    if delta:
        print(delta, end="", flush=True)   # 每个 chunk 是增量片段——拼接逻辑自己写清
```

裸 API 已够写很多应用；**框架解决的是"编排"**——多步链路、检索、记忆、工具这些模式化脏活。

## 二、LangChain 核心抽象：链与提示模板

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

llm = ChatOpenAI(model="deepseek-chat", base_url="https://api.deepseek.com", temperature=0)

prompt = ChatPromptTemplate.from_messages([
    ("system", "你是{role}，输出不超过{limit}字。"),
    ("user", "{question}"),
])

chain = prompt | llm | StrOutputParser()          # LCEL 管道符：| 把 Runnable 串成链
answer = chain.invoke({"role": "英语老师", "limit": 100, "question": "虚拟语气怎么用？"})

# 结构化输出：让模型直接产出可解析的 JSON（Pydantic 定义 schema）
from langchain_core.runnables import RunnableLambda
from pydantic import BaseModel

class Plan(BaseModel):
    steps: list[str]
    risk: str

structured = llm.with_structured_output(Plan)     # 底层：工具调用或 JSON mode + 校验重试
plan: Plan = structured.invoke("制定一周学习 Python 的计划")
```

- 心智：LangChain = "Runnable 协议 + 各家适配器"；`invoke/stream/batch` 三接口贯穿一切组件。
- 面试口径：框架是加速器不是黑盒——**能说清每个抽象底下就是 HTTP 调用 + Prompt 拼接 + 解析重试**，才不会被"离开框架还会不会"问倒。

## 三、RAG：知识库问答（应用岗第一大考点）

```python
# —— 离线索引：加载 → 切分 → 向量化 → 入库 ——
from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

docs = DirectoryLoader("kb/", glob="**/*.pdf", loader_cls=PyPDFLoader).load()
splits = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50).split_documents(docs)
#                                       ↑ 中文场景按字符调小；overlap 防语义切断
vecstore = Chroma.from_documents(splits, OpenAIEmbeddings(model="text-embedding-v3"),
                                 collection_name="policy")

# —— 在线问答：检索 → 增强 → 生成 ——
from langchain_classic.retrievers import ContextualCompressionRetriever

retriever = vecstore.as_retriever(search_kwargs={"k": 4})
rag_chain = (
    {"context": (lambda q: "\n\n".join(d.page_content for d in retriever.invoke(q))), "question": lambda q: q}
    | ChatPromptTemplate.from_template(
        "仅依据以下资料回答，资料没有就明说不知道，并给出引用编号：\n{context}\n问题：{question}")
    | llm | StrOutputParser()
)
print(rag_chain.invoke("差旅住宿标准是多少？"))
```

工程要点（每条都是面试展开点）：

1. **切分策略**：固定长度 → 递归分隔符 → 按结构（Markdown 标题/合同条款）切；表格和代码块单独处理。
2. **检索质量三板斧**：混合检索（BM25 + 向量）、重排 rerank（bge-reranker 精排 top20→top4）、元数据过滤（时间/部门）。
3. **防幻觉三件套**：Prompt 限定"只依据资料"、低 temperature、答案带引用编号可回溯。
4. **评估闭环**：golden set 50 题起步，检索看命中率，生成看忠实度（RAGAS 的 faithfulness/relevance 指标）——改一版参数跑一遍，别凭感觉调。
5. LlamaIndex 是 RAG 特化替代者（数据连接器更丰富）；两者概念同构，会一个另一个半天上手。

## 四、Agent：工具调用与自主规划

```python
from langchain_core.tools import tool

@tool
def query_order(order_no: str) -> str:
    """按订单号查询订单状态。"""          # docstring 就是给模型看的工具说明书——写清楚！
    return order_service.status(order_no)

@tool
def refund(order_no: str, amount: float) -> str:
    """对指定订单发起退款，金额不得超过实付金额。"""
    ...

from langgraph.prebuilt import create_react_agent

agent = create_react_agent(llm, [query_order, refund])
# 循环：模型决定调哪个工具 → 框架执行 → 结果回填 → 模型再决策，直到给出最终答案
result = agent.invoke({"messages": [("user", "订单 SO123 签收少件，帮我查单并退差价 20 元")]})
```

- **ReAct 模式**：Reason（想）→ Act（调工具）→ Observe（看结果）循环——Agent 的心脏。
- **LangGraph**（LangChain 官方推的编排层）：把流程画成状态图（节点=步骤，边=转移），支持分支/循环/人工确认节点（`interrupt`）/持久化 checkpoint——生产级 Agent 的事实标准之一。
- **多轮记忆**：会话历史存 Redis/DB，按 `thread_id` 恢复；长对话做摘要压缩（见 [Agent 知识库 memory 章](/agent/memory-context)）。
- **安全红线**：退款/下单类写操作必须**人工确认**或白名单限额；工具侧二次校验参数（模型会自信地编造订单号）。
- **MCP**：工具生态的标准化协议——Python SDK 一行装饰器把函数变 MCP 工具，跨应用复用；概念见 [Agent 知识库 MCP 章](/agent/mcp-tools)。

## 五、Prompt 工程与上下文管理

- 结构化 Prompt 模板：角色 / 任务 / 约束 / 输出格式 / few-shot 示例五段式；few-shot 示例的**格式一致性**比数量重要。
- 长上下文策略：窗口不是越大越好——"lost in the middle"，关键信息放头尾；超窗口的对话做**滚动摘要**。
- 缓存省钱：稳定内容（系统提示、RAG 资料）放前缀命中 prompt cache；路由分层——简单问题走小模型/规则，复杂再升级。
- 评测集是护城河：Prompt 每次改动跑固定 case 集回归，LangSmith/Langfuse 追踪每次调用的输入输出与 token 成本。

## 六、微调：应用工程师的够用版

| 路线 | 是什么 | 什么时候用 |
| --- | --- | --- |
| Prompt/RAG | 不动模型权重 | **默认选择**——知识注入用 RAG，行为调整用 Prompt |
| LoRA/QLoRA | 冻结原模型，训练低秩旁路（显存降一个量级，单卡可跑） | 领域话术/固定格式/风格统一，RAG 解决不了时 |
| 全参 SFT | 全权重继续训练 | 基本与工程岗无缘，算力大户游戏 |
| RLHF/DPO | 偏好对齐 | 知道概念即可 |

```python
# 实操体感（unsloth/LLaMA-Factory 类工具把流程压到几行）：
# 数据 = jsonl 的 instruction/output 对，500-2000 条高质量样本 > 万条脏数据
# 训练 = LoraConfig(r=16, target_modules=["q_proj","v_proj"]) + 2-3 epoch
# 验收 = 留 10% 数据做盲测对比基座模型；警惕灾难性遗忘（通用能力下降）
```

面试话术："我们场景先 RAG 后微调——微调只解决'怎么说'，不解决'知道什么'，知识更新靠重训是灾难"——这句能击败 80% 竞争者。

## 七、本章自检清单

1. 流式响应的 chunk 为什么不能直接当完整文本存？TTFT 怎么优化？
2. LCEL 的 `|` 背后是什么协议？invoke/stream/batch 各适合什么场景？
3. RAG 完整链路讲一遍，每环的可选组件与权衡？
4. chunk_size/overlap 怎么定？评估怎么指导调参？
5. ReAct 循环的终止条件？死循环怎么防（最大步数/预算）？
6. 工具 docstring 为什么重要？写操作工具的安全设计？
7. RAG vs 微调的分界线一句话？
8. Prompt cache 为什么要求稳定内容放前缀？

下一站 → [AI 工程化与求职](./ai-engineering)：把 demo 变成服务，把学习变成 offer。
