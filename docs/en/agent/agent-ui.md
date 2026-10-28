# Frontend Agent Engineering

> This is frontend engineers' **biggest differentiator** in the AI transition: anyone can call a model, but "wrapping AI's inherent uncertainty in a great product experience" is frontend work. The JD lines "streaming output handling, multi-platform delivery, AI feature instrumentation" all live here. Finish this lesson and you can hand-build a production-quality AI chat/agent frontend.

## The full picture of an AI chat frontend

```text
UI layer      message list / composer / tool-progress panel / citation popovers
State layer   session store (parts-model messages), streaming state machine, optimistic updates
Transport     fetch + SSE (or WebSocket) / Vercel AI SDK's useChat
Defense       Markdown render + sanitize (XSS) / long-list performance / error recovery
```

**The message data structure is the foundation of everything** — a string `content` won't do: one AI reply may simultaneously contain thinking → tool call → tool result → text deltas → citation list. Model it as a **parts array**:

```ts
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: Array<
    | { type: 'text'; text: string }
    | { type: 'tool-call'; callId: string; name: string; args: unknown; state: 'pending' | 'done' | 'error'; result?: unknown }
    | { type: 'reasoning'; text: string }              // reasoning models' thinking (render collapsible)
    | { type: 'file'; url: string; mime: string }
  >;
  status?: 'streaming' | 'ready' | 'error' | 'aborted';
}
```

The render layer dispatches components on `part.type`; tool-card pending/done transitions and collapsible thinking all fall out naturally. Vercel AI SDK's UIMessage is exactly this model.

## Streaming rendering: three pits you must fill

### Pit 1: incomplete Markdown

Streaming text arrives token by token, so intermediate states inevitably include half-written syntax: a ` ```python ` fence opened but not closed, an unclosed `**bold`, a table that's only half there. Re-rendering raw every frame visually explodes.

Strategy: **patch unclosed syntax before rendering** — if code fences are odd-count, append a temporary closer; trim trailing orphan `*`/backtick fragments. Off-the-shelf: Vercel's <a href="https://github.com/vercel/streamdown" target="_blank" rel="noopener noreferrer">Streamdown</a> (a Markdown renderer designed for streaming); or `marked` + your own patch function + `DOMPurify`.

### Pit 2: high-frequency update performance

Tokens arrive at 50–100/s; setState per chunk → full Markdown re-render → long answers turn into a slideshow.

- **Throttle & batch**: accumulate 30–60ms of chunks, commit once (rAF or an interval flushing a buffer) — imperceptible to users, an order of magnitude fewer renders
- **Only the last bubble re-renders**: memoize the message list; isolate history with `React.memo`/Vue `v-once` thinking; streaming only updates the in-flight message
- **Virtualize long sessions**: hundreds of rich-text messages → `virtua` / `@tanstack/vue-virtual`
- Don't re-highlight code every frame: highlight when the part reaches a settled state; during streaming show plain text

### Pit 3: scroll management

Auto-scroll-to-bottom vs the user scrolling up to read history — a classic conflict. Standard solution: **follow the stream only if the user was already at the bottom** — before each update check `scrollHeight - scrollTop - clientHeight < threshold (~100px)`; if true follow, otherwise show a "back to bottom" floating button. This UX detail is a telltale sign of AI-frontend experience — interviews reward it.

## Typewriter effect & stop generation

- **Typewriter**: the data layer already streams; optionally smooth the UI with a fixed character rate (chunk arrival is bursty — raw display jumps in clumps). Keep "target text" and "displayed text" as two pointers, with a timer catching up at a set speed. A **blinking caret** at the end (CSS animation) massively improves the "it's alive" feeling.
- **Stop generation**: `AbortController` end to end —

```ts
const controller = new AbortController();

async function send(text: string) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: buildPayload(text) }),
    signal: controller.signal,                 // 1. the request is abortable
  });
  // ...SSE parse loop (see LLM Basics), updating the last text part each frame
}

function stop() {
  controller.abort();           // 2. user clicks Stop: kill the connection; the server should also abort generation (saves tokens!)
  markMessageAborted();         // 3. keep the half-written content + an "aborted" badge — don't wipe it
}
```

Details: disable send while generating but keep the composer editable; on `error`, keep the user's original question + one-click retry; mark disconnected half-messages `aborted` instead of pretending success.

## Visualizing tool calls

An agent working for 30 seconds with zero feedback = anxious churn. Render `tool-call` parts as a **step-card stream**:

```tsx
function ToolCard({ part }: { part: ToolCallPart }) {
  const icon = { pending: '⏳', done: '✅', error: '⚠️' }[part.state];
  return (
    <details className="tool-card" open={part.state === 'pending'}>
      <summary>{icon} {TOOL_LABELS[part.name] ?? part.name}
        {part.state === 'pending' && <span className="dots" />}</summary>
      <pre>{JSON.stringify(part.args, null, 2)}</pre>
      {part.result != null && <pre>{JSON.stringify(part.result, null, 2)}</pre>}
    </details>
  );
}
```

Principles: **collapsed by default with a one-line status summary** ("Searching: weather in Berlin…"), expand to dig — regular users don't read JSON. Multi-step agents get a vertical stepper; render citations as `[1]` superscripts that open a source card with the hit paragraph highlighted (the frontend half of RAG provenance).

## Transport: SSE / WebSocket / polling

| Method | When |
| --- | --- |
| **SSE** (fetch stream) | The de facto standard: server→client push over HTTP/HTTP2, auth reuses headers, Serverless-friendly (Vercel/cloud functions all support it). 90% of AI chat picks this |
| WebSocket | Genuine bidirectional realtime (collaboration, voice, barge-in interruption); heavier ops, weak Serverless support |
| Polling | Fallback (hostile proxies that buffer streams away) or low-frequency jobs |

::: warning Middlewares love to "collect then dump"
Nginx's default `proxy_buffering` hoards your SSE until the buffer fills, then spits it out at once — perfect locally, "frozen 10 seconds then one giant blob" in production. Send `X-Accel-Buffering: no` or disable buffering; audit CDNs, gateways, and cloud-function streaming support too. Extremely common deployment failure — remember it in advance.
:::

## Input-side engineering

- **Multimodal**: images via `multipart` or base64 (mind the size) → vision models; voice via MediaRecorder → ASR (Whisper API) → text into the message flow
- **@-mentions / slash commands**: make "choosing context" a structured action (picking a document = injecting its ID so the agent reads it via tools) — an order of magnitude better UX than copy-paste; table stakes for Copilot-style products
- **Context budget hints**: near the window limit, tell the user "earlier turns will be summarized" — make black-box behavior transparent
- **Pre-flight validation** (sensitive words, length): don't waste an API call on obviously bad requests

## Security: model output is untrusted input

**Never pipe model output straight into `v-html` / `dangerouslySetInnerHTML`.** Models can be induced to emit `<img onerror=...>`, malicious links, or fake "system message" styling:

1. Run the Markdown pipeline through `DOMPurify` (or equivalent), blocking `script/iframe/on*`
2. Links get `rel="noopener noreferrer"`; suspicious domains get a second-confirmation style
3. HTML code blocks render escaped source by default — **never** offer a "render this HTML" button (a classic XSS suicide)
4. Privacy fields (phone numbers etc.) are masked server-side before delivery — don't count on the frontend to hide them

## Instrumentation (the JD's "AI feature success rate")

Beyond classic frontend analytics, AI features need this set: **TTFT, total generation time, interruption rate, retry rate, error-type distribution, per-session token cost (from response `usage`), thumbs-up/down ratio**. "User wait time and retry count" are direct AI-experience metrics — answer with this set when asked "how do you measure whether an AI feature is good?"

## Interview self-check

1. What are the streaming-Markdown rendering pitfalls? How do you handle unclosed code fences?
2. The moment Stop is pressed, what happens on each side? Why does it save tokens?
3. How do you implement auto-scroll without fighting the user's manual scrolling?
4. Why can't model-returned HTML/Markdown go straight to innerHTML?
5. From page load to the first visible token — what latency sources sit on the path? (network, server queue, auth, model TTFT, proxy buffering)

## Next up

- After launch: evaluation, cost, observability, and the career sprint → [Production & Career Guide](/en/agent/production)
