# Spring Boot 3 vs 4: Version Evolution & Migration Guide

> The hot 2026 interview topic. Spring Boot 4.0 GA shipped on **November 20, 2025** alongside Spring Framework 7.0 — billed as the biggest generational shift since 2.x→3.x (javax→jakarta). This chapter walks the 1→2→3→4 evolution, then dissects every material 3→4 difference and the migration playbook.

## 1. The Version Timeline (build the big picture first)

| Major | Released | Baseline | Keywords | OSS support |
| --- | --- | --- | --- | --- |
| 2.x | 2019 | Java 8 | WebFlux, Actuator maturity | ❌ fully ended (incl. 2.7) |
| 3.0 | 2022-11 | **Java 17** | **javax → jakarta namespace**, AOT/native image, observability | ❌ 3.0-3.4 ended |
| 3.2 | 2023-11 | Java 17/21 | virtual threads opt-in (`spring.threads.virtual.enabled`) | ❌ |
| 3.5 | 2025-05 | Java 17+ | the 3.x swan song | ❌ **ended June 2026** |
| **4.0** | **2025-11** | **Java 17 (21/25 recommended)** | **modularization, JSpecify, Jackson 3, API versioning, virtual threads by default** | ✅ current line (4.1 landed 2026-05) |

**Market reality (2026)**: legacy systems cluster on 2.7 / 3.2 while new projects start at 4.x. When a JD says "familiar with Spring Boot 3/4", the subtext is: know what the jakarta migration was, can recite 4.0's breaking changes, and ideally have done an upgrade.

## 2. Boot 2 → 3 in One Paragraph (interviewers love the comparison)

3.0 was **reactive adaptation**: Java baseline 8→17, every `javax.*` import replaced by `jakarta.*` (Servlet/Validation/Persistence annotations), GraalVM AOT introduced. Painful but mechanical — global find-replace plus dependency bumps. 4.0 is **proactive refactoring** by the framework team, reaching into runtime behavior. On to the details.

## 3. Spring Boot 4's Core Changes, One by One

### 1. Modularized auto-configuration: the monolith jar split into 70+ modules

- In 3.x, `spring-boot-autoconfigure` was one giant jar: even a database-only app carried web/MQ/cache auto-config classes on the classpath.
- 4.0 splits it into **70+ focused modules** (e.g. `spring-boot-autoconfigure-jdbc`, `...-web-servlet`), and starters follow: web MVC projects move from `spring-boot-starter-web` to the narrower **`spring-boot-starter-webmvc`**, each module owning an `org.springframework.boot.<module>` package space.
- Reported wins: apps load only the auto-configuration they need → faster startup (community cases cite 30-50%), smaller container images (~19% in one case), quicker cold starts — real money for K8s autoscaling and serverless.
- Migration impact: **Boot 3 and Boot 4 dependencies should not share a classpath**; transitional `spring-boot-starter-classic` / `spring-boot-starter-test-classic` restore the old aggregate shape while you migrate.

### 2. JSpecify null safety: Spring's own @Nullable retires

- `org.springframework.lang.@Nullable/@NonNull/@NonNullApi/@NonNullFields` (JSR-305 style) are **deprecated** across Framework 7 / Boot 4 in favor of **JSpecify (`org.jspecify.annotations`)** — the Google/JetBrains/Oracle-backed standard, which can express nullability on generics, arrays and type parameters where the old annotations couldn't.
- IDEs (IntelliJ 2025.3+) and tools like NullAway flag potential NPEs **at compile time**; Kotlin 2.2 maps JSpecify directly onto Kotlin's null system, mostly ending platform-type pain.
- Action item: `import org.springframework.lang.Nullable` → `import org.jspecify.annotations.Nullable`.

### 3. Virtual threads by default (on Java 21+)

- What was an opt-in switch in 3.2 becomes the default in 4.0: **Tomcat/Jetty request threads, @Async and scheduled tasks run on virtual threads**.
- Impact: big throughput gains for IO-bound services (community cases: 2-5×), but **the thread pool stops being your backpressure valve** — where `maximumPoolSize` once shielded downstream systems you now need explicit concurrency limiting (4.x ships **retries and concurrency limiting as core framework resilience**).
- Caveat: blocking inside `synchronized` pins the carrier thread (pre-JDK 24) — hot paths should switch to `ReentrantLock`.

### 4. Jackson 3 becomes the default JSON library

- Package `com.fasterxml.jackson` → `tools.jackson`; annotations remain compatible but **custom Modules/serializers need rework** — typically the single largest chunk of migration effort. Jackson 2 and 3 can coexist during transition.

### 5. Native API versioning (Spring Framework 7)

```java
@Configuration
class WebConfig implements WebMvcConfigurer {
    @Override
    public void configureApiVersioning(ApiVersionConfigurer configurer) {
        configurer.useRequestHeader("API-Version");     // also path / media-type / query-param strategies
    }
}

@RestController
@RequestMapping("/account")
class AccountController {
    @GetMapping(path = "/{id}", version = "1.1")
    Account legacy() { ... }

    @GetMapping(path = "/{id}", version = "1.2+")       // effective from 1.2 until superseded
    AccountV2 current() { ... }                          // deprecated versions emit RFC 9457/8594 headers
}
```

- In 3.x this required third-party libraries or hand-rolled routing rules; 4.x makes it first-party. If you built your own, pick one system — **two versioning layers coexisting will scramble your routing**.

### 6. Jakarta EE 11 and the upgraded substrate

- Servlet 6.1 (Tomcat 11 / Jetty 12.1), JPA 3.2 (Hibernate ORM 7.1), Bean Validation 3.1, Kotlin 2.2.
- **Undertow is removed** (no Servlet 6.1 support) — Undertow shops must move to Tomcat/Jetty.
- The portfolio moves together: Spring Security 7, Spring Data 2025.1, Spring Cloud 2025.1.x. Security config is effectively Lambda-DSL-only (the `and()` chaining is gone).

### 7. Worth knowing

- HTTP service clients: declarative `@HttpExchange` interfaces are auto-configured out of the box (3.x needed manual `HttpServiceProxyFactory` wiring).
- RFC 9457 Problem Details becomes the standard error response model.
- 36 deprecated APIs removed; renamed properties are reported by `spring-boot-properties-migrator`.
- GraalVM native image and Project Leyden AOT keep deepening (official line: Java 25 gives the best results).

## 4. Migration Playbook: 3.5 → 4.0 Step by Step

```bash
# 0. Prereq: land on 3.5.x first (jumping from 3.3 straight to 4.0 is unsupported); Java 17 min, 21+ strongly advised
# 1. Bump the parent
#    <version>3.5.6</version>  →  <version>4.0.x</version>
# 2. Attach the properties migrator for one iteration (remove afterwards)
#    spring-boot-properties-migrator (runtime scope)
# 3. OpenRewrite automates most mechanical edits
./mvnw org.openrewrite.maven:rewrite-maven-plugin:run \
  -Drewrite.activeRecipes=org.openrewrite.java.spring.boot4.UpgradeSpringBoot_4_0
```

Manual pass, ordered by how often teams get bitten:

1. **Dependency tree**: `mvn dependency:tree` to catch Boot3/Boot4 mixes; move starters to modular coordinates.
2. **Jackson customizations**: serializers/Modules/ObjectMapper beans → Jackson 3.
3. **Null safety**: swap imports to JSpecify; turn on IDE checks as a coding standard.
4. **Security**: full Lambda DSL; container to Tomcat 11 / Jetty 12.
5. **Threading model**: audit hand-tuned pools and limiters; adopt the built-in resilience components or semaphores.
6. **API versioning**: decide between homegrown and native — not both.
7. Full regression + staged rollout (config changes need rollback plans too).

**Still on 2.x?** The path is 2.x → 3.x (jakarta namespace + Java 17 first) → 4.0. There is no two-jump shortcut; don't skip majors.

## 5. Answering "What changed between 3 and 4?" in 60 Seconds

> "4.0 GA'd in November 2025 with Spring Framework 7 — a generational release. Baseline is Java 17, ideally 21+, on Jakarta EE 11. Architecturally the headline is splitting the monolithic autoconfigure jar into 70-plus modules with matching fine-grained starters, so apps load only what they use — faster startup, smaller images. For day-to-day coding there are three flagships: the whole stack moved to JSpecify for compile-time null safety; Jackson 3 is the default JSON library; and Framework 7 adds native REST API versioning. At runtime, virtual threads went from an opt-in in 3.2 to the default model on Java 21+, with retries and concurrency limiting built into the core. Officially you migrate through 3.5, and in practice the effort concentrates in dependency modularization, Jackson custom code, and rethinking thread-pool-based backpressure."

Handling follow-ups (why modularize? JSpecify vs JSR-305? risks of default virtual threads?) is what turns this from an answer into a hire.

## 6. Chapter interview checklist

1. Boot 3 vs 2 (jakarta / Java 17 / AOT) — the history question.
2. Boot 4's five headline changes — the current-affairs question.
3. With virtual threads on by default, how do pooling and rate limiting change?
4. What does JSpecify fix over Spring's own @Nullable?
5. The 3.x→4.0 path and its tooling (properties-migrator, OpenRewrite).
6. Why does modularization matter especially for containerized deployments?
