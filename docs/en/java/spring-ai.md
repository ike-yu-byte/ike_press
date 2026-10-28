# Spring AI Application Development

> A hot 2026 recruiting signal: JDs increasingly read "experience with Spring AI / LLM application development a plus". Spring AI is the Spring ecosystem's official framework for wiring LLM capability into Spring Boot systems — it does **not train models**; it engineers the landing: model portability, prompt management, RAG, tool calling, memory, observability. If you've read this site's [Agent knowledge base](/en/agent/), this chapter is the same concepts (Agent core / RAG / MCP chapters) implemented in Java/Spring.

## 1. Version Timeline & Selection (state of 2026)

| Version | Date | Baseline | Keywords |
| --- | --- | --- | --- |
| 1.0 GA | 2025-05-20 | Spring Boot 3.4+ / JDK 17 | First stable release: ChatClient, Advisors, structured output, VectorStore, RAG modules |
| 1.1 GA | 2025-11 | Boot 3.5 / JDK 17 | **Official MCP integration**, persistent ChatMemory, 850+ improvements; 1.1.6 (2026-05) is the stable pick for Boot 3.x estates |
| **2.0 GA** | **2026-06-12** | **Boot 4.0/4.1 / JDK 21** | Tool-calling architecture rebuilt (standalone `ToolCallingAdvisor`), MCP Java SDK 2.0 (Streamable HTTP default transport), positioned as an "AI-native runtime" |
| 2.1 (milestones) | since 2026-09 | Boot 4.2-M | Message Parts, OpenAI Responses API, pre-computed embeddings — preview only, keep off production |

**Selection phrasing**: Boot 3.x estate → Spring AI 1.1.x; new Boot 4 project → 2.0.x. **Versions are tightly coupled**: Spring AI must match the Boot line per the official compatibility matrix, pinned via BOM — never bump one side alone (the same lesson as Maven-chapter version arbitration).

**On Spring AI Alibaba**: Alibaba's adaptation layer over Spring AI for Qwen/DashScope, once the mainstream route to domestic models. Its cadence slowed markedly in 2026 (community discussions even flag it as stalled) — but **stock Spring AI already speaks the OpenAI-compatible protocol that Qwen, DeepSeek, Kimi and GLM all expose**, so new projects should prefer the official starter plus a compatible endpoint and drop a dependency risk.

## 2. Quick Start: ChatClient Is the Front Door

```xml
<!-- pom: BOM first (2.0.x line), then a model starter; the OpenAI-compatible protocol reaches many vendors -->
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.springframework.ai</groupId>
      <artifactId>spring-ai-bom</artifactId>
      <version>2.0.0</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
<dependencies>
  <dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-openai</artifactId>
  </dependency>
</dependencies>
```

```properties
# application.properties — DeepSeek via the OpenAI-compatible protocol; swapping vendors is config, not code
spring.openai.api-key=${AI_API_KEY}
spring.openai.base-url=https://api.deepseek.com
spring.ai.model.chat=openai
spring.ai.openai.chat.options.model=deepseek-chat
spring.ai.openai.chat.options.temperature=0.7
```

```java
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatClient chatClient;

    // ChatClient.Builder arrives via the starter's auto-configuration — plain constructor injection
    public ChatController(ChatClient.Builder builder) {
        this.chatClient = builder
                .defaultSystem("You are a support assistant. Answer concisely; say so when unsure.")
                .build();
    }

    @GetMapping("/ask")
    public String ask(@RequestParam String q) {
        return chatClient.prompt().user(q).call().content();      // blocking
    }

    @GetMapping(value = "/stream", produces = "text/event-stream")
    public Flux<String> stream(@RequestParam String q) {
        return chatClient.prompt().user(q).stream().content();    // streaming SSE, token by token
    }
}
```

- Two abstraction levels to remember: `ChatModel` is the low-level vendor adapter; **`ChatClient` is the business-facing front door** (fluent API + advisor chain managing memory/retry/observability).
- Streaming chunks are **incremental deltas** — concatenate in order; for the full text use the non-streaming `call()`. A frequent integration bug.

### Structured output: straight into Java objects

```java
import org.springframework.ai.chat.client.ChatClient;

public record TicketRoute(String category, int priority, String team, String reason) {}

public TicketRoute classify(String text) {
    return chatClient.prompt()
            .user("Classify this ticket: " + text)
            .call()
            .entity(TicketRoute.class);   // schema generated → call → validate → deserialize
}
// Backed by BeanOutputConverter<T>; custom OutputConverters or an explicit JSON Schema for complex shapes
```

Interview one-liner: structured output collapses "hand-parsed JSON + exception retries" into one declarative call — precisely the value Spring AI claims over raw HTTP calls.

## 3. The Advisor Chain & Conversation Memory

Advisors are AI's answer to filters/interceptors: uniform logic before/after every exchange, official or custom.

```java
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;

ChatMemory memory = MessageWindowChatMemory.builder().maxMessages(20).build();

ChatClient client = builder
        .defaultSystem("You are an expense-policy assistant.")
        .defaultAdvisors(
                MessageChatMemoryAdvisor.builder(memory).build(),   // memory: last N turns auto-attached
                // QuestionAnswerAdvisor adds RAG — next section
                SimpleLoggerAdvisor.builder().build())              // debug logging
        .build();

// Multi-turn: pass the conversation id explicitly (1.1 deprecated implicit ids — correct for multi-instance)
String answer = client.prompt()
        .user("How much of my budget is left?")
        .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, user.getId()))
        .call().content();
```

- In production swap `ChatMemory` for a Redis/JDBC-backed store (`RepositoryChatMemory` with your own repository) or sessions die on restart.
- A custom Advisor = implement `CallAdvisor`/`StreamAdvisor`: content-safety filtering, PII masking, audit logging live here — the landing spot for "how do you add guardrails to your AI app".

## 4. Tool Calling (the Spring way to function calling)

```java
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;

public class OrderTools {
    private final OrderService orderService;
    public OrderTools(OrderService orderService) { this.orderService = orderService; }

    @Tool(description = "Query order status and amount by order number")
    public OrderStatusView getOrder(@ToolParam(description = "order number") String orderNo) {
        return orderService.statusView(orderNo);   // JSON schemas generated from signatures
    }
}

String answer = chatClient.prompt()
        .user("Where is order SO20261028001 right now?")
        .tools(new OrderTools(orderService))
        .call().content();
// model requests a tool call → framework executes → result fed back → model continues until final answer
```

- **The 2.0 architecture point (interview differentiator)**: in 1.x the tool loop lived inside each `ChatModel`; 2.0 extracts it into a standalone `ToolCallingAdvisor` — the model only emits raw tool-call requests, and retries/logging/observability cover tool rounds for free via the advisor chain.
- Keep tool methods **idempotent** and return failure *descriptions* (not stack traces) — the model reasons over them. Description quality drives call accuracy (the Prompt-engineering chapter's lessons apply verbatim).
- Division of labor with MCP: `@Tool` = private in-process tools; MCP = tools as **cross-process, cross-framework standard services**. Both surface as tool sources to Spring AI.

## 5. RAG: the Full Knowledge-Base Pipeline

```java
// —— ETL: documents → split → embed → store (offline job or at startup) ——
import org.springframework.ai.document.Document;
import org.springframework.ai.reader.tika.TikaDocumentReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;

List<Document> docs = new TikaDocumentReader(resource).get();       // PDF/Word/HTML all handled
docs = new TokenTextSplitter().apply(docs);                          // ~800-token chunks by default
vectorStore.add(docs);                                               // embedding happens inside

// —— retrieval-augmented answering: QuestionAnswerAdvisor injects matches into the prompt ——
import org.springframework.ai.chat.client.advisor.QuestionAnswerAdvisor;
import org.springframework.ai.vectorstore.search.SearchRequest;

ChatClient ragClient = builder
        .defaultAdvisors(new QuestionAnswerAdvisor(vectorStore,
                SearchRequest.builder().topK(4).similarityThreshold(0.6).build()))
        .build();

String answer = ragClient.prompt().user("What is the travel lodging allowance?").call().content();
```

- `VectorStore` is the portable abstraction: PGVector / Redis / Milvus / Chroma / ES… switching stores is a starter-and-connection change, zero business code — the framework-level answer to "vector DB selection".
- Threshold and topK are the quality knobs: prefer "not in the knowledge base" over fabrication — the first anti-hallucination gate is retrieval quality, not the model.
- Advanced chain maps one-to-one onto the [Agent knowledge base RAG chapter](/en/agent/rag): hybrid retrieval, rerank before `DocumentRetriever`, metadata filters, citation pass-through (return chunk ids for the UI).
- Don't ship unevaluated: 50–100 golden-set questions with faithfulness/relevance metrics first — same methodology as the production chapter.

## 6. MCP: Turning a Spring App into a Standard Tool Node

```xml
<!-- As an MCP server: expose business capabilities to any AI client (Claude / IDEs / other agents) -->
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-mcp-server-webmvc</artifactId>
</dependency>
```

```java
@Tool(description = "Query current stock quantity")
public int stock(@ToolParam(description = "SKU ID") Long skuId) { ... }
// @Tool methods + the MCP starter register as MCP tools automatically — no protocol code
```

- MCP joined the official mainline in 1.1; 2.0 ships MCP Java SDK 2.0 with **Streamable HTTP as the default transport** (stdio suits local debugging).
- Two roles: a Spring AI app can be an **MCP server** (exposing internal tools) or an **MCP client** aggregating external tool services into `ChatClient`.
- Protocol concepts (host/client/server, resources/prompts) are in the [Agent knowledge base MCP chapter](/en/agent/mcp-tools) — the Java side is simply the official landing of the same spec.

## 7. Observability, Evaluation & Testing

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,chat-model-observability
  observations:
    enabled: true          # ChatModel / VectorStore / tool calls emit Micrometer metrics
```

- Out-of-the-box metrics: token usage, latency, error rate, tool-round counts — Prometheus + Grafana gives an AI dashboard for free; traceId propagation per the [microservices chapter](./microservices).
- **Mock locally** (saves money, stabilizes CI): define a fixed-text `ChatModel` bean under `@Profile("mock")` so tests and frontend integration never hit a real model.
- Evaluation: Spring AI ships similarity/relevance eval support; pair with a platform like Langfuse for prompt versioning (methodology in the [Agent production chapter](/en/agent/production)).

## 8. Capstone Example: Expense-Policy Q&A Assistant (résumé-worthy)

A sub-200-line project that stitches the whole chapter into one AI highlight for a Java résumé:

1. Boot 3.5 + Spring AI 1.1 (or Boot 4 + 2.0), DeepSeek/Qwen via the OpenAI-compatible protocol;
2. policy PDFs → Tika reader → splitter → PGVector;
3. `ChatClient` + `QuestionAnswerAdvisor` answering with cited sources, streamed over SSE;
4. `@Tool` exposing "check my reimbursement progress"; `ChatMemory` for follow-up questions;
5. a custom Advisor masking PII plus a fallback script; an Actuator dashboard showing token cost.

Interview expansions you should volunteer: why the threshold is 0.6 (swept on the eval set), how streaming guards injection and truncation, how tool failures are phrased back to the model — each detail is a differentiator.

## 9. Chapter interview checklist

1. Spring AI vs LangChain4j — how to choose? ("Whole stack is Spring" is an engineering decision, not a religion)
2. ChatClient vs ChatModel; what does the advisor chain solve?
3. The 1.x → 2.0 tool-calling architecture change (standalone ToolCallingAdvisor).
4. Structured output mechanics (schema injection + validation + conversion).
5. The RAG pipeline's component mapping (Reader/Splitter/VectorStore/QuestionAnswerAdvisor).
6. MCP's server/client roles in Spring AI and the default transport.
7. Sharing conversation memory across instances (persistent ChatMemory + explicit conversationId).
8. How to read the compatibility matrix — and why bumping one version alone is a trap.
