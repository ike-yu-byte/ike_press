# 工具生态与 MCP

> "了解 MCP 协议，能开发自定义 MCP Server 或插件"——2026 年 JD 里的新贵关键词，和两年前"了解 LangChain"的地位一模一样。这一课讲清 MCP 解决什么问题、架构怎么摆，然后**用官方 TS SDK 写一个能跑的 Server**——面试作品级的最小闭环。

## 背景：M 个模型 × N 个工具的集成灾难

每个 AI 应用都要连数据库、调搜索、读文件、发消息……如果每家模型厂商各自定义工具接法、每个工具方各自适配每家模型，集成量是 **M×N**。

MCP（Model Context Protocol）的思路：定义**一个标准协议**，工具方实现一次（MCP Server），任何支持 MCP 的模型应用都能直接用——被称为 **"AI 界的 USB-C"**。由 Anthropic 2024 年底开源，随后 OpenAI、Google、Cursor、Microsoft 相继接入，已是事实标准。

::: tip MCP 和 Function Calling 的关系
不冲突，是两层：**Function Calling 是"模型如何表达调用意图"的 API 能力**（上一课讲的）；**MCP 是"工具如何被标准化地供给和发现"的协议**。一个 MCP Server 暴露的工具，最终仍是通过模型的 Function Calling 机制被调用的。面试问区别，答"MCP 解决工具供给侧的标准化，FC 解决模型侧的调用表达"。
:::

## 架构：Host / Client / Server

```text
Claude Desktop / Cursor / 你的应用（Host 宿主）
  └── MCP Client（每个 Server 一条连接，1:1）
        └── MCP Server（文件系统 / 数据库 / GitHub / 你的业务…）
```

- **Host**：AI 应用本体，管理若干 Client
- **Client**：协议连接层，SDK 已封装，你基本不直接写
- **Server**：能力的提供方，**这是你要写的那部分**；轻量、无状态、按连接隔离

Server 可暴露三种原语（对应不同消费方式）：

| 原语 | 是什么 | 类比 |
| --- | --- | --- |
| **Tools** | 模型可调用的函数（有副作用，模型自主决定调） | API endpoint |
| **Resources** | 可读取的上下文数据（文件、记录，带 URI） | GET 只读资源 |
| **Prompts** | 预置的提示模板（用户主动选用，如斜杠命令） | 快捷指令 |

传输层两种：**stdio**（本机子进程标准输入输出，桌面应用接本地 server 用）与 **Streamable HTTP**（远程/多用户，带会话与鉴权；旧文档里的 HTTP+SSE 传输已演进为它）。

## 实战：TS SDK 写一个 MCP Server

场景：给 AI 编辑器接一个"公司工单系统"工具。依赖：`npm i @modelcontextprotocol/server zod`。

```ts
// server.ts —— 用官方 TypeScript SDK
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';

const server = new McpServer({ name: 'ticket-system', version: '1.0.0' });

// 1. 一个 Tool：查工单。zod schema 会被自动转成 JSON Schema 给模型看
server.registerTool(
  'query_ticket',
  {
    title: '查询工单',
    description: '按工单 ID 或负责人查询工单列表与状态。用户问到工单进度时必须使用。',
    inputSchema: {
      ticket_id: z.string().optional().describe('工单号，如 TCK-12345'),
      assignee: z.string().optional().describe('负责人姓名或工号'),
    },
  },
  async ({ ticket_id, assignee }) => {
    if (!ticket_id && !assignee) {
      return { isError: true, content: [{ type: 'text', text: '至少提供 ticket_id 或 assignee 之一' }] };
    }
    const rows = await db.ticket.findMany({ where: { ...(ticket_id && { id: ticket_id }), ...(assignee && { owner: assignee }) } });
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
  },
);

// 2. 一个 Resource：把服务健康状态作为只读上下文暴露
server.registerResource(
  'service-health',
  'ticket://health',
  { title: '工单系统健康状态' },
  async (uri) => ({
    contents: [{ uri: uri.href, text: await fetchHealthSnapshot() }],
  }),
);

// 3. 启动：stdio 传输，等宿主（如 Cursor）以子进程方式拉起
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 调试与接入

```bash
npx @modelcontextprotocol/inspector node server.ts   # 官方 Inspector：可视化调 tools/resources
```

接入各宿主本质都是"声明怎么启动这个 server"，配置格式略异：

```json
// Claude Desktop: claude_desktop_config.json / Cursor: .cursor/mcp.json 类似
{
  "mcpServers": {
    "tickets": { "command": "node", "args": ["/abs/path/server.js"] }
  }
}
```

配好后在 Claude/Cursor 里直接问"TCK-12345 现在什么状态"，看它是否自动调起你的工具——**这个 demo 面试现场能演，比说十句"了解 MCP"都硬**。

## 安全：MCP 时代的必修课

工具生态标准化同时意味着**攻击面标准化**：

1. **第三方 Server 供应链**：装来路不明的 MCP Server ≈ 给 AI 装带任意代码执行权限的插件。2025 年起 npm 上已出现过恶意 server。原则：读源码、锁版本、最小权限。
2. **工具投毒（tool poisoning）**：恶意 Server 在工具 description 里藏指令（模型看得到，用户看不到）。宿主 UI 要展示完整 schema，敏感调用要人审。
3. **confused deputy**：你的 Server 拿着自己的高权限凭证，被诱导替低权限用户干活。→ 每个 tool 调用**按最终用户鉴权**，别只信宿主。
4. **数据外带**：能读文件的 Agent 被注入后把密钥发到攻击者 URL。→ 出网白名单 + 敏感路径 deny 列表。

## 生态速览

官方/主流 servers：filesystem、fetch（网页抓取）、git、GitHub、Postgres/SQLite、Google Drive、Slack、Puppeteer/Playwright（浏览器自动化）……目录站如 mcp.so / Smithery 可检索。写自己业务系统（工单、CMS、内部 API）的 MCP 封装，是目前企业最缺、也最好做的差异化实践——**你有前端 + 业务熟悉度，这就是机会点**。

## 高频面试自检

1. MCP 是什么？解决什么问题？和 Function Calling 什么关系？
2. Host/Client/Server 各自职责？三种原语（tools/resources/prompts）分别对应什么场景？
3. stdio 和 Streamable HTTP 各在什么部署形态下用？
4. 你写的 MCP Server 怎么做用户级鉴权？（考安全思维）
5. 用一个 MCP Server 和把 API 直接写成 Agent 工具，怎么选？（小规模单模型直写更简单；跨多个宿主复用、企业统一治理才上 MCP）

## 下一站

- 这些积木如何组装：主流框架与选型 → [主流框架与选型](/agent/frameworks)
