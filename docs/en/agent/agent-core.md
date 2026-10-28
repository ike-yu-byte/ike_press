# Agent Core Principles

> "Task planning, tool use, memory management, multi-turn dialogue, autonomous decisions" — nearly every agent JD says this. This lesson unpacks that sentence: **add a loop, tools, and memory to an LLM and you have an agent**. We build a minimal one by hand first, then cover patterns and production guardrails.

## Definition: an agent is an LLM deciding its own next step inside a loop

Three forms compared — the "isn't this just calling an API?" question, answered:

| Form | Flow | Who decides the steps |
| --- | --- | --- |
| Chat | user asks → model answers, one shot | no flow to speak of |
| Workflow | developer **hard-codes** the branches: extract → retrieve → generate | the code |
| Agent | the model gets a goal + available tools and **decides** what to call, how many times, when it's done | the model |

Anthropic's canonical <a href="https://www.anthropic.com/engineering/building-effective-agents" target="_blank" rel="noopener noreferrer">Building Effective Agents</a> — quote it when asked "workflow vs agent":

> **Don't build an agent if a workflow suffices.** Agents stack unpredictability on top of cost (every step is a full LLM call). Simple workflows solve 80% of problems; the remaining 20% — open-ended tasks whose step count and content can't be predicted ("research competitors and write a report") — are where agents earn their keep.

Common workflow patterns (agent "cheap substitutes" — master these before autonomy):

- **Prompt Chaining**: fixed serial steps with program checks between (outline → review outline → write section by section)
- **Routing**: classify first, then dispatch to a specialized prompt/model (support tickets → billing / tech / chit-chat)
- **Parallelization**: run several calls concurrently, then aggregate (per-section summaries, voting)
- **Orchestrator-Worker**: a central LLM dynamically splits subtasks for workers (when subtask count is unpredictable)
- **Evaluator-Optimizer**: generate → critique → rewrite on feedback, loop until it passes (translation, copywriting)

## The core loop: a 50-line hand-built agent

Every framework's "agent" abstraction reduces to this while-loop. **Write it yourself once** — otherwise a LangGraph bug leaves you stranded inside its abstractions.

```ts
// agent.ts — deps: npm i openai; needs OPENAI_API_KEY (or a compatible baseURL)
import OpenAI from 'openai';

const client = new OpenAI();   // DeepSeek etc.: new OpenAI({ baseURL, apiKey })

// 1. Define tools: the schema is for the model, execute is your real code
const tools = {
  get_weather: {
    schema: {
      type: 'object',
      properties: { city: { type: 'string', description: 'City name, e.g. Berlin' } },
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
    execute: async (args: { query: string }) => ({ results: [/* search hits */] }),
  },
};

const toolDefs = Object.entries(tools).map(([name, t]) => ({
  type: 'function' as const,
  function: { name, description: `Execute ${name}`, parameters: t.schema },
}));

// 2. The agent loop: when the model stops requesting tools, the task is done
async function runAgent(userTask: string, maxSteps = 10) {
  const messages: any[] = [
    { role: 'system', content: 'Achieve the user goal using tools. Call a tool when you lack info; never fabricate.' },
    { role: 'user', content: userTask },
  ];

  for (let step = 0; step < maxSteps; step++) {           // guardrail: max iterations
    const rsp = await client.chat.completions.create({
      model: 'deepseek-chat', messages, tools: toolDefs,
    });
    const msg = rsp.choices[0].message;
    messages.push(msg);                                    // 3. keep the model's intent

    if (!msg.tool_calls?.length) return msg.content;       // no tool call = done

    for (const call of msg.tool_calls) {                   // 4. could Promise.all these
      const tool = tools[call.function.name as keyof typeof tools];
      let result: string;
      try {
        const args = JSON.parse(call.function.arguments);
        result = JSON.stringify(await tool.execute(args));
      } catch (err) {
        result = `Tool failed: ${(err as Error).message}. Try different args or another approach.`;  // 5. feed errors back
      }
      messages.push({ role: 'tool', tool_call_id: call.id, content: result });
    }
  }
  return 'Reached max steps; task aborted';                 // prevents infinite-loop spend
}

console.log(await runAgent('Is it good to run tomorrow in Berlin? Check the weather, then advise.'));
```

Run this and the "mystery" of agents evaporates: **planning = the model choosing the next tool; execution = your for-loop; memory = the accumulating messages array; reflection = retrying differently after a tool error.**

## ReAct: the classic reasoning pattern

The loop above descends from ReAct (Reason + Act): **Thought (what should I do) → Action (call a tool) → Observation (see the result) → Thought… ** until an Answer. Modern Function Calling makes "Thought" implicit (the model emits the call intent directly), but interviews expect you to draw the ring.

ReAct's engineering value is **grounding action in observation**: without the Observation step, the model invents parameters from training memory — it "pretends" to have checked.

## Where planning comes from

- **Implicit planning**: small tasks just step through the loop, one move at a time — enough for most cases
- **Explicit planning**: for complex tasks, have the model emit a full structured TODO list first, then execute and tick items off. The plan can be persisted, so interruptions resume
- **Plan-and-Execute**: plan with a strong model (few, precise), execute with a weak model / direct tools (many, cheap) — the cost/quality balance
- **Reflexion**: after failure, write "why it failed" into context and retry; persist lessons as long-term memory so the same trap isn't hit twice

## Memory

| Type | Carrier | Engineering means |
| --- | --- | --- |
| Short-term (in session) | messages array | sliding-window truncation; past a threshold, **summarize** (LLM compresses old turns into a summary in system) |
| Long-term (cross-session) | external store | vector DB storing "facts" (user prefs, past conclusions) recalled on demand — essentially [RAG](/en/agent/rag); or structured KV (profile table) |
| Working memory | scratchpad | write intermediate conclusions to files/DB to avoid context blowup (standard for deep-research agents) |

"Memory mechanism" sounds mystical; it lands as: **what to keep (prefs/progress), what to drop (chit-chat), where to store (vector/KV/relational), how to recall (semantic search/rules)**.

## Tool design: the invisible make-or-break

No matter how smart the model, bad tools ruin everything. Principles:

1. **Task-oriented, not API-oriented**: give the model `search_flights(from, to, date)`, not the HTTP SDK's 20 raw endpoints
2. **Description is documentation**: when to use, I/O format, failure semantics — all in description
3. **Prefer idempotent & read-only**: query over write; writes need confirmation. Handing an agent a `delete_all` tool is burying a mine
4. **Return model-friendly results**: structured + truncated (a 500KB log blows the context; aggregate/summarize before feeding back)
5. **Validate on the execution side**: permissions, argument ranges, rate limits — always assume the model will be injected

## Multi-agent: when you actually need it

Typical topologies: **Orchestrator-Worker** (a manager splits and assigns), **Pipeline** (serial relay: researcher → writer → reviewer), **Handoffs** (support team A transfers to B; the core concept of the OpenAI Agents SDK).

A practical bar:

- Real multi-agent benefits are **context isolation** (each role sees only what it needs, no cross-pollution) and **single responsibility** (shorter, sharper prompts)
- Common failures: agents relaying via natural language lose information, two agents ping-pong in a loop, cost ×N
- Rule of thumb: **a single agent + good tools solves 90% of problems**; split only when one prompt is stuffed with conflicting instructions or the task needs genuinely parallel independent sub-goals

## Failure modes & guardrails

Production agents ship with these fuses:

| Failure | Symptom | Guardrail |
| --- | --- | --- |
| Infinite loop | same tool + same args repeatedly | max iterations; repeat-call detection (circuit-break after N identical calls) |
| Goal drift | wanders, does unrequested things | re-inject the original task each step; periodic "what's left toward the goal" self-check |
| Tool hallucination | calls a nonexistent tool / invents args | schema-validate & feed back errors; fuzzy-match tool names with hints |
| Cost blowout | hundreds of calls per task | token-budget breaker; step cap; live usage logs |
| Dangerous ops | drops tables, sends money, mis-mails | sensitive-op allowlist + human-in-the-loop confirmation |
| Prompt injection | hijacked by web content to send mail | layered defense (see [Prompt Engineering](/en/agent/prompt-engineering)) + least-privilege tools |

## Interview self-check

1. Workflow vs agent? Why did your project pick its form? (the literal staple: "why use an agent?")
2. Draw the agent-loop pseudocode on a whiteboard, no notes.
3. A tool call fails — how does your system handle it? (tests: error feedback, retry, degrade, escalate)
4. Context about to overflow on a long task — how does the agent continue? (tests: summarization, working memory, sub-agent isolation)
5. Is multi-agent always better than single? What signal says "split now"?

## Next up

- Give the agent its "look things up" power → [RAG](/en/agent/rag)
- Standardizing tool supply → [Tool Ecosystem & MCP](/en/agent/mcp-tools)
