# Tool Ecosystem & MCP

> "Understand MCP; able to develop custom MCP servers or plugins" — the rising keyword in 2026 JDs, exactly where "knows LangChain" was two years ago. This lesson clarifies what MCP solves and how the architecture fits, then **builds a working server with the official TS SDK** — the portfolio-grade minimum for interviews.

## Background: the M-models × N-tools integration disaster

Every AI app needs to hit databases, call search, read files, send messages… If each model vendor defined its own tool wiring and each tool had to adapt to every model, integration work is **M×N**.

MCP (Model Context Protocol) says: define **one standard protocol**; a tool provider implements it once (an MCP Server) and any MCP-speaking model app can use it directly — dubbed **"the USB-C of AI"**. Open-sourced by Anthropic in late 2024, then adopted by OpenAI, Google, Cursor, Microsoft — now the de facto standard.

::: tip MCP vs Function Calling
Not competitors — two layers. **Function Calling is the model-side API capability for "how the model expresses a call intent"** (last lesson); **MCP is the protocol for "how tools are supplied and discovered in a standardized way"**. Tools exposed by an MCP Server still get invoked via the model's Function Calling underneath. Asked the difference: "MCP standardizes the tool supply side; FC handles the model-side call expression."
:::

## Architecture: Host / Client / Server

```text
Claude Desktop / Cursor / your app (the Host)
  └── MCP Client (one connection per Server, 1:1)
        └── MCP Server (filesystem / database / GitHub / your business…)
```

- **Host**: the AI app itself, managing several Clients
- **Client**: the protocol connection layer — the SDK wraps it; you rarely write it directly
- **Server**: the capability provider — **this is the part you write**; lightweight, stateless, isolated per connection

A Server exposes three primitives (each with a different consumption mode):

| Primitive | What it is | Analogy |
| --- | --- | --- |
| **Tools** | functions the model may call (side effects; the model decides when) | API endpoint |
| **Resources** | readable context data (files, records, addressed by URI) | read-only GET resource |
| **Prompts** | pre-authored prompt templates (user-invoked, like slash commands) | shortcut command |

Two transports: **stdio** (local subprocess over standard I/O — desktop apps wiring local servers) and **Streamable HTTP** (remote/multi-user, with sessions and auth; the older HTTP+SSE transport has evolved into this).

## In practice: an MCP Server with the TS SDK

Scenario: wire a "company ticket system" tool into an AI editor. Deps: `npm i @modelcontextprotocol/server zod`.

```ts
// server.ts — official TypeScript SDK
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';

const server = new McpServer({ name: 'ticket-system', version: '1.0.0' });

// 1. A Tool: query tickets. The zod schema auto-converts to JSON Schema for the model
server.registerTool(
  'query_ticket',
  {
    title: 'Query ticket',
    description: 'Look up tickets and their status by ticket ID or assignee. Must be used whenever the user asks about ticket progress.',
    inputSchema: {
      ticket_id: z.string().optional().describe('Ticket number, e.g. TCK-12345'),
      assignee: z.string().optional().describe('Assignee name or employee ID'),
    },
  },
  async ({ ticket_id, assignee }) => {
    if (!ticket_id && !assignee) {
      return { isError: true, content: [{ type: 'text', text: 'Provide at least one of ticket_id or assignee' }] };
    }
    const rows = await db.ticket.findMany({ where: { ...(ticket_id && { id: ticket_id }), ...(assignee && { owner: assignee }) } });
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
  },
);

// 2. A Resource: expose service health as read-only context
server.registerResource(
  'service-health',
  'ticket://health',
  { title: 'Ticket system health snapshot' },
  async (uri) => ({
    contents: [{ uri: uri.href, text: await fetchHealthSnapshot() }],
  }),
);

// 3. Start: stdio transport, waiting for the host (e.g. Cursor) to spawn this as a subprocess
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Debugging & wiring in

```bash
npx @modelcontextprotocol/inspector node server.ts   # official Inspector: exercise tools/resources visually
```

Connecting to any host is essentially "declare how to launch this server"; config format varies slightly:

```json
// Claude Desktop: claude_desktop_config.json / Cursor: .cursor/mcp.json is similar
{
  "mcpServers": {
    "tickets": { "command": "node", "args": ["/abs/path/server.js"] }
  }
}
```

Then ask Claude/Cursor "what's the status of TCK-12345" and watch it auto-invoke your tool — **this demo is performable live in an interview; worth ten claims of "I know MCP"**.

## Security: a required course in the MCP era

Standardizing tools standardizes the attack surface too:

1. **Third-party server supply chain**: installing an unknown MCP Server ≈ giving an AI a plugin with arbitrary code execution. Malicious npm servers have already appeared since 2025. Rule: read the source, pin versions, least privilege.
2. **Tool poisoning**: a malicious server hides instructions inside a tool description (the model sees it, the user doesn't). Hosts should surface the full schema; sensitive calls need human review.
3. **Confused deputy**: your server holds high-privilege credentials and gets tricked into acting for a low-privilege user. → authorize every tool call **against the end user**, never trust the host alone.
4. **Data exfiltration**: a file-reading agent, once injected, sends secrets to an attacker URL. → egress allowlist + deny-list of sensitive paths.

## Ecosystem at a glance

Official/mainstream servers: filesystem, fetch (web scraping), git, GitHub, Postgres/SQLite, Google Drive, Slack, Puppeteer/Playwright (browser automation)… directories like mcp.so / Smithery are searchable. Wrapping **your own business systems** (tickets, CMS, internal APIs) as MCP servers is currently what companies lack most — and the easiest differentiated practice to ship: **you have the frontend skills plus business familiarity; that's your opening**.

## Interview self-check

1. What is MCP, what problem does it solve, and how does it relate to Function Calling?
2. Responsibilities of Host/Client/Server? What scenarios do the three primitives (tools/resources/prompts) each fit?
3. When to use stdio vs Streamable HTTP?
4. How does your MCP Server do per-user authorization? (tests security thinking)
5. MCP server vs writing an API directly as an agent tool — how to choose? (small single-model scope: write directly; reuse across hosts & centralized governance: MCP)

## Next up

- Assembling these blocks: frameworks and selection → [Frameworks & Selection](/en/agent/frameworks)
