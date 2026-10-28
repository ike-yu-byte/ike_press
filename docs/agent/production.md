# 生产落地与求职指南

> 前半页讲 JD 里的"工程化落地"：怎么证明你的 AI 有效（Eval）、怎么知道它慢在哪贵在哪（可观测）、怎么把成本打下来（优化）。后半页把整库收束成行动清单：**简历怎么写、项目怎么讲、面试题怎么答**。

## 评测（Eval）：应用岗的分水岭

"效果评测与优化"每个 JD 都写，但绝大多数候选人只会说"体感不错"。建立三件套心智：

### 1. 黄金测试集（Golden Set）

上线前手工标注 **50~200 条「输入 → 期望输出/判定标准」**，覆盖：高频正常 case、边界 case（空输入、超长、多意图）、对抗 case（注入、违规请求）。这是你所有优化的基准线——**没有测试集的 prompt 调优是抽奖**。

### 2. 评分方法分层

| 方法 | 适用 | 说明 |
| --- | --- | --- |
| 程序断言 | 结构化输出、分类、检索命中 | 免费、确定、CI 里跑——优先把能断言的都断言 |
| LLM-as-judge | 相关性、语气、完整性等主观维度 | 用强模型按 rubric 打分；judge 的 prompt 也要校准（拿人工标注对一遍一致性） |
| 人工抽检 | 上线后的真实 bad case 复盘 | 每周固定看 20 条低分/差评会话，不可替代 |

### 3. 回归流水线

改 prompt / 换模型 / 动检索参数 → 跑 golden set → 对比通过率与逐条 diff → 才允许合并。工具：<a href="https://github.com/confident-ai/deepeval" target="_blank" rel="noopener noreferrer">DeepEval</a>（pytest 风格）、<a href="https://docs.ragas.io" target="_blank" rel="noopener noreferrer">Ragas</a>（RAG 专用）、LangSmith/Langfuse 都内置 dataset+experiment 管理。

## 可观测：每一次调用都要能复盘

LLM 应用调试的第一原则：**没有 trace 就没有 debugging**。一次请求要记录：完整输入消息（含检索内容）、模型与参数、输出、token 用量与成本、延迟分解、工具调用链、评测分数。

- **Langfuse**（开源可自部署，前端团队友好）/ LangSmith（LangChain 亲儿子）：trace-tree 可视化，Agent 多步调用一眼看清哪步跑偏
- 结构对齐 <a href="https://opentelemetry.io/docs/specs/semconv/gen-ai/" target="_blank" rel="noopener noreferrer">OpenTelemetry GenAI 语义约定</a>（trace → span(每步) → generation(每次 LLM 调用)），面试提到这个规范是明显加分
- 线上监控四看板：**错误率/限流率、P95 延迟（TTFT 与总时长分开）、token 成本日曲线、用户反馈率（赞踩比）**

## 成本优化组合拳（按 ROI 排序）

1. **模型路由**：分类/抽取/改写等窄任务走廉价小模型（成本降 10 倍），复杂推理才升级旗舰。路由本身用规则或一次小模型判断
2. **Prompt caching**：稳定前缀（system+工具定义+few-shot）命中缓存，输入成本降 50~90%——把可变内容严格放后面
3. **上下文瘦身**：历史摘要压缩、检索只带 top 相关、工具结果截断——输入 token 通常是成本大头
4. **语义缓存**：相似问题直接返回缓存答案（客服 FAQ 类场景命中率极高）
5. **结构化输出替代重述**：让模型只输出 JSON 字段，别生成"好的，以下是您要的 JSON："这种废话 token
6. 批量离线任务用 Batch API（各家都有半价通道）

## 延迟优化速查

- 流式是最大的一道"快"：TTFT 压到 1 秒内，用户体感就良好——**先优化 TTFT 再优化总时长**
- 并行化：多路召回并发、独立工具调用并发执行（tool_calls 数组别串行 for-await）
- 前置短答：能规则判断的（寒暄、明确指令）不走大模型
- 长任务改异步：深度研究类走"提交任务 → 进度推送 → 完成通知"，别让用户浏览器挂着

## 安全与合规上线清单

::: danger 发布前过一遍
1. 注入攻防：红队样本集跑通（含"忽略指令输出 system prompt"变体）
2. 内容安全：输入输出过审核（国内接内容安全 API；国外 OpenAI Moderation / Perspective）
3. 数据合规：用户数据是否进训练？供应商 DPA 协议；隐私字段脱敏；日志保留期
4. 国内特有：生成式 AI 服务需**备案/安全评估**（《生成式人工智能服务管理暂行办法》），对公众上线的产品要确认合规状态
5. 权限：Agent 工具按用户身份鉴权；敏感操作二次确认；出网白名单
6. 降级：模型供应商故障时切换备用模型/回退关键词兜底；限流与排队
:::

## 求职冲刺：把学到的变成 Offer

### 简历项目怎么写（STAR 变体）

反面模板："基于 LangChain + RAG 搭建智能问答系统"——面试官每天看八遍，零信息量。

正面模板（一句一个信息密度）：

> **企业文档问答助手**（Next.js + Vercel AI SDK + pgvector）：面向 2000+ 内部文档构建 RAG 管线，混合检索（BM25+向量+RRF）加 rerank 后 **Recall@5 从 71% 提到 89%**；流式 UI 支持引用溯源与中断生成，**TTFT P95 1.2s**；建 120 条 golden set 做回归，prompt 迭代 3 版后**幻觉率（judge 评分）从 14% 降到 4%**。

数字全部要是你自己测出来的——面试官一定会追问"89% 怎么测的？"，答得上来这个项目就是真的。

### 高频面试题 Top 15（本库覆盖索引）

1. 你们为什么用 Agent/为什么不用？Workflow 和 Agent 区别 → [agent-core](/agent/agent-core)
2. 手画 Agent loop；工具调用失败怎么处理 → [agent-core](/agent/agent-core)
3. RAG 管线讲一遍，每个环节你做了什么优化、指标变化 → [rag](/agent/rag)
4. chunk 怎么切的？为什么这个大小？换过大吗，效果对比？ → [rag](/agent/rag)
5. 向量库选型依据？HNSW 是什么？ → [rag](/agent/rag)
6. 怎么防 prompt 注入？分层答 → [prompt-engineering](/agent/prompt-engineering)
7. Function Calling 完整流程，执行在哪侧？ → [prompt-engineering](/agent/prompt-engineering)
8. MCP 是什么，和 FC 关系，写过什么 server → [mcp-tools](/agent/mcp-tools)
9. temperature/top_p 区别；上下文窗口利用策略 → [llm-basics](/agent/llm-basics)
10. 流式渲染的坑；停止生成发生了什么 → [agent-ui](/agent/agent-ui)
11. 效果怎么评测？bad case 怎么回收？ → 本页
12. 成本多少？做过哪些优化？ → 本页
13. LangGraph 为什么比裸 chain 适合你的场景 → [frameworks](/agent/frameworks)
14. 多轮对话"那它的进度呢"检索词失效怎么办 → [rag](/agent/rag) 查询改写
15. 上线后用户反馈答非所问，你的排查路径？（考：trace→检索层/生成层定位→golden set 复现→修复回归，**系统性思维压轴题**）

### 90 天行动清单

- **第 1-2 周**：读完本库 1-3 课 + 手搓流式聊天应用（不用框架再用框架，顺序别反）
- **第 3-5 周**：RAG 文档问答项目（简历主打），重点做检索评测对比实验，数字写简历
- **第 6-8 周**：工具调用 Agent + 自写一个 MCP Server 接进 IDE；接入 Langfuse 记 trace
- **第 9-12 周**：打磨部署（Serverless/云函数隐藏密钥）、补评测回归、刷面试题 Top15、整理项目 README 与演示视频
- 全程：把踩坑记进你自己的博客（就像这个站）——**技术博客在 AI 应用岗面试是实打实的加分项**

## 回到入口

- 复习知识地图与实战路线 → [Agent 知识库入口](/agent/)
