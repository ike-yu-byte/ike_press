# LLM Basics & API Calling

> When a JD says "familiar with LLM internals", the real bar is: **understand the engineering meaning of tokens, context windows, and sampling parameters — know how they hit your cost, latency, and UI**. This lesson lays that foundation, then gets you calling an OpenAI-compatible API for real — including streaming output, the prerequisite for everything after.

## The one-sentence principle: it predicts the next token

An LLM does exactly one thing: **given the preceding text, predict the probability distribution of the next token, sample one, append it, and repeat**. That's next-token prediction.

Once you get this, many phenomena click:

- **Why hallucination happens**: it isn't "looking things up" — it's generating text that *looks most like a correct answer*. When unsure it still won't say "I don't know", because that wouldn't look like its training data.
- **Why the context window is a hard limit**: every call re-feeds the entire history; the model has no hidden memory.
- **Why streaming works**: tokens are generated one by one, so pushing them as they appear is natural.

::: warning How deep must an application engineer go?
Know what attention and the three training stages (pretraining/SFT/RLHF) **are and what problem they solve** — that's enough. Asked "explain the Transformer", answering "self-attention lets each token attend to the whole sequence, which is where context windows and KV-cache cost come from" already clears the bar. Spend your time on engineering delivery — far higher ROI.
:::

## Tokens: the billing and context unit

A token is not a word. Models use BPE-style algorithms to split text into subword pieces:

- English: 1 token ≈ 0.75 words; `"unbelievable"` splits into `un`/`believ`/`able`, about 3 tokens
- Chinese: 1 character ≈ 1–2 tokens (common chars ~1, rare chars split further)
- Code: indentation and symbols each cost tokens — real usage runs higher than eyeballing suggests

**Why you must care**: APIs bill per token (input and output priced separately; output usually 3–5× pricier); context windows are counted in tokens; latency is dominated by **output token count**. The direct engineering corollary: your system prompt and tool schemas are re-billed as input tokens on every request — **verbose prompts cost real money**.

Estimation tools: OpenAI's <a href="https://platform.openai.com/tokenizer" target="_blank" rel="noopener noreferrer">tokenizer page</a>, or the `gpt-tokenizer` npm package for local pre-checks.

## Context windows: bigger is not better

Models offer 8K/32K/128K/200K/1M-token windows, but remember three things in production:

1. **The window is shared by input + output.** No room left for output = errors or truncation.
2. **Lost in the middle**: attention over the *middle* of very long contexts degrades markedly. Put critical instructions at the start (system) and the end (recent messages); order retrieved documents by relevance, not by time.
3. **A long context is not free memory.** Stuffing 100K tokens of history means paying for it on every request. Hence "conversation summarization" and "RAG on-demand recall" — **only include the context you currently need**.

## The key sampling parameters

| Parameter | What it does | Engineering advice |
| --- | --- | --- |
| `temperature` | Sampling randomness (0 = greedy) | 0–0.3 for extraction/classification/code; 0.7–1 for creative copy. Tune this or top_p, not both |
| `top_p` | Nucleus sampling: draw from the smallest candidate set with cumulative probability p | Alternative to temperature |
| `max_tokens` / `max_completion_tokens` | Caps output length | Always set it! Prevents runaway spend; also forces brevity |
| `stop` | Stops generation at a given string | Pairs with custom formats (e.g. `\n\n###`) |
| `seed` | Improves reproducibility | Use it in eval regression |
| `stream` | Streaming response | Mandatory for chat products, see below |
| `response_format` | Constrains output to JSON | Structured extraction; see [Prompt Engineering](/en/agent/prompt-engineering) |

## Message structure: the shape of one call

A Chat Completions request is **an array of messages**, each with a `role`:

```ts
const messages = [
  { role: 'system', content: 'You are a rigorous contract-review assistant. Answer only from the given clauses.' },
  { role: 'user', content: 'What are the risks in this penalty clause?' },
  { role: 'assistant', content: 'The penalty is set at 80% of the total price; a court would likely reduce it...' },  // previous answer
  { role: 'user', content: 'So what is a reasonable percentage?' },                                                     // this turn
];
```

**The essence of multi-turn chat**: "memory" is just re-sending the history messages plus the new question. Session management = CRUD on this array (truncation, summarization, pruning tool messages).

Role division: `system` (or the newer `developer`) defines persona and rules with highest priority; `user` carries user input; `assistant` is model output (kept when replaying history); `tool` carries tool results back (used by Function Calling, next lesson).

## Your first call: the OpenAI-compatible protocol

`/v1/chat/completions` is the de facto standard: DeepSeek, Kimi, Zhipu, Qwen (DashScope compat mode), and local Ollama **all support it** — swap `baseURL` + `apiKey` + `model` and you've switched vendors. That is the actual workload behind "integrate OpenAI/Claude/Gemini/Qwen/DeepSeek APIs" in JDs.

```ts
// Node 18+ ships fetch; never do this in the browser — the apiKey would leak to the client
const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.API_KEY}`,
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: 'Explain closures in one sentence' }],
    temperature: 0.3,
    max_tokens: 200,
  }),
});
const data = await res.json();
console.log(data.choices[0].message.content);
console.log(data.usage);   // { prompt_tokens, completion_tokens, total_tokens } — accounting lives here
```

::: danger Keys stay on the server, always
Putting an apiKey in frontend code or client-exposed env vars is hanging your credit card on the internet. Frontend → your own backend/Serverless function (hides the key, adds auth and rate limiting) → model API. Domestic "cloud dev / function compute" platforms are extremely frontend-friendly — a week to pick up, and genuinely one of your moats when switching to AI work.
:::

The official SDK spares you the hand-rolled fetch (auto-retry, full types):

```ts
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.API_KEY,
  baseURL: 'https://api.deepseek.com/v1',   // one line to switch vendors
});

const completion = await client.chat.completions.create({
  model: 'deepseek-chat',
  messages: [{ role: 'user', content: 'hello' }],
});
```

## Streaming: parse SSE by hand at least once

A chat product without streaming = users staring at a blank screen for 10 seconds. The protocol is **SSE (Server-Sent Events)**: response `Content-Type: text/event-stream`, body is lines of `data: {...}`, terminated by `data: [DONE]`.

```ts
const res = await fetch(baseUrl + '/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
  body: JSON.stringify({ model, messages, stream: true }),
});

const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  // Split by line; the last line may be incomplete — keep it in the buffer for the next chunk.
  // This is the most common bug in hand-written parsers.
  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';
  for (const line of lines) {
    const payload = line.replace(/^data: ?/, '').trim();
    if (!payload || payload === '[DONE]') continue;
    const json = JSON.parse(payload);
    const delta = json.choices[0]?.delta?.content ?? '';   // note: delta, not message
    if (delta) process.stdout.write(delta);                // incremental piece; concat for the full answer
  }
}
```

Each streaming chunk carries only the **delta**; the full answer = all deltas concatenated. The rendering side (typewriter, incremental Markdown parsing, interruption) is a whole act of its own — expanded in [Frontend Agent Engineering](/en/agent/agent-ui).

**Two latency metrics worth memorizing**: TTFT (Time To First Token — decides "does it *feel* fast"; optimize with streaming and prompt caching) and total generation time (decides "is it actually fast"; optimize output length and parallelism).

## Embeddings: text into vectors

Embedding models (`text-embedding-3` series, the domestically strong open-source `bge-m3`, etc.) map arbitrary text to a high-dimensional vector where **semantic similarity → geometric proximity**. They are the bedrock of RAG — concept here, pipeline details in [RAG](/en/agent/rag).

```ts
const emb = await client.embeddings.create({
  model: 'text-embedding-3-small',
  input: ['the weather is lovely today', 'perfect day to go outside'],
});
// emb.data[0].embedding is a number[]; cosine similarity of the two sentences
// will be clearly higher than with an unrelated sentence
```

## The model landscape (2026)

| Camp | Representatives | What an app engineer should know |
| --- | --- | --- |
| Closed flagship | GPT series, Claude, Gemini | Strongest, priciest; Claude for long text & code, Gemini for multimodal & huge windows |
| Chinese frontier | DeepSeek, Kimi, Qwen, Doubao/Ark | Cheap, direct domestic access, mostly OpenAI-compatible; the common enterprise-intranet choice |
| Open weights, self-hosted | Qwen, Llama, GLM, DeepSeek open models | For data-sovereignty (compliance) scenarios via Ollama/vLLM; do the GPU math |
| Small/edge | 1B–8B distilled models | Plenty for narrow tasks (classify, extract) with tiny latency/cost — the "budget tier" in **model routing** |

The three selection questions — the standard interview answer: **can the data leave the network/domain (compliance) → how much reasoning does the task need (quality) → per-request cost & latency budget (money)**. Never default to the flagship: weak model + good prompt + precise context beats it surprisingly often.

## Interview self-check

1. Difference between temperature and top_p? When do you tune which?
2. The window is 128K — can I just paste in a 200-page document? (lost-in-the-middle, cost, RAG comparison)
3. In a streaming response, what's the relationship between `delta` and the full `message`? What is `[DONE]`?
4. How is multi-turn "memory" actually implemented? (tests: models are stateless; history is replayed)
5. Why does output cost more per token than input? (prefill parallelizes; decode is autoregressive per token)

## Next up

- Make the model emit what your code can parse → [Prompt Engineering & Structured Output](/en/agent/prompt-engineering)
- Put retrieval before generation → [RAG](/en/agent/rag)
