# Spring AI 应用开发

> 2026 年 Java 招聘的新热点：JD 开始成批出现"有 Spring AI / 大模型应用开发经验优先"。Spring AI 是 Spring 生态把大模型能力接进 Spring Boot 系统的官方框架——它**不训练模型**，解决的是"工程化落地"：模型可移植、Prompt 管理、RAG、工具调用、记忆、可观测。学过本库 [Agent 知识库](/agent/) 的话，本章就是同一套概念（见 Agent 核心/RAG/MCP 三章）的 Java/Spring 实现。

## 一、版本演进与选型（2026 现状）

| 版本 | 时间 | 基线 | 关键词 |
| --- | --- | --- | --- |
| 1.0 GA | 2025-05-20 | Spring Boot 3.4+ / JDK 17 | 首个正式版：ChatClient、Advisor、结构化输出、VectorStore、RAG 模块成型 |
| 1.1 GA | 2025-11 | Boot 3.5 / JDK 17 | **正式整合 MCP**、ChatMemory 持久化增强、850+ 改进；1.1.6（2026-05）是 Boot 3.x 存量项目的稳定首选 |
| **2.0 GA** | **2026-06-12** | **Boot 4.0/4.1 / JDK 21** | 工具调用架构重构（独立 `ToolCallingAdvisor`）、MCP Java SDK 2.0（Streamable HTTP 默认传输）、定位"AI 原生运行时" |
| 2.1（里程碑） | 2026-09 起 | Boot 4.2-M | Message Parts 结构化消息、OpenAI Responses API、预计算 Embedding——预览，勿上生产 |

**选型口径**：Boot 3.x 老项目 → Spring AI 1.1.x；新建 Boot 4 项目 → 2.0.x。**版本强耦合**：Spring AI 版本必须与 Boot 版本按官方兼容矩阵成套使用，BOM 锁版本，绝不能只升一个（这是与 Maven 章"版本仲裁"同一课）。

**关于 Spring AI Alibaba**：它是阿里基于 Spring AI 对通义千问/百炼（DashScope）的适配封装，曾是国内接通义的主流入口。2026 年其迭代明显放缓（社区已有停更讨论）——但**官方 Spring AI 本身已支持 OpenAI 兼容协议直连国内主流模型（通义、DeepSeek、Kimi、GLM 均有 OpenAI-compatible endpoint）**，新项目建议直接用官方 starter + 兼容协议，少一层依赖风险。

## 二、快速开始：ChatClient 是主入口

```xml
<!-- pom：BOM 锁版本（2.0.x 线），再引模型 starter；OpenAI 兼容协议可直连多家国产模型 -->
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
# application.properties —— 以 DeepSeek 为例（OpenAI 兼容协议），换模型只改配置不改代码
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

    // ChatClient.Builder 由 starter 自动装配注入——和所有 Spring Bean 一样走构造器注入
    public ChatController(ChatClient.Builder builder) {
        this.chatClient = builder
                .defaultSystem("你是客服助手，回答简洁，不确定就说不确定。")
                .build();
    }

    @GetMapping("/ask")
    public String ask(@RequestParam String q) {
        return chatClient.prompt().user(q).call().content();      // 阻塞式
    }

    @GetMapping(value = "/stream", produces = "text/event-stream")
    public Flux<String> stream(@RequestParam String q) {
        return chatClient.prompt().user(q).stream().content();    // 流式 SSE，前端逐字渲染
    }
}
```

- 抽象层次记两条：`ChatModel` 是厂商适配的底层原始接口；**`ChatClient` 是面向业务的主入口**（fluent API + Advisor 链统一管理记忆/重试/可观测）。
- 流式输出的 chunk 是**增量片段**，需要按序拼接；拿完整回复用非流式 `call()`——联调高频坑。

### 结构化输出：直接映射 Java 对象

```java
import org.springframework.ai.chat.client.ChatClient;

public record TicketRoute(String category, int priority, String team, String reason) {}

public TicketRoute classify(String text) {
    return chatClient.prompt()
            .user("把工单分类：" + text)
            .call()
            .entity(TicketRoute.class);   // 自动生成 JSON Schema → 调用 → 校验 → 反序列化
}
// 底层是 BeanOutputConverter<T>；复杂结构可自定义 OutputConverter 或传 JSON Schema
```

面试一句话：结构化输出把"手动解析 JSON + 异常重试"收敛成一行声明式调用，这正是 Spring AI 相对裸调 HTTP API 的核心价值之一。

## 三、Advisor 拦截器链与对话记忆

Advisor 是 Spring AI 的"AI 版 Filter/Interceptor"：每次对话前后统一插入逻辑，官方与自定义能力都挂在这条链上。

```java
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;

ChatMemory memory = MessageWindowChatMemory.builder().maxMessages(20).build();

ChatClient client = builder
        .defaultSystem("你是报销助手。")
        .defaultAdvisors(
                MessageChatMemoryAdvisor.builder(chatMemory).build(), // 记忆：自动携带近 N 轮
                // QuestionAnswerAdvisor 挂 RAG 检索，见下节
                SimpleLoggerAdvisor.builder().build())                // 调试日志
        .build();

// 多轮对话：显式传会话 id（1.1 起废弃隐式会话 id——多实例部署下这是正确做法）
String answer = client.prompt()
        .options(ChatOptions.builder().build())
        .user("我的额度还剩多少？")
        .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, user.getId()))
        .call().content();
```

- 生产把 `ChatMemory` 换成 Redis/JDBC 持久化实现（`RepositoryChatMemory` 自定义存储），否则重启丢会话。
- 自定义 Advisor = 实现 `CallAdvisor`/`StreamAdvisor`：内容安全过滤、敏感词脱敏、审计落库都写在这里——面试"你们 AI 应用怎么加护栏"的落点。

## 四、工具调用（Function Calling 的 Spring 姿势）

```java
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;

public class OrderTools {
    private final OrderService orderService;
    public OrderTools(OrderService orderService) { this.orderService = orderService; }

    @Tool(description = "按订单号查询订单状态与金额")
    public OrderStatusView getOrder(@ToolParam(description = "订单号") String orderNo) {
        return orderService.statusView(orderNo);   // 参数/返回值 JSON Schema 自动生成
    }
}

String answer = chatClient.prompt()
        .user("帮我查一下订单 SO20261028001 到哪一步了")
        .tools(new OrderTools(orderService))
        .call().content();
// 模型返回工具调用请求 → 框架执行方法 → 结果回填 → 模型继续，直到给出最终答案（自动工具循环）
```

- **2.0 架构要点（面试区分度）**：1.x 的工具循环散在各 `ChatModel` 内部；2.0 抽成独立 `ToolCallingAdvisor` 统一执行，模型只负责返回原始工具调用请求——与 Advisor 体系合流，重试/日志/可观测天然覆盖工具轮次。
- 工具方法保持**幂等**并给模型明确的失败语义（返回错误描述而不是抛栈）；给模型的描述质量直接决定调用准确率（Prompt 工程章的教训同样适用）。
- 与 MCP 的分工：`@Tool` 是本进程私有工具；MCP 是把工具做成**跨进程、跨框架的标准服务**，两边在 Spring AI 里都表现为工具来源。

## 五、RAG：知识库问答的完整管线

```java
// —— ETL：文档 → 切分 → 向量化 → 入库（离线任务或启动时执行）——
import org.springframework.ai.document.Document;
import org.springframework.ai.reader.tika.TikaDocumentReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;

List<Document> docs = new TikaDocumentReader(resource).get();       // PDF/Word/HTML 通吃
docs = new TokenTextSplitter().apply(docs);                          // 默认 ~800 token/块
vectorStore.add(docs);                                               // Embedding 由 VectorStore 自动完成

// —— 检索增强问答：QuestionAnswerAdvisor 把相似检索拼进 Prompt ——
import org.springframework.ai.chat.client.advisor.QuestionAnswerAdvisor;
import org.springframework.ai.vectorstore.search.SearchRequest;

ChatClient ragClient = builder
        .defaultAdvisors(new QuestionAnswerAdvisor(vectorStore,
                SearchRequest.builder().topK(4).similarityThreshold(0.6).build()))
        .build();

String answer = ragClient.prompt().user("差旅住宿标准是多少？").call().content();
```

- `VectorStore` 统一抽象：PGVector / Redis / Milvus / Chroma / ES……换库只换 starter 和连接配置——"知识图谱/向量库选型"面试题的框架层答案。
- 相关度阈值与 topK 是质量旋钮：宁缺毋滥（检索不到就明说"知识库未收录"），防幻觉的第一道闸在检索质量而不是模型。
- 进阶链路（本库 [Agent 知识库 RAG 章](/agent/rag) 的概念逐条对应）：混合检索、`DocumentRetriever` 前重排、元数据过滤、引用溯源（把命中片段 id 一并返回给前端展示）。
- 评测别裸奔：建 50~100 条 golden set，跑忠实度/相关性指标再上线——与 production 章同一方法论。

## 六、MCP：把 Spring 应用变成标准工具节点

```xml
<!-- 作为 MCP Server：把业务能力以标准协议暴露给任意 AI 客户端（Claude/IDE/其他 Agent） -->
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-mcp-server-webmvc</artifactId>
</dependency>
```

```java
@Tool(description = "查询当前库存数量")
public int stock(@ToolParam(description = "SKU ID") Long skuId) { ... }
// 标注 @Tool 的方法 + MCP starter 自动注册为 MCP tools，无需手写协议层
```

- 1.1 起 MCP 进入官方主线；2.0 集成 MCP Java SDK 2.0，**Streamable HTTP 为默认传输**（stdio 适合本地调试）。
- 双向角色：Spring AI 应用既可做 **MCP Server**（暴露内部工具），也可做 **MCP Client** 聚合外部工具服务进 `ChatClient`。
- 概念细节（Host/Client/Server 三原语、resources/prompts）见 [Agent 知识库 MCP 章](/agent/mcp-tools)——Java 侧只是同一协议的官方落地。

## 七、可观测、评测与测试

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,chat-model-observability
  observations:
    enabled: true          # ChatModel/VectorStore/Tool 调用自动产出 Micrometer 指标
```

- 开箱指标：token 用量、调用耗时、错误率、工具轮次数——接 Prometheus + Grafana 即成 AI 应用大盘；traceId 贯穿见[微服务章](./microservices)可观测节。
- **本地 mock 联调**（省钱且 CI 稳定）：自定义一个返回固定文本的 `ChatModel` Bean，挂 `@Profile("mock")`，测试与前端联调不真调模型。
- 评测：Spring AI 自带 `eval` 支持（相似度/相关性判定），配合 Langfuse 类平台做 prompt 版本管理（方法论见 [Agent 知识库 production 章](/agent/production)）。

## 八、综合示例：报销政策问答助手（简历可写项）

把本章串成一个 200 行内可完成的小项目，作为 Java 岗简历的 AI 亮点：

1. `spring-boot 3.5 + spring-ai 1.1`（或 Boot 4 + 2.0）+ OpenAI 兼容协议接 DeepSeek/通义；
2. 制度 PDF → Tika 读取 → 切分 → PGVector 入库；
3. `ChatClient` + `QuestionAnswerAdvisor` 实现带引用来源的政策问答，SSE 流式输出；
4. `@Tool` 挂"查我的报销进度"接口（工具调用）；`ChatMemory` 支持多轮追问；
5. 自定义 Advisor 做敏感信息脱敏 + 兜底话术；Actuator 指标看板展示 token 成本。

面试展开点：为什么阈值设 0.6（评测集上扫参的结果）、流式怎么防注入与截断、工具失败怎么回给模型——每个细节都是加分项。

## 九、本章面试高频清单

1. Spring AI 和 LangChain4j 怎么选？（Spring 技术栈一致性/生态 vs 独立轻量——说出"我们全栈 Spring，选 Spring AI 是工程决策不是技术信仰"）
2. ChatClient 与 ChatModel 的关系；Advisor 链解决了什么？
3. 1.x → 2.0 工具调用架构变化（ToolCallingAdvisor 独立化）。
4. 结构化输出原理（Schema 注入 + 校验 + 转换）。
5. RAG 管线在 Spring AI 里的组件映射（Reader/Splitter/VectorStore/QuestionAnswerAdvisor）。
6. Spring AI 里 MCP 的 Server/Client 两种角色与默认传输。
7. 对话记忆怎么在多实例部署下共享？（持久化 ChatMemory + 显式 conversationId）
8. 版本兼容矩阵怎么查、为什么不能单升一个版本号。
