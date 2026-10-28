# Agent 核心原理

> "任务规划、工具调用、记忆机制、多轮对话管理、自主决策"——几乎每个 Agent 岗 JD 都有这句。这一课把这句话拆开：给 LLM 加上**循环、工具和记忆**，你就得到了 Agent。我们会先徒手实现一个最小可用的，再谈模式与工程护栏。

## 定义：Agent = 在循环里自主决定下一步的 LLM 系统

对比三个概念，面试常问"这和不就是调个 API 吗"的区别：

| 形态 | 流程 | 谁决定步骤 |
| --- | --- | --- |
| Chat | 用户问 → 模型答，一锤子 | 无流程可言 |
| Workflow（工作流） | 开发者**预先写死**分支：先抽取→再检索→再生成 | 代码决定 |
| Agent | 模型拿到目标和可用工具，**自己决定**调什么、调几次、何时算完成 | 模型决定 |

Anthropic 在 <a href="https://www.anthropic.com/engineering/building-effective-agents" target="_blank" rel="noopener noreferrer">Building Effective Agents</a> 的经典分类——面试答"Workflow 和 Agent 的区别"直接引用：

> **能不用 Agent 就不用**。Agent 意味着不可预测性叠加成本（每一步都是一次完整 LLM 调用）。简单 workflow 解决 80% 问题；剩下 20% 开放任务（步骤数和内容无法预知，比如"调研竞品并写份报告"）才值得 Agent。

常见 workflow 模式（都是 Agent 的"平替"，先学会这些再谈自主）：

- **Prompt Chaining**：拆成固定几步串行，中间可加程序校验（先写大纲→审核大纲→逐节写）
- **Routing**：先分类再分发给专用 prompt/模型（客服问题分流到账单/技术/闲聊）
- **Parallelization**：并行多个调用再聚合（多文档分节摘要、投票表决）
- **Orchestrator-Worker**：中心 LLM 动态拆子任务给 worker（子任务数量不可预知时用）
- **Evaluator-Optimizer**：生成→评审→按反馈重写，循环直到达标（翻译、文案）

## 核心循环：50 行手搓一个 Agent

所有框架的 Agent 抽象拆开都是这个 while 循环。**必须先自己写过一遍**，否则用 LangGraph 遇到 bug 完全无从下手。

```ts
// agent.ts —— 依赖：npm i openai zod；需要 OPENAI_API_KEY（或兼容供应商的 baseURL）
import OpenAI from 'openai';

const client = new OpenAI();   // 兼容 DeepSeek 等：new OpenAI({ baseURL, apiKey })

// 1. 定义工具：schema 给模型看，execute 是你的真代码
const tools = {
  get_weather: {
    schema: {
      type: 'object',
      properties: { city: { type: 'string', description: '城市名，如：北京' } },
      required: ['city'],
    },
    execute: async (args: { city: string }) => fetch(`https://api.example.com/w?c=${args.city}`).then(r => r.json()),
  },
  web_search: {
    schema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
    execute: async (args: { query: string }) => ({ results: [/* 搜索结果列表 */] }),
  },
};

const toolDefs = Object.entries(tools).map(([name, t]) => ({
  type: 'function' as const,
  function: { name, description: `执行 ${name}`, parameters: t.schema },
}));

// 2. Agent 循环：模型不请求工具了，就算完成
async function runAgent(userTask: string, maxSteps = 10) {
  const messages: any[] = [
    { role: 'system', content: '你通过工具完成用户目标。缺信息就调工具，不要编造。' },
    { role: 'user', content: userTask },
  ];

  for (let step = 0; step < maxSteps; step++) {           // 护栏：最大迭代数
    const rsp = await client.chat.completions.create({
      model: 'deepseek-chat', messages, tools: toolDefs,
    });
    const msg = rsp.choices[0].message;
    messages.push(msg);                                    // 3. 保留模型的思考/调用意图

    if (!msg.tool_calls?.length) return msg.content;       // 没有工具调用 = 任务完成

    for (const call of msg.tool_calls) {                   // 4. 可 Promise.all 并行执行
      const tool = tools[call.function.name as keyof typeof tools];
      let result: string;
      try {
        const args = JSON.parse(call.function.arguments);
        result = JSON.stringify(await tool.execute(args));
      } catch (err) {
        result = `工具执行失败：${(err as Error).message}。请换个参数或方式重试。`;  // 5. 错误回填给模型
      }
      messages.push({ role: 'tool', tool_call_id: call.id, content: result });
    }
  }
  return '达到最大步数，任务中止';                          // 防死循环烧钱
}

console.log(await runAgent('北京明天适合跑步吗？查下天气再给建议'));
```

跑通这个，Agent 的"神秘感"就消失了：**规划 = 模型决定下一步调哪个工具；执行 = 你的 for 循环；记忆 = messages 数组的累积；反思 = 工具报错后模型换方案重试。**

## ReAct：最经典的推理模式

上面循环的思想源头是 ReAct（Reason + Act）：**Thought（我该做什么）→ Action（调工具）→ Observation（看结果）→ 再 Thought……** 直到得出 Answer。现代 Function Calling 把"Thought"隐式化了（模型直接输出调用意图），但面试要求能画这个环。

ReAct 的工程价值在于**让行动基于观察**：没有 Observation 环节，模型就会凭训练记忆瞎编参数（"假装"查过了）。

## 规划（Planning）能力从哪来

- **隐式规划**：小任务直接靠循环一步步走，模型"走一步看一步"——大多数场景够用
- **显式计划**：复杂任务先让模型输出完整 TODO 清单（结构化），再逐项执行、勾掉。计划本身可以持久化，中断可恢复
- **Plan-and-Execute**：规划用强模型（少而精），执行用弱模型/直连工具（多而快）——成本和质量的平衡术
- **Reflexion（反思）**：失败后把"为什么失败"写进上下文再来一轮；把失败经验沉淀成长期记忆，同类任务不再踩坑

## 记忆（Memory）

| 类型 | 载体 | 工程手段 |
| --- | --- | --- |
| 短期（会话内） | messages 数组 | 滑窗截断、超出阈值后**摘要压缩**（用 LLM 把旧对话压成一段 summary 放 system） |
| 长期（跨会话） | 外部存储 | 向量库存"事实"（用户偏好、历史结论）按需召回——本质就是 [RAG](/agent/rag)；或结构化 KV（用户画像表） |
| 工作记忆 | scratchpad | 把中间结论写文件/DB，防上下文爆炸（深度研究类 Agent 标配） |

JD 里"记忆机制"听着玄，落地就是：**什么该留（用户偏好/任务进度）、什么该忘（闲聊）、存在哪（向量/KV/关系表）、怎么召回（语义检索/规则）**。

## 工具设计：Agent 成败的隐形大头

模型再聪明，工具烂就全烂。原则：

1. **面向任务而非面向 API**：给模型一个 `search_flights(from, to, date)`，而不是把 HTTP SDK 的 20 个端点原样暴露
2. **描述即文档**：什么时候用、输入输出格式、失败语义，全部写进 description
3. **幂等与只读优先**：能查询就别给写操作；写操作要确认。给 Agent 一个 `delete_all` 工具等于埋雷
4. **返回对模型友好的结果**：结构化 + 截断（一条 500KB 的日志会把上下文撑爆，聚合/摘要后再回填）
5. **执行侧兜底校验**：权限、参数范围、频率限制——永远假设模型会被注入

## 多 Agent：什么时候真的需要

典型拓扑：**Orchestrator-Worker**（主管拆分派活）、**Pipeline**（串行接力：研究员→写手→审稿）、**Handoffs**（客服 A 组转 B 组，OpenAI Agents SDK 的核心概念）。

判断标准很实际：

- 多 Agent 的真实收益是**上下文隔离**（每个角色只看自己需要的信息，互不污染）和**职责单一**（各自 prompt 更短更准）
- 常见翻车：Agent 之间用自然语言传话导致信息丢失、两个 Agent 互相踢皮球死循环、成本 ×N
- 经验：**单 Agent + 好工具能解决 90% 的问题**；当单个 prompt 塞满互斥指令、或任务需要真正并行的独立子目标时，再拆

## 失败模式与护栏清单

生产 Agent 必须内置的保险丝：

| 失败模式 | 症状 | 护栏 |
| --- | --- | --- |
| 死循环 | 反复调同一工具同一参数 | 最大迭代数；重复调用检测（同 tool+args 连续 N 次即熔断） |
| 目标漂移 | 越跑越远，开始干没要求的事 | 每步注入原始任务；定期"你离目标还差什么"自检 |
| 工具幻觉 | 调用不存在的工具/参数瞎填 | schema 校验失败回填纠错；工具名做 fuzzy 匹配提示 |
| 成本失控 | 一次任务几百次调用 | token 预算熔断；步数上限；实时用量日志 |
| 危险操作 | 删库、转账、发错邮件 | 敏感操作白名单 + 人工确认（human-in-the-loop） |
| 提示注入 | 被网页内容劫持去发邮件 | 见 [Prompt 工程](/agent/prompt-engineering) 分层防御 + 工具权限最小化 |

## 高频面试自检

1. Workflow 和 Agent 的区别？你的项目为什么选这种形态？（面试官原话高频题："为什么要用 Agent？"）
2. 不看资料，白板上画出 Agent loop 的伪代码。
3. 工具调用失败了，你的系统怎么处理？（考：错误回填、重试、降级、上报）
4. 上下文快爆了，一个长任务 Agent 怎么继续？（考：摘要压缩、工作记忆、子 Agent 隔离）
5. 多 Agent 一定比单 Agent 好吗？什么信号提示你该拆了？

## 下一站

- Agent 的"查资料"能力怎么建 → [RAG 检索增强](/agent/rag)
- 工具供给的标准化协议 → [工具生态与 MCP](/agent/mcp-tools)
