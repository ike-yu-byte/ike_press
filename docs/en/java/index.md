# Java + Spring Boot Knowledge Base

> A job-market-oriented Java backend system: from Java basics, through the SQL / MySQL / Maven toolchain, to Spring / Spring Boot in practice and the 3→4 migration. Every chapter is organized around what employers actually ask for.

## 1. What kind of Java developer does the market want?

Java backend is one of the highest-demand roles. Junior-to-mid JDs (1-5 years) are remarkably similar. Here is the jargon translated into plain terms:

| What the JD says | What it really means | Chapter |
| --- | --- | --- |
| "Solid Java fundamentals, understand JVM and concurrency" | Collection internals (HashMap above all), thread pool parameters, JMM, synchronized/volatile, GC & tuning | [Java Basics](./java-basics) / [Java Advanced](./java-advanced) |
| "Familiar with MySQL: indexes, transactions, locks" | B+ tree, clustered/secondary indexes, leftmost prefix, isolation levels, MVCC, EXPLAIN tuning | [SQL in Practice](./sql) / [MySQL](./mysql) |
| "Proficient with MyBatis / MyBatis-Plus" | Dynamic SQL, `#{}` vs `${}`, L1/L2 caches, pagination plugin | [Spring Boot in Action](./spring-boot) data access section |
| "Understand Spring IoC and AOP" | Three-level cache & circular dependencies, bean lifecycle, transaction failure scenarios | [Spring Core](./spring-core) |
| "Experience with Spring Boot" | Auto-configuration internals, starter mechanism, config system, layered web development | [Spring Boot in Action](./spring-boot) |
| "Have used Maven / Gradle" | Dependency scopes, conflict resolution, multi-module builds, mirror setup | [Maven](./maven) |
| "Redis / message queues / microservices a plus" | Data types, the three cache problems, persistence, HA; registry & discovery, gateway, circuit breaking/limiting, distributed transactions/locks/idempotency, cache consistency | [Redis](./redis) / [Microservices](./microservices) / [Distributed Topics](./distributed) |
| "Works well under pressure, team player" | Prove it with one complete project on your résumé, not empty words | Project roadmap below |

**A reality check for 2026**: "Spring Boot 3 to 4", "virtual threads" and "Java 21 features" now show up in a large share of JDs and interviews — legacy systems still run 2.x/3.x while new projects start at 4.x. Being able to explain the version evolution is a differentiator. That is exactly what [Spring Boot 3 vs 4](./spring-boot3-vs4) covers.

## 2. Knowledge map (suggested order)

| # | Chapter | Contents | Positioning |
| --- | --- | --- | --- |
| 1 | [Java Basics](./java-basics) | Syntax, OOP, collections, generics, exceptions, IO, lambdas | Foundation — ~30% of interview questions come from here |
| 2 | [Java Advanced](./java-advanced) | Concurrency, JVM, reflection, Java 8/17/21 features | Deep end; separates mid from senior |
| 3 | [SQL from Basics to Practice](./sql) | DDL/DML/DQL, JOINs, subqueries, window functions | Writing complex queries is a daily requirement |
| 4 | [MySQL Deep Dive](./mysql) | Architecture, index internals, transactions & MVCC, locks, tuning | Top-3 interview topic |
| 5 | [Redis Cache](./redis) | Data types, penetration/breakdown/avalanche, persistence, replication/Sentinel/Cluster | Top-3 interview topic; caching is a daily battleground |
| 6 | [Maven](./maven) | Coordinates, dependencies, lifecycle, multi-module, conflicts | Toolchain — read any pom.xml afterwards |
| 7 | [Spring Core](./spring-core) | IoC/DI, bean lifecycle, AOP, transactions | Framework internals; prerequisite for Boot |
| 8 | [Spring Boot in Action](./spring-boot) | Auto-config, web dev, MyBatis integration, config system | 80% of your actual working time |
| 9 | [Spring Boot 3 vs 4](./spring-boot3-vs4) | Version evolution, breaking changes, migration playbook | The hot 2026 interview topic |
| 10 | [Microservices & Spring Cloud](./microservices) | Nacos, OpenFeign, Gateway, Sentinel, tracing | Where senior architecture questions live |
| 11 | [Distributed Systems Core Topics](./distributed) | Distributed locks/transactions, idempotency, MQ, cache consistency, sharding | The capstone question pool |
| 12 | [Spring AI Application Development](./spring-ai) | ChatClient, tool calling, RAG, MCP, conversation memory | The new 2026 JD hot spot: Java + AI apps |

## 3. A résumé-worthy project roadmap

Before applying, build one project end to end. An e-commerce / content admin system is ideal because it naturally exercises every exam point:

1. **Phase 1 — CRUD backbone**: Spring Boot + MyBatis-Plus + MySQL for product/order management APIs. Practice layering, a unified response envelope, validation, global exception handling.
2. **Phase 2 — Concurrency & caching**: Load-test, find problems → add Redis caching, async via thread pools, optimistic locking to prevent overselling. Every step maps to a frequent interview question.
3. **Phase 3 — Engineering**: Maven multi-module split, logging & monitoring, Docker deployment. All your résumé "highlights" come from the bugs you meet in these phases.

Write résumé bullets as *verb + technology + quantified result*: "Cached hot product data with Redis, cutting API P99 from 800ms to 45ms" beats "familiar with Redis" by an order of magnitude.

## 4. Learning resources

<div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;">
  <a href="https://docs.oracle.com/en/java/javase/21/docs/api/index.html" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">JDK 21 API docs</a>
  <a href="https://spring.io/projects/spring-boot" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">Spring Boot official</a>
  <a href="https://spring.io/projects/spring-framework" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">Spring Framework official</a>
  <a href="https://maven.apache.org/guides/index.html" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">Maven guides</a>
  <a href="https://dev.mysql.com/doc/refman/8.4/en/" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">MySQL 8.4 manual</a>
  <a href="https://mybatis.org/mybatis-3/" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">MyBatis docs</a>
  <a href="https://openrewrite.github.io/" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">OpenRewrite (auto migration)</a>
</div>

## 5. Frequent interview questions (a taste of the difficulty)

- HashMap put flow? Why is it not thread-safe? How does ConcurrentHashMap fix it? → [Java Basics](./java-basics) / [Java Advanced](./java-advanced)
- What do the 7 thread pool parameters mean? Which rejection strategy? → [Java Advanced](./java-advanced)
- Why does InnoDB use a B+ tree instead of a hash index? What is a table lookback? → [MySQL](./mysql)
- How does RR isolation prevent phantom reads? → [MySQL](./mysql)
- How does Spring resolve circular dependencies? Why three caches? → [Spring Core](./spring-core)
- When does `@Transactional` silently fail? → [Spring Core](./spring-core)
- How does Spring Boot auto-configuration work? → [Spring Boot in Action](./spring-boot)
- What breaking changes does Spring Boot 4 bring over 3? → [Spring Boot 3 vs 4](./spring-boot3-vs4)
- Limiting vs breaking vs degradation — disambiguate. Why does Nacos config hot-refresh? → [Microservices](./microservices)
- Penetration vs breakdown vs avalanche — tell them apart and prevent each. RDB or AOF? → [Redis](./redis)
- How does a distributed lock evolve? Cache–DB consistency? → [Distributed Topics](./distributed)
- What is Spring AI's ChatClient/advisor architecture? What changed in 2.0 tool calling? → [Spring AI](./spring-ai)
