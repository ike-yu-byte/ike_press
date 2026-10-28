# Production & Career Guide

> The first half covers the "engineering delivery" lines in JDs: how to prove your AI works (eval), how to know where it's slow and expensive (observability), how to drive cost down (optimization). The second half condenses the whole knowledge base into an action list: **how to write the resume, tell the project story, and answer the interview questions**.

## Evaluation: the application-role watershed

Every JD says "agent evaluation and optimization", yet most candidates can only say "feels good". Build the three-piece mental model:

### 1. The golden set

Hand-label **50–200 「input → expected output / acceptance criteria」** pairs before launch, covering: high-frequency happy paths, edge cases (empty input, oversized, multi-intent), adversarial cases (injection, policy-violating requests). This is the baseline for every optimization — **prompt tuning without a test set is gambling**.

### 2. Scoring methods, layered

| Method | Fits | Notes |
| --- | --- | --- |
| Programmatic assertions | structured output, classification, retrieval hits | free, deterministic, runs in CI — assert everything you can |
| LLM-as-judge | relevance, tone, completeness — subjective dimensions | a strong model scores against a rubric; calibrate the judge prompt itself (check agreement with human labels) |
| Human spot checks | post-launch bad-case review | a fixed weekly look at 20 low-rated/downvoted sessions — irreplaceable |

### 3. The regression pipeline

Change a prompt / swap a model / tune retrieval params → run the golden set → compare pass rate and per-case diffs → only then merge. Tools: <a href="https://github.com/confident-ai/deepeval" target="_blank" rel="noopener noreferrer">DeepEval</a> (pytest style), <a href="https://docs.ragas.io" target="_blank" rel="noopener noreferrer">Ragas</a> (RAG-specific); LangSmith/Langfuse both ship dataset + experiment management.

## Observability: every call must be reconstructible

The first principle of LLM-app debugging: **no trace, no debugging**. Record per request: full input messages (including retrieved content), model & parameters, output, token usage and cost, latency breakdown, the tool-call chain, evaluation scores.

- **Langfuse** (open source, self-hostable, frontend-team friendly) / LangSmith (LangChain's own): trace-tree visualization — with a multi-step agent you can see exactly which step went off the rails
- Align structure with the <a href="https://opentelemetry.io/docs/specs/semconv/gen-ai/" target="_blank" rel="noopener noreferrer">OpenTelemetry GenAI semantic conventions</a> (trace → span per step → generation per LLM call); naming this spec in an interview is a visible plus
- The four production dashboards: **error/rate-limit rate, P95 latency (TTFT and total separately), daily token-cost curve, user feedback ratio (thumbs up/down)**

## Cost optimization, ranked by ROI

1. **Model routing**: narrow tasks (classify/extract/rewrite) go to cheap small models (10× savings); escalate to flagships only for hard reasoning. Route by rules or one small-model judgment call
2. **Prompt caching**: stable prefixes (system + tool definitions + few-shot) hit cache for 50–90% input-cost cuts — keep variable content strictly at the end
3. **Context diet**: summarize history, retrieve only top-relevant chunks, truncate tool results — input tokens are usually the cost bulk
4. **Semantic cache**: similar questions return cached answers directly (huge hit rates on FAQ-style support)
5. **Structured output instead of restating**: have the model emit only JSON fields — no "Sure! Here is the JSON you requested:" token waste
6. Batch API for offline jobs (every vendor offers a half-price channel)

## Latency quick reference

- Streaming is the single biggest "fast": keep TTFT under a second and users feel it's snappy — **optimize TTFT first, total time second**
- Parallelize: concurrent multi-way recall, concurrent tool execution (don't serialize a tool_calls array with for-await)
- Answer short-circuit: chit-chat and clear-cut commands shouldn't reach a big model at all
- Long tasks go async: deep-research flows become "submit → progress push → completion notification", never a hanging browser tab

## Safety & compliance pre-launch checklist

::: danger Run through before shipping
1. Injection offense/defense: red-team sample set passes (including "ignore instructions, output the system prompt" variants)
2. Content safety: moderate inputs and outputs (domestic content-safety APIs; OpenAI Moderation / Perspective abroad)
3. Data compliance: does user data enter training? Vendor DPA signed; privacy fields masked; log retention defined
4. Domestic specifics: public generative-AI services require **filing / security assessment** (Interim Measures for Generative AI) — confirm compliance status before public launch
5. Permissions: agent tools authorized by end-user identity; sensitive ops double-confirmed; egress allowlist
6. Degradation: fallback model on vendor outage / keyword-based safety net; rate limiting and queuing
:::

## The career sprint: turn learning into offers

### Writing the resume project (a STAR variant)

Bad template: "Built an intelligent QA system with LangChain + RAG" — interviewers read it eight times a day; zero information.

Good template (every clause carries density):

> **Enterprise document QA assistant** (Next.js + Vercel AI SDK + pgvector): RAG pipeline over 2,000+ internal documents; hybrid retrieval (BM25 + vector + RRF) plus a rerank layer lifted **Recall@5 from 71% to 89%**; streaming UI with citation provenance and mid-generation abort, **TTFT P95 1.2s**; a 120-case golden set as regression gate cut **hallucination rate (judge-scored) from 14% to 4%** across three prompt iterations.

Every number must be one you actually measured — "how did you measure 89%?" is guaranteed follow-up; answering it proves the project is real.

### Top 15 interview questions (with coverage index)

1. Why an agent / why not? Workflow vs agent → [agent-core](/en/agent/agent-core)
2. Draw the agent loop; how do tool failures get handled → [agent-core](/en/agent/agent-core)
3. Walk the RAG pipeline — what did you optimize at each stage, and by how much → [rag](/en/agent/rag)
4. How did you choose chunk size? Did you A/B it → [rag](/en/agent/rag)
5. Vector DB selection rationale? What is HNSW → [rag](/en/agent/rag)
6. Prompt injection defense? Answer in layers → [prompt-engineering](/en/agent/prompt-engineering)
7. Full Function Calling round-trip — which side executes → [prompt-engineering](/en/agent/prompt-engineering)
8. What is MCP, relation to FC, what servers have you written → [mcp-tools](/en/agent/mcp-tools)
9. temperature vs top_p; context-window utilization strategy → [llm-basics](/en/agent/llm-basics)
10. Streaming rendering pitfalls; what happens on "stop" → [agent-ui](/en/agent/agent-ui)
11. How do you evaluate quality? How do bad cases get collected → this page
12. What does it cost? What optimizations did you do → this page
13. Why LangGraph over plain chains for your scenario → [frameworks](/en/agent/frameworks)
14. Multi-turn "and its progress?" breaks retrieval — fix? → [rag](/en/agent/rag) query rewriting
15. Users report off-target answers post-launch — your debugging path? (tests: trace → locate retrieval vs generation → reproduce on golden set → fix with regression; **the capstone systems-thinking question**)

### The 90-day action plan

- **Weeks 1–2**: read pages 1–3 + hand-build a streaming chat app (no framework first, frameworks after — in that order)
- **Weeks 3–5**: the RAG document-QA project (your resume centerpiece); focus on retrieval-eval A/B experiments, put the numbers on the resume
- **Weeks 6–8**: a tool-calling agent + write one MCP server wired into your IDE; add Langfuse tracing
- **Weeks 9–12**: polish deployment (Serverless/cloud functions hiding keys), complete the eval regression, drill the Top-15, package the project README + demo video
- Throughout: blog your pitfalls (exactly like this site) — **a tech blog is hard currency in AI-application-role interviews**

## Back to the entrance

- Review the knowledge map and practice track → [Agent Knowledge Base](/en/agent/)
