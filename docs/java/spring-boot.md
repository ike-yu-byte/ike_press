# Spring Boot 实战

> 工作中 80% 的时间在这一章：起工程、写接口、连数据库、配环境。以 Spring Boot 3.x 为主干（4.x 差异见[下一章](./spring-boot3-vs4)），示例可直接运行。

## 一、起步：工程结构与第一个接口

创建途径：<a href="https://start.spring.io" target="_blank" rel="noopener noreferrer">start.spring.io</a>（Initializr）选依赖生成骨架，或 IDEA Spring Initializr 向导。

```
order-service/
├── pom.xml
└── src/main/
    ├── java/com/example/order/
    │   ├── OrderServiceApplication.java   ← 主类
    │   ├── controller/  web 层：参数接收、响应封装
    │   ├── service/     业务层：事务、编排
    │   ├── mapper/      数据访问层
    │   ├── entity/ dto/ vo/   三类对象
    │   └── common/ config/    通用返回体、全局异常、配置类
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

**分层对象哲学**（面试官爱问 entity/DTO/VO 为什么不能混用）：Entity 贴合表结构、DTO 是入参契约、VO 是出参视图——隔离后改表不伤接口、接口演进不伤内部。

## 二、配置体系

### application.yml 基础

```yaml
server:
  port: 8080
spring:
  application:
    name: order-service
  profiles:
    active: dev                # 激活 application-dev.yml
  datasource:
    url: jdbc:mysql://localhost:3306/app?useSSL=false&serverTimezone=Asia/Shanghai
    username: root
    password: ${DB_PASSWORD}   # 读环境变量，密码不进 git
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

- 多环境：`application-{profile}.yml`，启动 `--spring.profiles.active=prod` 或环境变量覆盖。
- **配置优先级**（高→低）：命令行参数 > 环境变量 > profile 文件 > 主文件 > `@DefaultProperties`。排"配置不生效"题先背这个链。
- 类型安全绑定（替代满天飞的 `@Value`）：

```java
@ConfigurationProperties(prefix = "app.pay")
@Validated
public record PayProps(
        @NotNull String appId,
        @NotNull String privateKey,
        @DurationUnit(ChronoUnit.SECONDS) Duration timeout) {
}
// 对应 app.pay.app-id / app.pay.private-key / app.pay.timeout: 30s
```

## 三、自动配置原理（面试必考，一句话+一条链）

**一句话**：启动时 `@EnableAutoConfiguration` → `AutoConfigurationImportSelector` 读取所有 jar 中 `META-INF/spring/*.AutoConfiguration.imports` 列出的配置类 → 经 `@Conditional` 系列条件过滤（classpath 有该类、有某 Bean、有某属性才生效）→ 存活的配置类按常规注册 Bean，用户在 yml 里的属性通过 `@ConfigurationProperties` 改变这些 Bean 的行为。

```
spring-boot-autoconfigure.jar
 └─ META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
     org.springframework.boot.autoconfigure.web.servlet.WebMvcAutoConfiguration
     org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
     ...（3.x 起替代了 spring.factories 的 EnableAutoConfiguration 键）
```

条件注解族：`@ConditionalOnClass`、`@ConditionalOnMissingBean`（**用户没配我才配，这是"约定优于配置"能覆盖的原因**）、`@ConditionalOnProperty`、`@ConditionalOnWebApplication`。

**自定义 starter**（简历可写项）：`xxx-spring-boot-starter`（引依赖）+ `xxx-spring-boot-autoconfigure`（配置类 + imports 文件 + Properties 类）。公司中间件统一接入就是这套。

## 四、Web 开发四件套

### 统一响应体与全局异常

```java
public record Result<T>(int code, String message, T data) {
    public static <T> Result<T> ok(T data) { return new Result<>(0, "ok", data); }
    public static Result<Void> fail(int code, String msg) { return new Result<>(code, msg, null); }
}

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(BizException.class)                 // 业务异常：4xx 语义，warn 级
    public Result<Void> biz(BizException e) {
        return Result.fail(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)   // 参数校验失败
    public Result<Void> invalid(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + " " + f.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return Result.fail(40000, msg);
    }

    @ExceptionHandler(Exception.class)                    // 兜底：error 级带堆栈，对外不泄内部信息
    public Result<Void> unknown(HttpServletRequest req, Exception e) {
        log.error("未处理异常 uri={}", req.getRequestURI(), e);
        return Result.fail(50000, "系统繁忙，请稍后重试");
    }
}
```

### 参数校验

```java
public record OrderCreateDTO(
        @NotNull Long skuId,
        @Min(1) @Max(99) Integer qty,
        @Pattern(regexp = "1\\d{10}", message = "手机号格式不对") String mobile,
        @Size(max = 200) String remark) {}
// Controller 参数加 @Valid / @Validated 即触发；分组校验用 @Validated(Create.class)
```

### 拦截器 vs 过滤器（面试概念题）

Filter 是 Servlet 规范（拿到的是原始请求，适合改字符编码、跨域、日志脱敏）；Interceptor 是 Spring MVC 的（在 DispatcherServlet 前后，能拿到 handler 和 ModelAndView，适合登录态、权限、接口计时）。执行序：Filter → preHandle → Controller → postHandle → afterCompletion。

### 跨域与静态资源

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

## 五、数据访问（JD 里的 MyBatis 在这里）

### MyBatis / MyBatis-Plus 整合

```java
@Mapper
public interface OrderMapper extends BaseMapper<Order> {
    // 简单 CRUD 由 BaseMapper 免费赠送；复杂 SQL 写 XML 或注解
    @Select("""
            SELECT o.*, u.name AS user_name
            FROM orders o JOIN users u ON u.id = o.user_id
            WHERE o.status = #{status} AND o.created_at >= #{from}
            """)
    List<OrderRow> selectByStatus(@Param("status") int status, @Param("from") LocalDateTime from);
}
```

- **`#{}` vs `${}` 必考**：`#{}` 是预编译占位符（PreparedStatement `?`，防 SQL 注入）；`${}` 字符串直接拼接（仅动态表名/列名/ORDER BY 方向不得不用，且值必须来自白名单校验）。
- 动态 SQL：`<if>`、`<where>`、`<foreach>`（in 列表批量）、`<set>`（选择性更新）。
- MyBatis-Plus 加分项：`LambdaQueryWrapper` 类型安全查询、分页插件 `PaginationInnerInterceptor`（本质帮你改写 limit + count 两条 SQL）、代码生成器。
- 一级缓存：SqlSession 级默认开启（同事务内重复查同 id 只查一次）；二级缓存跨 Session 但粒度粗易脏数据，**生产通常关闭，缓存交给 Redis**。

### 事务在 Web 层的正确姿势

`@Transactional` 打在 Service 公开方法上；只读查询加 `@Transactional(readOnly = true)`（走从库、禁 flush 提速）；失效场景见 [Spring 核心](./spring-core#三-aop-与事务失效)。

## 六、测试与可观测

```java
@SpringBootTest                         // 集成测试：拉起完整容器
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

@WebMvcTest(OrderController.class)      // 切片测试：只起 Web 层，mock 掉 Service，秒级启动
class OrderControllerTest {
    @MockBean OrderService service;
    @Autowired MockMvc mvc;
}
```

- 生产监控：**Actuator** 暴露 `/actuator/health`（负载均衡探活）、`/metrics`（接 Prometheus）；日志用 `logback-spring.xml` + MDC 放 traceId 串起一次请求。
- 依赖注入测试替身优先 `@MockBean`/`@TestConfiguration`，别为了测试改生产代码可见性。

## 七、部署

```bash
mvn clean package -DskipTests
java -jar -Xms2g -Xmx2g -Dspring.profiles.active=prod order-service.jar
# Docker 多阶段构建（简历/生产双可用）
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

- jar 内已含内嵌 Tomcat，无需装容器——这正是 Boot "自包含"的部署红利。
- K8s 场景配好 liveness/readiness 指向 actuator 健康端点；优雅停机 `server.shutdown=graceful`。

## 八、本章面试高频清单

1. `@SpringBootApplication` 三个注解各干什么？自动配置完整流程？
2. yml 加载优先级；profile 怎么用？
3. `@Component` 与 `@Bean` 区别；`@ConfigurationProperties` 与 `@Value` 区别？
4. `#{}` 与 `${}` 与 SQL 注入。
5. MyBatis 一级/二级缓存；Mapper 接口没有实现类为什么能注入（JDK 代理 MapperProxy）。
6. 拦截器与过滤器区别；一次请求在 MVC 里的完整链路。
7. 全局异常处理怎么做的（项目必答题，照本章模板答）。
8. 打包后的 jar 结构、内嵌 Tomcat 如何启动（fat jar + LaunchedURLClassLoader）。
