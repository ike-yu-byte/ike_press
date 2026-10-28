# RAG (Retrieval-Augmented Generation)

> RAG is the single most-requested hard skill in JDs, no contest: "deep understanding of RAG (reranking, multi-way recall, knowledge-graph integration)". The essence in one line: **before answering, let the model look it up in your private data, then stuff what it finds into the context before generating**. This lesson makes every pipeline stage concrete — why, what to pick, how to tune.

## Why RAG (the standard answer to interview question one)

Three ways to get knowledge into a model — stuff the prompt / fine-tune / RAG:

| Approach | Problem |
| --- | --- |
| Rely on model memory | It's never seen your private data → hallucination; knowledge frozen at training cutoff → stale |
| Fine-tuning | Data updates need retraining; knowledge "baked into weights" can't be cited; expensive |
| **RAG** | Update = re-ingest, minutes; answers carry citations; data stays in your store, privacy controlled; cheap |

Where it fits: enterprise knowledge-base Q&A, document assistants, support bots, codebase Q&A — i.e. the day-to-day of most "AI + business" roles.

## The pipeline at a glance

```text
Offline build:  docs → parse (PDF/HTML/MD) → chunk → embed → vector DB (+ inverted index)
Online query:   question → (rewrite) → embed → retrieve Top-K → rerank → assemble prompt → LLM generate → citations
```

Every stage is independently optimizable — when discussing a RAG project, **walk the stages and state what you changed and how the metric moved**, ten times stronger than reciting concepts.

## 1. Parsing & chunking

Garbage in, garbage out: **retrieval quality is capped by chunking**.

- **Fixed length**: simplest, ~512 tokens/chunk + 10–15% overlap (so meaning isn't severed at boundaries). Good starting point.
- **Recursive split**: by separator priority (paragraph → sentence → char), preserving structure. LangChain's `RecursiveCharacterTextSplitter`.
- **Structure-aware**: Markdown by heading, code by function, HTML by DOM — **if your data has structure, don't flatten it**. Keep tables and code blocks as their own chunks.
- **Parent-child (small-to-big)**: retrieve with small chunks (focused, precise hits), then feed the model the hit's **larger parent chunk** (full context). A very high-ROI advanced trick.

Rules of thumb: 300–800 characters per chunk is common for docs; **eyeball 20 random chunks** — more useful than any parameter tuning.

## 2. Embedding model selection

Turn each chunk into a vector. Common choices: OpenAI `text-embedding-3` series, the strong open-source `bge-m3` (Chinese-capable, self-hostable), `text2vec`. Judge on three axes: **Chinese/multilingual quality, vector dimension (storage & speed), max input length**.

::: warning Never mix embedding models
Building the index and querying it must use **the same model (even the same version)** — vector spaces differ across models; switching means a full re-index. A high-frequency incident.
:::

## 3. Vector databases

| Product | Niche |
| --- | --- |
| pgvector | Postgres extension — **best for small/mid projects**, reuses your existing DB & permissions, zero new ops |
| Chroma / sqlite-vec | embedded/local prototypes; the least friction for frontend devs running demos |
| Qdrant / Milvus / Weaviate | dedicated vector DBs: 100M+ vectors, hybrid search, sharding; Milvus dominates big domestic shops |
| Pinecone | fully managed SaaS, common abroad |
| ES/OpenSearch | teams already on ES add kNN; hybrid search comes naturally |

Selection talk (use verbatim): **under ~tens of millions of vectors with Postgres already → pgvector, no hesitation; 100M+ vectors, high QPS → Milvus/Qdrant; want BM25+vector hybrid without running two systems → OpenSearch**.

Minimal working example (pgvector + Node):

```sql
-- 1. table: vector column + raw text + metadata (source file, page — for citation display)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE chunks (
  id bigserial PRIMARY KEY,
  content text NOT NULL,
  embedding vector(1024) NOT NULL,          -- dimension follows the embedding model
  meta jsonb
);
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);  -- HNSW approximate index
```

```ts
// 2. query: embed the question, take Top-K by cosine distance
const qVec = await embed(question);
const rows = await pool.query(
  `SELECT content, meta, 1 - (embedding <=> $1::vector) AS score
   FROM chunks ORDER BY embedding <=> $1::vector LIMIT 8`,
  [JSON.stringify(qVec)],
);
```

**What to know about ANN indexes**: exact nearest neighbor is infeasible at millions of vectors, so production uses HNSW/IVF — trading a little recall for orders-of-magnitude speed; `ef_search`/`nprobe` are the seesaw knobs.

## 4. Multi-way & hybrid recall

The JD's "multi-way recall" isn't arcane: vector and keyword search **each have blind spots**, so run both.

- Vector search understands semantics ("how to get money back" recalls "refund process") but misses **exact matches** (error code `ERR-3047`, product SKUs, names)
- BM25 keyword search is exact but blind to paraphrase

Fusion: **RRF (Reciprocal Rank Fusion)** — don't add scores (different scales); use ranks: `score = Σ 1/(k + rank)`, ten lines of code, robust. A third route in production: **multi-query recall** (have the LLM rewrite the question into 3 phrasings and search each — fixes "user phrasing doesn't match doc phrasing").

## 5. Rerank: the highest-ROI improvement

First-pass retrieval is "coarse ranking": query vs a 512-token chunk by vector distance, error-prone. Rerank is "fine ranking": feed query and each candidate **as a pair** into a cross-encoder (e.g. `bge-reranker-v2`) to re-score — slower but far more accurate.

Standard play: **vector+BM25 recall Top-50 → rerank down to Top-5 for the model**. Most "RAG answers off-target" tickets improve by half from just adding a rerank layer. Hosted options exist (Cohere Rerank, cloud vendors); self-host with the bge series.

## 6. Assembling the prompt & generating

```text
You are an enterprise knowledge assistant. Answer only from <docs>; if insufficient, say "not found in the knowledge base" — never fabricate.
Cite sources as [number] at the end.

<docs>
[1] (source: expense-policy-v3.md §2) Lodging cap: up to 600 CNY/night in tier-1 cities...
[2] (source: finance-faq.xlsx row45) Lodging receipts must be filed within 30 days of checkout...
</docs>

Question: what's the nightly hotel cap? What are the receipt rules?
```

Details: **order chunks by rerank score** (the other half of fighting lost-in-the-middle: put the most relevant at the ends); carry source metadata (for citation superscripts and UI source-jumps — a frontend bonus); force "say you don't know", turning hallucination from a vibe into a measurable rate.

## 7. Evaluation: the line between RAG and "search-and-paste"

Test on two layers; a system without retrieval-layer eval is flying blind:

- **Retrieval quality** (no generation, fast & cheap): label 30–50 「question → should-hit chunk」 pairs, compute **Recall@K / MRR**. Re-run on every chunking/model/top-k change.
- **End-to-end quality**: the **RAGAS** framework's four metrics — Faithfulness (is the answer true to retrieved content, i.e. hallucination), Answer Relevance (did it answer), Context Precision (useful-info density in recall), Context Recall (was everything needed recalled). Auto-scored via LLM-as-judge.

## Advanced topics (interview differentiators)

- **Agentic RAG**: not a fixed "retrieve-then-answer"; make retrieval a tool for the agent — the model decides whether to search, which store, and whether to re-query with a different phrasing. Multi-store routing (classify then query the right store) works the same way.
- **GraphRAG**: extract entities & relations into a knowledge graph; multi-hop questions ("which contracts is supplier A's legal rep linked to") defeat plain vector search but graphs handle them; costly to build, evaluate on need. The JD's "knowledge-graph integration" points here.
- **Query rewriting**: in multi-turn, first resolve "and it?" against history into a standalone question before retrieval (otherwise the search term is useless) — a very common practical patch.
- **Semantic cache**: similar questions hit a cached answer directly, saving a lot on repeated queries.
- **Permission filtering**: retrieval must apply the user's identity filter (`WHERE dept = user.dept`) — a mandatory enterprise security-audit item, a make-or-break beyond pure tech.

## Common pitfalls

::: danger Self-check
1. Index built and queried with different embedding models/versions → all similarities wrong
2. Chunks too large (a whole page in one) → diluted vector semantics, noisy recall
3. Blindly large top-k → context blowup + noise hurting generation; top-3~5 covers 80% of questions
4. Only testing generation, never retrieval → never know if the fault is "didn't find" vs "answered badly"
5. Flattening tables/images to plain text → all structure lost
6. No bad-case collection after launch → the knowledge base freezes on day one
:::

## Next up

- Retrieval can be a tool handed to the agent; standardizing tool supply → [Tool Ecosystem & MCP](/en/agent/mcp-tools)
