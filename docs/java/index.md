# Java + Spring Boot 知识库入口

> 面向招聘市场的 Java 后端知识体系：从 Java 基础入门，到 SQL / MySQL / Maven 工具链，再到 Spring / Spring Boot 实战与 3→4 版本迁移。每章都按"企业实际要求"组织，学完即可对上 JD。

## 一、市场要什么样的 Java 开发？

Java 后端是国内招聘需求量最大的岗位方向之一。初中级岗位（1-5 年）的 JD 高度趋同，把黑话翻译成人话如下：

| JD 上的写法 | 实际要求 | 对应章节 |
| --- | --- | --- |
| "Java 基础扎实，理解 JVM、多线程并发" | 集合源码（HashMap 为主）、线程池参数、JMM、synchronized/volatile、GC 与调优 | [Java 基础](./java-basics) / [Java 进阶](./java-advanced) |
| "熟悉 MySQL，了解索引、事务、锁机制" | B+ 树、聚簇/二级索引、最左前缀、隔离级别、MVCC、explain 调优 | [SQL 实战](./sql) / [MySQL](./mysql) |
| "熟练使用 MyBatis / MyBatis-Plus" | 动态 SQL、#{} 与 \${} 区别、一级/二级缓存、分页插件 | [Spring Boot 实战](./spring-boot) 数据访问节 |
| "熟悉 Spring 的 IoC、AOP" | 三级缓存解决循环依赖、Bean 生命周期、事务失效场景 | [Spring 核心](./spring-core) |
| "有 Spring Boot 开发经验" | 自动配置原理、starter 机制、配置文件体系、Web 分层开发 | [Spring Boot 实战](./spring-boot) |
| "使用过 Maven / Gradle" | 依赖范围、冲突解决、多模块聚合、镜像配置 | [Maven](./maven) |
| "了解 Redis / 消息队列 / 微服务"（中高级必问） | 数据类型、缓存三大问题、持久化、高可用；注册发现、网关、熔断限流、分布式事务/锁/幂等、缓存一致性 | [Redis](./redis) / [微服务](./microservices) / [分布式专题](./distributed) |
| "抗压能力强、有团队协作精神" | 简历上用一个完整项目证明，而不是空话 | 下文项目路线 |

**一个现实提醒**：2026 年的 Java 面试，"Spring Boot 3 升 4"、"虚拟线程"、"Java 21 新特性" 已经出现在大量 JD 和面试里——老项目还在 2.x/3.x，新项目直接 4.x，能说清版本演进就是加分项。这正是 [Spring Boot 3 vs 4](./spring-boot3-vs4) 一章要解决的。

## 二、知识地图（建议学习顺序）

| 顺序 | 章节 | 内容 | 定位 |
| --- | --- | --- | --- |
| 1 | [Java 基础入门](./java-basics) | 语法、面向对象、集合、泛型、异常、IO、Lambda | 地基，所有面试的 30% 出自这里 |
| 2 | [Java 进阶](./java-advanced) | 并发编程、JVM、反射、Java 8/17/21 新特性 | 面试深水区，中高级岗的分水岭 |
| 3 | [SQL 从入门到实战](./sql) | DDL/DML/DQL、JOIN、子查询、窗口函数 | 会写复杂查询是后端日常刚需 |
| 4 | [MySQL 数据库](./mysql) | 架构、索引原理、事务与 MVCC、锁、调优 | 面试必考 Top 3 |
| 5 | [Redis 缓存](./redis) | 数据类型、穿透/击穿/雪崩、持久化、主从/哨兵/Cluster | 面试必考 Top 3，缓存是高频考点 |
| 6 | [Maven 构建管理](./maven) | 坐标、依赖、生命周期、多模块、冲突解决 | 工具链，学完能看懂任何 pom.xml |
| 7 | [Spring 核心](./spring-core) | IoC/DI、Bean 生命周期、AOP、事务 | 框架原理，理解 Spring Boot 的前提 |
| 8 | [Spring Boot 实战](./spring-boot) | 自动配置、Web 开发、MyBatis 整合、配置体系 | 工作中 80% 时间在做的事 |
| 9 | [Spring Boot 3 vs 4](./spring-boot3-vs4) | 版本演进、破坏性变更、迁移实战 | 2026 面试新热点 |
| 10 | [微服务与 Spring Cloud](./microservices) | Nacos、OpenFeign、Gateway、Sentinel、链路追踪 | 中高级岗的架构题主战场 |
| 11 | [分布式核心专题](./distributed) | 分布式锁/事务、幂等、消息队列、缓存一致性、分库分表 | 面试压轴题池 |
| 12 | [Spring AI 应用开发](./spring-ai) | ChatClient、工具调用、RAG、MCP、对话记忆 | 2026 JD 新热点：Java + AI 应用开发 |

## 三、简历级项目路线

投简历前，至少完整做穿一个项目。推荐"电商/内容后台"类，因为它天然覆盖所有考点：

1. **第一阶段——CRUD 打底**：Spring Boot + MyBatis-Plus + MySQL 做商品/订单管理接口，练分层架构、统一响应体、参数校验、全局异常处理。
2. **第二阶段——加并发与缓存**：接口压测发现问题 → 引入 Redis 缓存、线程池异步化、乐观锁解决超卖。每一步都对应面试高频题。
3. **第三阶段——工程化**：Maven 多模块拆分、日志与监控、Docker 部署。简历上的"亮点"全部来自这三个阶段的坑。

写简历时用"动词 + 技术 + 量化结果"：例如"使用 Redis 缓存热点商品数据，接口 P99 从 800ms 降至 45ms"，比"熟悉 Redis"有力十倍。

## 四、学习资源

<div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;">
  <a href="https://docs.oracle.com/en/java/javase/21/docs/api/index.html" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">JDK 21 API 文档</a>
  <a href="https://spring.io/projects/spring-boot" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">Spring Boot 官方</a>
  <a href="https://spring.io/projects/spring-framework" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">Spring Framework 官方</a>
  <a href="https://maven.apache.org/guides/index.html" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">Maven 官方指南</a>
  <a href="https://dev.mysql.com/doc/refman/8.4/en/" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">MySQL 8.4 手册</a>
  <a href="https://mybatis.org/mybatis-3/zh/index.html" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">MyBatis 中文文档</a>
  <a href="https://hutool.cn/" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">Hutool 工具库</a>
  <a href="https://openrewrite.github.io/" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:8px;font-size:14px;">OpenRewrite（自动迁移工具）</a>
</div>

## 五、高频面试题速查（先感受下难度）

- HashMap 的 put 流程？为什么线程不安全？ConcurrentHashMap 怎么保证安全？→ [Java 基础](./java-basics) / [Java 进阶](./java-advanced)
- 线程池 7 个参数的含义？拒绝策略选哪个？→ [Java 进阶](./java-advanced)
- 为什么 InnoDB 用 B+ 树不用哈希索引？什么是回表？→ [MySQL](./mysql)
- RR 隔离级别下如何避免幻读？→ [MySQL](./mysql)
- Spring 如何解决循环依赖？为什么需要三级缓存？→ [Spring 核心](./spring-core)
- `@Transactional` 什么时候失效？→ [Spring 核心](./spring-core)
- Spring Boot 自动配置原理？→ [Spring Boot 实战](./spring-boot)
- Spring Boot 4 相比 3 有哪些破坏性变更？→ [Spring Boot 3 vs 4](./spring-boot3-vs4)
- 限流、熔断、降级三概念辨析？Nacos 配置为什么能动态刷新？→ [微服务](./microservices)
- 缓存穿透/击穿/雪崩三兄弟怎么区分、各怎么防？RDB 和 AOF 选哪个？→ [Redis](./redis)
- 分布式锁怎么演进？缓存和数据库如何保持一致？→ [分布式专题](./distributed)
- Spring AI 的 ChatClient/Advisor 体系是什么？2.0 工具调用架构改了哪里？→ [Spring AI](./spring-ai)
