# Spring Boot 3 vs 4：版本演进与迁移指南

> 2026 年面试新热点。Spring Boot 4.0 已于 **2025 年 11 月 20 日**与 Spring Framework 7.0 一同 GA 发布，被官方称为继 2.x→3.x（javax→jakarta）之后又一次"代际跃迁"。本章先讲清 Boot 1→2→3→4 的演进逻辑，再逐项拆解 3→4 的真实差异与迁移路径。

## 一、版本演进时间线（先建立全局观）

| 大版本 | 发布 | 基线 | 关键词 | OSS 支持 |
| --- | --- | --- | --- | --- |
| 2.x | 2019 | Java 8 | WebFlux、Actuator 成熟期 | ❌ 已全面终止（含 2.7） |
| 3.0 | 2022-11 | **Java 17** | **javax → jakarta 命名空间**、AOT/原生镜像、Observability | ❌ 3.0-3.4 已停 |
| 3.2 | 2023-11 | Java 17/21 | 虚拟线程 opt-in（`spring.threads.virtual.enabled`） | ❌ |
| 3.5 | 2025-05 | Java 17+ | 3.x 收尾版 | ❌ **2026 年 6 月终止** |
| **4.0** | **2025-11** | **Java 17（推荐 21/25）** | **模块化、JSpecify、Jackson 3、API 版本控制、虚拟线程默认化** | ✅ 当前主线（4.1 已于 2026-05 发布） |

**招聘市场现状（2026）**：存量项目大量还在 2.7 / 3.2，新项目直接 4.x。JD 写"熟悉 Spring Boot 3/4"的潜台词是：知道 jakarta 迁移发生过什么、能说清 4.0 的破坏性变更、最好有升级实操。

## 二、Boot 2 → 3 回顾（一句话，面试常拿来和 3→4 对比）

3.0 的核心是**被动适配**：Java 8→17 基线、`javax.*` 全量改 `jakarta.*`（Servlet/Validation/Persistence 注解 import 全换）、引入 GraalVM AOT。升级痛苦但机械——IDE 全局替换 + 依赖升级即可。而 4.0 是框架团队的**主动重构**，变更更深入运行时行为，下文展开。

## 三、Spring Boot 4 核心变更逐项拆解

### 1. 自动配置模块化：单体 JAR 拆成 70+ 模块

- 3.x 的 `spring-boot-autoconfigure` 是一个巨型 JAR，哪怕你只用数据库，Web/MQ/Cache 的自动配置类也在 classpath 上等着被评估。
- 4.0 把它拆成 **70+ 个聚焦模块**（如 `spring-boot-autoconfigure-jdbc`、`...-web-servlet`），starter 也随之细化：Web MVC 项目推荐从 `spring-boot-starter-web` 改用更聚焦的 **`spring-boot-starter-webmvc`**，每个模块拥有独立的 `org.springframework.boot.<module>` 包空间。
- 收益实测口径：应用只加载真正需要的自动配置 → 启动提速（社区多案例 30-50%）、容器镜像更小（有案例约 -19%）、冷启动更快——对 K8s 弹性伸缩和 Serverless 是实打实的成本。
- 迁移影响：**Boot 3 与 Boot 4 的依赖不应混用在同一 classpath**；官方提供过渡用的 `spring-boot-starter-classic` / `spring-boot-starter-test-classic` 还原旧聚合形态。

### 2. JSpecify 空安全：官方 @Nullable 退役

- Spring 自家 `org.springframework.lang.@Nullable/@NonNull/@NonNullApi/@NonNullFields`（JSR-305 风格）**全部废弃**，整个 Framework 7 / Boot 4 代码库改用 **JSpecify（`org.jspecify.annotations`）**——Google/JetBrains/Oracle 共建的行业标准，支持泛型、数组、类型参数上的空值语义（旧注解做不到）。
- IDE（IntelliJ 2025.3+）与 NullAway 等静态检查在**编译期**提示潜在 NPE；Kotlin 2.2 能把 JSpecify 注解直接映射为 Kotlin 空安全类型，platform types 痛点基本消失。
- 迁移动作：自己代码里的 `import org.springframework.lang.Nullable` → `import org.jspecify.annotations.Nullable`。

### 3. 虚拟线程默认化（Java 21+ 环境）

- 3.2 里要手动开 `spring.threads.virtual.enabled=true`；4.0 在 Java 21+ 环境下 **Tomcat/Jetty 请求线程、@Async、定时任务默认走虚拟线程**。
- 影响：I/O 密集服务吞吐显著提升（社区案例 2-5 倍），但**线程池不再是"资源保护阀"**——原来靠 `maximumPoolSize` 挡下游的做法要改成显式并发限流（4.x 把**重试与并发限制等弹性能力内置进框架核心**）。
- 注意：`synchronized` 块内长时间阻塞会 pin 载体线程（JDK 24 前），热点路径换 `ReentrantLock`。

### 4. Jackson 3 成为默认 JSON 库

- 包名 `com.fasterxml.jackson` → `tools.jackson`，注解兼容但**自定义 Module/序列化器的代码要改**；这是多数团队迁移中**工作量最大的单项**。Jackson 2 与 3 可共存过渡。

### 5. 原生 API 版本控制（Spring Framework 7）

```java
@Configuration
class WebConfig implements WebMvcConfigurer {
    @Override
    public void configureApiVersioning(ApiVersionConfigurer configurer) {
        configurer.useRequestHeader("API-Version");     // 也支持路径/媒体类型/查询参数策略
    }
}

@RestController
@RequestMapping("/account")
class AccountController {
    @GetMapping(path = "/{id}", version = "1.1")
    Account legacy() { ... }

    @GetMapping(path = "/{id}", version = "1.2+")       // 1.2 起生效直到被新版替代
    AccountV2 current() { ... }                          // 废弃版本自动按 RFC 9457/8594 回版本头
}
```

- 3.x 时代要靠第三方库（如 API Versioning 社区方案）或自建路由规则；4.x 官方原生。若你已有自建方案，迁移时要评估二选一，**两套并存会把路由搞乱**。

### 6. Jakarta EE 11 与基座组件升级

- Servlet 6.1（Tomcat 11 / Jetty 12.1）、JPA 3.2（Hibernate ORM 7.1）、Bean Validation 3.1、Kotlin 2.2。
- **Undertow 因不支持 Servlet 6.1 被移除**——用 Undertow 的项目要换 Tomcat/Jetty。
- 配套全家桶同步大版本：Spring Security 7、Spring Data 2025.1、Spring Cloud 2025.1.x。Security 配置基本只剩 Lambda DSL（`and()` 链式写法移除）。

### 7. 其他值得知道的

- HTTP 服务客户端自动配置增强：`@HttpExchange` 声明式接口客户端开箱即用（3.x 需手动配 `HttpServiceProxyFactory`）。
- RFC 9457 Problem Details 成为标准错误响应模型。
- 36 个已废弃 API 移除；配置属性改名可用 `spring-boot-properties-migrator` 自动报告。
- GraalVM 原生镜像与 Project Leyden AOT 方向持续深化（官方口径推荐 Java 25 获得最佳效果）。

## 四、迁移实战：3.5 → 4.0 分步清单

```bash
# 0. 前置：必须先到 3.5.x（不支持 3.3 直接跳 4.0）；Java 17 起步，强烈建议 21+
# 1. 改父版本
#    <version>3.5.6</version>  →  <version>4.0.x</version>
# 2. 挂属性迁移器观察一个迭代（完成后移除）
#    spring-boot-properties-migrator (runtime scope)
# 3. OpenRewrite 自动重构（能吃掉大半机械改动）
./mvnw org.openrewrite.maven:rewrite-maven-plugin:run \
  -Drewrite.activeRecipes=org.openrewrite.java.spring.boot4.UpgradeSpringBoot_4_0
```

人工检查顺序（按踩坑概率排）：

1. **依赖树**：`mvn dependency:tree` 找 Boot3/Boot4 混用；starter 换成模块化坐标。
2. **Jackson 定制代码**：自定义序列化器/Module/ObjectMapper Bean → 迁到 Jackson 3。
3. **空安全**：换 JSpecify import，打开 IDE 检查当编码规范用。
4. **Security**：Lambda DSL 全量化；Servlet 容器换 Tomcat 11/Jetty 12。
5. **线程模型**：审所有手配线程池与限流逻辑，改弹性组件或信号量。
6. **API 版本**：有自建方案的做取舍决策。
7. 全量回归 + 灰度发布（配置类变更也要能回滚）。

**还在 2.x 的团队**：路径是 2.x → 3.x（先解决 jakarta 命名空间 + Java 17）→ 4.0，两步跳没有捷径，别跳版本。

## 五、面试怎么答"3 和 4 有什么区别"（60 秒模板）

> "4.0 是 2025 年 11 月随 Spring Framework 7 发布的代际升级。基线上 Java 17 起步、推荐 21+，Jakarta EE 升到 11。架构上最大的动作是把单体 autoconfigure 拆成 70 多个模块、starter 随之细化，应用只加载需要的自动配置，启动和镜像体积都明显受益。开发体验上有三件标志性变化：全栈改用 JSpecify 做编译期空安全；Jackson 3 成为默认 JSON 库；Framework 7 原生支持 REST API 版本控制。运行时方面，Java 21+ 下虚拟线程从 3.2 的可选开关变成默认模型，重试、并发限制等弹性能力内置进核心。迁移上官方要求经过 3.5 过渡，主要工作量在依赖模块化、Jackson 定制代码和线程池语义变化这三块。"

能接住追问（为什么拆模块？JSpecify 和 JSR-305 区别？虚拟线程默认化的风险？）就是加分项。

## 六、本章面试高频清单

1. Boot 3 和 2 的区别（jakarta/Java 17/AOT）——考历史。
2. Boot 4 的五大核心变更——考当下。
3. 虚拟线程默认化后，线程池和限流思路怎么变？
4. JSpecify 相比 Spring 自家 @Nullable 解决了什么？
5. 3.x 升 4.0 的迁移路径与工具（properties-migrator、OpenRewrite）。
6. 为什么模块化对容器化部署特别重要？
