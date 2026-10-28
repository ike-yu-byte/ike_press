# Python → AI 开发知识库入口

> 一条从零基础到大模型应用开发的学习路径：Python 语言 → Web 框架（Flask/Django）→ 数据处理 → 机器学习/深度学习 → LLM 应用开发 → 工程化部署。每一站都有对应章节，按顺序学即可，不必纠结"下一步学什么"。

## 一、为什么是 Python 到 AI 这条路

- Python 是 AI 领域的**唯一通用货币**：模型训练（PyTorch）、应用开发（LangChain/LlamaIndex）、服务化（FastAPI）、数据处理（Pandas）全在 Python 生态里。
- 2026 招聘市场上，"AI 应用工程师 / LLM 应用开发"岗的核心要求是：**Python 工程能力 + 大模型 API/LangChain/RAG/Agent + 服务化部署**——不需要你会训练基础大模型，但要求你能把模型能力变成可用产品。
- Flask/Django 解决的是"会写脚本"到"会写服务"的中间跳：Web 请求、数据库、鉴权、部署这些工程能力，在任何后端/AI 岗都是地基。

## 二、学习顺序总览（六站路线）

```
第 1 站 语言基础        第 2 站 语言进阶        第 3 站 Web 框架
Python 语法/OOP   →   并发/装饰器/工程化  →   Flask 最小可用 → Django 全家桶
（2-3 周）             （2-3 周）              （各 2-3 周）
                                                        ↓
第 6 站 工程与求职       第 5 站 大模型应用        第 4 站 数据处理
部署/监控/简历项目   ←   LangChain/RAG/Agent  ←   NumPy/Pandas/MySQL/Redis
（持续）                （3-4 周）              （2-3 周）
```

| 站 | 章节 | 学完能做什么 | 建议时长 |
| --- | --- | --- | --- |
| 1 | [Python 基础入门](./python-basics) | 写出正确的脚本：数据类型、流程控制、函数、面向对象、异常、文件 | 2-3 周 |
| 2 | [Python 进阶与工程化](./python-advanced) | 写出地道的 Python：生成器、装饰器、类型注解、并发/异步、虚拟环境 | 2-3 周 |
| 3a | [Flask Web 开发](./flask) | 独立搭一个 REST API 服务：路由、蓝图、SQLAlchemy、鉴权 | 2 周 |
| 3b | [Django 全栈框架](./django) | 用"全家桶"快速做出带后台管理的完整站点：ORM、Admin、DRF | 3 周 |
| 4 | [数据处理三件套](./data-analysis) | NumPy 向量化、Pandas 清洗分析、SQL/Redis 的 Python 姿势 | 2-3 周 |
| 5 | [机器学习与深度学习](./ml-dl) | sklearn 跑通建模全流程；PyTorch 理解张量/自动求导/训练循环 | 3-4 周 |
| 6 | [大模型应用开发](./llm-dev) | 调用 LLM API、LangChain/LlamaIndex、RAG、Agent、微调概念 | 3-4 周 |
| 7 | [AI 工程化与求职](./ai-engineering) | FastAPI 服务化、GPU/Docker 部署、监控、简历项目与面试清单 | 持续 |

**顺序的两条硬规则**：

1. **不要跳过第 2、4 站直奔 AI**——看不懂类型注解和 Pandas 的 AI 教程寸步难行；AI 岗面试一半时间在考 Python 工程与数据处理基本功。
2. **Web 框架站（3）与数据站（4）可以并行**；目标纯 AI 岗的，Flask 学最小可用即可，把时间留给第 5、6 站；目标后端岗的，Django/Flask 二选一深入。

## 三、市场 JD 对照（2026 Python/AI 应用岗）

| JD 上的写法 | 实际要求 | 对应章节 |
| --- | --- | --- |
| "Python 基础扎实，熟悉数据结构" | 可变/不可变、深浅拷贝、GIL、推导式、OOP、类型注解 | [基础](./python-basics) / [进阶](./python-advanced) |
| "熟悉 Flask/Django 至少一种" | 路由与中间件、ORM、REST 设计、鉴权、项目分层 | [Flask](./flask) / [Django](./django) |
| "熟悉 Pandas/NumPy 数据处理" | groupby/merge/透视表、向量化思维、缺失值处理 | [数据处理](./data-analysis) |
| "了解机器学习基本原理" | 监督/无监督、过拟合、评估指标、sklearn 流程 | [机器学习](./ml-dl) |
| "有 LangChain / RAG / Agent 开发经验" | 链式调用、向量库、检索策略、工具调用、多轮记忆 | [大模型应用](./llm-dev) |
| "熟悉 FastAPI / 模型服务化部署" | Pydantic 校验、异步端点、流式响应、Docker/GPU | [工程化](./ai-engineering) |
| "了解 PyTorch 优先"（算法岗） | Tensor 操作、autograd、训练循环、transformers 库 | [深度学习](./ml-dl) / [大模型应用](./llm-dev) |
| "有微调经验（LoRA/SFT）加分" | 概念+一次实操经历即可，应用岗不要求手推公式 | [大模型应用](./llm-dev) 微调节 |

## 四、贯穿项目路线（把六站串起来）

每个阶段做一个"能跑起来"的东西，比刷完所有教程有效十倍：

1. **第 1-2 站**：命令行工具——批量重命名/账单 CSV 汇总器（练文件 IO + argparse + 类型注解）。
2. **第 3 站**：Flask 或 Django 写一个"待办 API + 简单后台"，带 SQLite 和 token 鉴权。
3. **第 4 站**：拿一份真实公开数据集（如 Kaggle 泰坦尼克），Pandas 清洗 + 可视化 + 结论输出。
4. **第 5 站**：sklearn 对同一数据集做分类模型，交叉验证 + 混淆矩阵讲清效果。
5. **第 6-7 站（简历主打项目）**：**知识库问答机器人**——FastAPI + LangChain + RAG + 向量库 + 流式输出 + Docker 部署，完整走一遍"从模型 API 到线上服务"。这个项目与 Java 岗的 Spring AI 项目、前端 Agent 知识库互为印证，简历上按目标岗位挑一个主打。

## 五、学习资源

<div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;">
  <a href="https://docs.python.org/zh-cn/3/" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">Python 官方文档(中文)</a>
  <a href="https://flask.palletsprojects.com/" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">Flask 官方</a>
  <a href="https://docs.djangoproject.com/" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">Django 官方</a>
  <a href="https://fastapi.tiangolo.com/zh/" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">FastAPI 中文</a>
  <a href="https://pandas.pydata.org/docs/" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">Pandas 文档</a>
  <a href="https://pytorch.org/tutorials/beginner/basics/intro.html" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">PyTorch 入门教程</a>
  <a href="https://python.langchain.com/" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">LangChain 文档</a>
  <a href="https://huggingface.co/learn" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">HuggingFace 课程</a>
  <a href="https://www.liaoxuefeng.com/wiki/1016959663602400" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">廖雪峰 Python 教程</a>
</div>

## 六、常见版本与工具链速查（2026）

| 项 | 现状口径 |
| --- | --- |
| Python 版本 | 3.12/3.13 生产主流；3.14（2025-10 发布）带来实验性 free-threading（无 GIL 构建）与 JIT——面试提一句"知道 GIL 及其演进方向"即可 |
| 包/环境管理 | `venv` + pip 是基础；新项目推荐 **uv**（快 10-100 倍）或 poetry；conda 用于数据科学环境 |
| Web 框架 | Flask（轻）/ Django（全栈）/ **FastAPI（异步 + AI 服务化事实标准）** |
| 深度学习 | PyTorch 一统研究界，工业推理常见 ONNX/TensorRT |
| LLM 应用 | LangChain / LlamaIndex / 各家 SDK（openai-python 兼容多数国产模型）；概念体系见本站 [Agent 知识库](/agent/) |

> 前端同学转 AI：语言站（1-2）重点补 Python 与 JS 的心智差异（缩进即语法、GIL、动态类型+类型注解）；Web 站（3）与 Node/Express 概念一一对应，可快速带过。
