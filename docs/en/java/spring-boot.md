# Spring Boot in Action

> 80% of working time lives in this chapter: scaffold, ship endpoints, wire databases, manage configs. Spring Boot 3.x is the trunk (4.x deltas in [the next chapter](./spring-boot3-vs4)); examples run as-is.

## 1. Getting Started: Layout & First Endpoint

Create via <a href="https://start.spring.io" target="_blank" rel="noopener noreferrer">start.spring.io</a> (Initializr) or the IDEA wizard.

```
order-service/
├── pom.xml
└── src/main/
    ├── java/com/example/order/
    │   ├── OrderServiceApplication.java   ← main class
    │   ├── controller/  web layer: bind params, shape responses
    │   ├── service/     business layer: transactions, orchestration
    │   ├── mapper/      data access
    │   ├── entity/ dto/ vo/   three object families
    │   └── common/ config/    result envelope, global exceptions, config classes
    └── resources/
        ├── application.yml
        └── mapper/*.xml
```

```java
@SpringBootApplication   // = @SpringBootConfiguration + @EnableAutoConfiguration + @ComponentScan
public class OrderServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrderServiceApplication.class, args);
    }
}

@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderService orderService;
    public OrderController(OrderService orderService) { this.orderService = orderService; }

    @GetMapping("/{id}")
    public Result<OrderVO> detail(@PathVariable Long id) {
        return Result.ok(orderService.detail(id));
    }

    @PostMapping
    public Result<Long> create(@Valid @RequestBody OrderCreateDTO dto) {
        return Result.ok(orderService.create(dto));
    }
}
```

**Layered object philosophy** (why entity/DTO/VO can't share one class): Entity mirrors the table, DTO is the inbound contract, VO the outbound view — isolate them and schema changes don't leak into APIs, API evolution doesn't leak into internals.

## 2. The Configuration System

### application.yml basics

```yaml
server:
  port: 8080
spring:
  application:
    name: order-service
  profiles:
    active: dev                # activates application-dev.yml
  datasource:
    url: jdbc:mysql://localhost:3306/app?useSSL=false&serverTimezone=Asia/Shanghai
    username: root
    password: ${DB_PASSWORD}   # read from env — never commit secrets
  jackson:
    default-property-inclusion: non_null
    time-zone: Asia/Shanghai
    date-format: yyyy-MM-dd HH:mm:ss
logging:
  level:
    com.example: debug
mybatis-plus:
  mapper-locations: classpath*:mapper/*.xml
```

- Multi-environment: `application-{profile}.yml`, switched via `--spring.profiles.active=prod` or env vars.
- **Property precedence** (high→low): command-line args > env vars > profile files > main file > defaults. Memorize this before debugging "my config isn't applying".
- Type-safe binding (beats scattered `@Value`s):

```java
@ConfigurationProperties(prefix = "app.pay")
@Validated
public record PayProps(
        @NotNull String appId,
        @NotNull String privateKey,
        @DurationUnit(ChronoUnit.SECONDS) Duration timeout) {
}
// maps to app.pay.app-id / app.pay.private-key / app.pay.timeout: 30s
```

## 3. Auto-Configuration Internals (guaranteed question)

**One sentence**: at startup `@EnableAutoConfiguration` → `AutoConfigurationImportSelector` reads every jar's `META-INF/spring/*.AutoConfiguration.imports` list → `@Conditional` filters (class present? bean missing? property set?) → survivors register as ordinary beans, and your yml properties tune them through `@ConfigurationProperties`.

```
spring-boot-autoconfigure.jar
 └─ META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
     org.springframework.boot.autoconfigure.web.servlet.WebMvcAutoConfiguration
     org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
     ...(since 3.x this file replaced the EnableAutoConfiguration key in spring.factories)
```

The conditional family: `@ConditionalOnClass`, `@ConditionalOnMissingBean` (**you define it, so I won't — the engine behind "conventions you can override"**), `@ConditionalOnProperty`, `@ConditionalOnWebApplication`.

**Writing your own starter** (résumé-worthy): `xxx-spring-boot-starter` (dependency aggregator) + `xxx-spring-boot-autoconfigure` (config classes + imports file + Properties). This is exactly how companies onboard middleware uniformly.

## 4. Web Development, Four Pieces

### Unified envelope & global exceptions

```java
public record Result<T>(int code, String message, T data) {
    public static <T> Result<T> ok(T data) { return new Result<>(0, "ok", data); }
    public static Result<Void> fail(int code, String msg) { return new Result<>(code, msg, null); }
}

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(BizException.class)                 // business error: 4xx semantics, warn-level
    public Result<Void> biz(BizException e) {
        return Result.fail(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)   // validation failures
    public Result<Void> invalid(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + " " + f.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return Result.fail(40000, msg);
    }

    @ExceptionHandler(Exception.class)                    // catch-all: error-level with stack, leak nothing
    public Result<Void> unknown(HttpServletRequest req, Exception e) {
        log.error("unhandled exception uri={}", req.getRequestURI(), e);
        return Result.fail(50000, "System busy, please retry later");
    }
}
```

### Validation

```java
public record OrderCreateDTO(
        @NotNull Long skuId,
        @Min(1) @Max(99) Integer qty,
        @Pattern(regexp = "1\\d{10}", message = "bad phone format") String mobile,
        @Size(max = 200) String remark) {}
// @Valid / @Validated on the controller parameter triggers it; groups via @Validated(Create.class)
```

### Interceptor vs Filter (concept question)

Filter = Servlet spec (raw request; good for encoding, CORS, log masking). Interceptor = Spring MVC (knows the handler and ModelAndView; good for auth, permissions, timing). Order: Filter → preHandle → Controller → postHandle → afterCompletion.

### CORS

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns("https://*.example.com")
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .allowCredentials(true);
    }
}
```

## 5. Data Access (the JD's "MyBatis" lives here)

### MyBatis / MyBatis-Plus integration

```java
@Mapper
public interface OrderMapper extends BaseMapper<Order> {
    // simple CRUD comes free from BaseMapper; complex SQL goes to XML or annotations
    @Select("""
            SELECT o.*, u.name AS user_name
            FROM orders o JOIN users u ON u.id = o.user_id
            WHERE o.status = #{status} AND o.created_at >= #{from}
            """)
    List<OrderRow> selectByStatus(@Param("status") int status, @Param("from") LocalDateTime from);
}
```

- **`#{}` vs `${}`, guaranteed question**: `#{}` is a prepared-statement placeholder (injection-proof); `${}` is raw string interpolation (only for dynamic table/column names or ORDER BY direction, and only from a whitelist).
- Dynamic SQL: `<if>`, `<where>`, `<foreach>` (IN-lists, batches), `<set>` (selective update).
- MyBatis-Plus extras: type-safe `LambdaQueryWrapper`, the pagination plugin `PaginationInnerInterceptor` (rewrites into limit + count), code generator.
- L1 cache: per-SqlSession, on by default (same txn, same id → one query); L2 is cross-session but coarse and staleness-prone — **production usually disables it and caches in Redis instead**.

### Transactions at the web layer

Put `@Transactional` on public service methods; mark queries `@Transactional(readOnly = true)` (routes to replicas, skips flush overhead); failure modes in [Spring Core](./spring-core).

## 6. Testing & Observability

```java
@SpringBootTest                         // integration test: full container
@AutoConfigureMockMvc
class OrderApiTest {
    @Autowired MockMvc mvc;

    @Test
    void createOrder_returns200() throws Exception {
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                             {"skuId":1,"qty":2,"mobile":"13800000000"}
                             """))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.code").value(0));
    }
}

@WebMvcTest(OrderController.class)      // slice test: web layer only, service mocked, starts in seconds
class OrderControllerTest {
    @MockBean OrderService service;
    @Autowired MockMvc mvc;
}
```

- Production: **Actuator** exposes `/actuator/health` (load-balancer probes) and `/metrics` (Prometheus); logback + an MDC traceId stitches one request's lines together.
- Prefer `@MockBean` / `@TestConfiguration` over loosening production visibility for tests.

## 7. Deployment

```bash
mvn clean package -DskipTests
java -jar -Xms2g -Xmx2g -Dspring.profiles.active=prod order-service.jar
# multi-stage Dockerfile (résumé and production both like it)
```

```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS build
COPY . /src
WORKDIR /src
RUN mvn -B -ntp clean package -DskipTests
FROM eclipse-temurin:21-jre
COPY --from=build /src/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app.jar"]
```

- The jar embeds Tomcat — nothing to install — the payoff of Boot's self-containment.
- On K8s point liveness/readiness at actuator health; enable `server.shutdown=graceful`.

## 8. Chapter interview checklist

1. What do @SpringBootApplication's three annotations each do? The full auto-config chain?
2. yml precedence; how profiles work.
3. @Component vs @Bean; @ConfigurationProperties vs @Value.
4. `#{}` vs `${}` and SQL injection.
5. MyBatis L1/L2 caches; how can a Mapper interface with no implementation be injected (MapperProxy dynamic proxy)?
6. Filter vs interceptor; the full MVC request path.
7. How does your project handle errors globally (the must-tell project story — use this chapter's template).
8. Anatomy of a Boot fat jar; how the embedded Tomcat boots (LaunchedURLClassLoader).
