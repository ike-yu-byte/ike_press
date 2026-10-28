# Frameworks & Selection

> When a JD says "familiar with LangChain / LangGraph / LlamaIndex / AutoGen / Dify" — **it doesn't want you to learn them all; it wants selection judgment**: what problem each solves, where its boundaries are, and when to drop the framework and hand-write. This lesson leads with the TS ecosystem (your home turf) and touches the Python side lightly.

## The landscape in one table

| Framework | Language | Positioning | Choose it when |
| --- | --- | --- | --- |
| **Vercel AI SDK** | TS | Frontend-friendly LLM UI toolkit: unified multi-vendor API + streaming + `useChat` | Building the web/UI layer of an AI product — near no-brainer |
| **LangChain** | Py/JS | Component building blocks: model abstraction, prompt templates, retrievers, chains | Quick assembly, huge doc ecosystem; simple chains suffice |
| **LangGraph** | Py/JS | **Stateful graph orchestration**: nodes/edges/loops/branching/persistence/checkpoints | Complex agents, multi-agent, controllable state flow needed |
| **LlamaIndex** | Py/JS | **RAG-first**: data connectors, indexes, query engines | The project's core is document/data Q&A |
| **OpenAI Agents SDK** | Py/TS | Lightweight agent loop + handoffs + guardrails | OpenAI-primary and you want the official paradigm |
| **Mastra** | TS | TS-native "Next.js-style" agent framework | Want pure-TS end-to-end: workflows + RAG + eval in one |
| **AutoGen / CrewAI** | Py | Multi-agent conversation/role collaboration | Research-oriented multi-agent, not production-first |
| **Dify / Coze / n8n** | low-code | Visual orchestration, batteries included, fast validation | Requirements clear, speed matters, non-engineering team maintains |

::: tip Don't "learn frameworks from scratch"
The right order is always: **implement by hand first ([Agent Core Principles](/en/agent/agent-core)) → hit real pain → see which framework abstraction solves your pain**. People who jump straight into LangChain get stuck in layered abstractions when a chain misbehaves — which is exactly the interview question "how do you debug a non-working chain?"
:::

## Vercel AI SDK: the frontend's home turf

TypeScript-first, unifying 100+ models from OpenAI/Anthropic/Google/domestic vendors. The core trio:

```ts
// app/chat/route.ts — Next.js Route Handler; the apiKey stays server-side
import { streamText, tool, convertToModelMessages } from 'ai';   // npm i ai
import { deepseek } from '@ai-sdk/deepseek';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: deepseek('deepseek-chat'),
    messages: await convertToModelMessages(messages),
    tools: {
      weather: {
        description: 'Look up the weather for a city',
        inputSchema: z.object({ city: z.string() }),
        execute: async ({ city }) => ({ city, temp: 22, sky: 'clear' }),
      },
    },
  });
  return result.toUIMessageStreamResponse();   // one line: turn the stream into what useChat eats
}
```

```tsx
// components/chat.tsx — client: useChat manages all streaming-chat state
'use client';
import { useChat } from '@ai-sdk/react';

export function Chat() {
  const { messages, sendMessage, status, stop, error } = useChat();
  return (
    <div>
      {messages.map((m) => m.role === 'user'
        ? <p key={m.id}>Me: {m.content}</p>
        : <p key={m.id}>AI: {m.content}</p>)}
      <button onClick={() => status === 'streaming' && stop()}>Stop</button>
      <form onSubmit={(e) => { e.preventDefault(); /* sendMessage(...) */ }}>
        <input name="prompt" /><button type="submit">Send</button>
      </form>
    </div>
  );
}
```

It wraps everything you'd hand-write in [Frontend Agent Engineering](/en/agent/agent-ui) (SSE parsing, incremental rendering, interruption, tool state). **The gentlest learning curve and the fastest portfolio piece** — strongly recommended for resume projects. Limitation: complex multi-agent state orchestration isn't its game — that's LangGraph's.

## LangGraph: draw the agent as a state graph

LangChain supplies the blocks; **LangGraph supplies the orchestration engine with loops, branches, and persistence**. The mental model: model the flow as a **graph** — nodes are "one action" (call model / run tool / custom logic), edges decide what's next, state flows between nodes and can be checkpointed.

```ts
// Conceptual sketch: LangGraph.js
import { StateGraph, MessagesAnnotation } from '@langchain/langgraph';

const graph = new StateGraph(MessagesAnnotation)
  .addNode('agent',  callModel)          // decide: call tools or not
  .addNode('tools',  runTools)           // execute tools
  .addEdge('__start__', 'agent')
  .addConditionalEdges('agent', shouldContinue, { tools: 'tools', __end__: '__end__' })
  .addEdge('tools', 'agent');            // loop back — the agent loop, graphified

const app = graph.compile({ checkpointer });   // checkpointer: persistence, pause/resume, time-travel debugging
```

LangGraph's killer features are **controllability**: `interrupt` (human-in-the-loop approval), `checkpointer` (long tasks resume from breakpoints; time-travel debugging), subgraphs (multi-agent). The price: many abstractions, steep ramp. Decision bar: **loops/branches/parallelism/resumability → LangGraph; a few linear steps → write plain functions**.

## LlamaIndex: RAG specialist

Data connectors (hundreds of sources) → indexes → retrievers → query engines: the RAG pipeline out of the box, with strong advanced retrieval (recursive retrieval, routing, fused queries). Its core is "organize data well for the LLM". Prefer it for RAG-heavy projects, used together with the principles in [RAG](/en/agent/rag).

## OpenAI Agents SDK & Mastra

- **OpenAI Agents SDK** (has a TS version): the official lightweight paradigm — **agent loop + Handoffs (transfer between agents) + Guardrails (input/output validation) + Sessions**. Worth reading to see "how the vendor themself frames agents"; clean abstractions.
- **Mastra**: an emerging TS-native framework pitched as "the Next.js of AI" — workflow engine + RAG + eval + multi-agent in one, great pure-TS end-to-end experience for teams staying in the JS ecosystem.

## Low-code: Dify / Coze / n8n

Don't sneer at drag-and-drop platforms — for **requirement validation, non-engineering maintainers, and internal productivity tools** they're kings. Dify is open-source and self-hostable (common on enterprise intranets), Coze has a rich domestic ecosystem, n8n leans automation/integration. "Why low-code instead of a framework" (or vice versa) tests **cost/control/team-capability trade-off reasoning** — no standard answer; articulate the trade-off.

## The selection decision tree (memorize for interviews)

```text
Pure UI/product prototype, fastest possible launch?      → low-code (Dify/Coze)
The interaction & streaming layer of a web AI product?    → Vercel AI SDK
Core is private document Q&A (retrieval-heavy)?           → LlamaIndex (+ vector DB)
Agent state is complex: loops/branches/parallel/resume?   → LangGraph
OpenAI-primary and you want the official lightweight way? → OpenAI Agents SDK
Pure-TS end-to-end full package?                          → Mastra
Simple enough to write in 50 lines?                       → skip frameworks, hand-write the loop
```

::: warning The framework isn't the resume line; "why this one" is
Interviewers don't care whether you can call `new StateGraph()`. They care: **why did your project need LangGraph instead of Vercel AI SDK? What framework pitfall did you hit and how did you work around it?** Take the three projects from the [recommended track](/en/agent/index), pair each with a fitting framework, and write the rationale into your resume — worth more than listing ten framework names.
:::

## Interview self-check

1. LangChain vs LangGraph — relationship and respective problems?
2. A Next.js streaming-chat + tool-calling product: what do you use? (expect Vercel AI SDK, with reasons)
3. When do you skip the framework and hand-write the agent loop?
4. Dify vs a custom framework — how do you choose? (trade-off thinking)
5. What frontend streaming grunt work does `useChat` take off your hands?

## Next up

- Above frameworks, perfecting the AI interaction layer → [Frontend Agent Engineering](/en/agent/agent-ui)
