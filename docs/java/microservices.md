# 微服务与 Spring Cloud

> 对应 JD 里"熟悉微服务架构 / Spring Cloud / Spring Cloud Alibaba"。中高级 Java 岗的架构题几乎全出自本章。先建立"为什么拆、怎么拆、拆完付出什么代价"的判断力，再逐个掌握注册发现、配置中心、网关、熔断限流、链路追踪五大件。

## 一、单体 → 微服务：先想清楚再动手

### 演进脉络

```
单体（一个 jar 全干）
→ 垂直应用（按业务拆成几个独立站点，电商/论坛/后台各一套）
→ SOA/ESB（企业服务总线，重中台）
→ 微服务（每个业务能力独立进程部署，轻量 HTTP/RPC 互通）
→ Service Mesh（治理下沉到 Sidecar，Java 代码无感知，Istio 系）
```

### 微服务得到什么、付出什么（面试先答这个辩证题）

| 得到 | 付出 |
| --- | --- |
| 独立部署，发布互不阻塞 | 分布式复杂度：网络不可信、部分失败、时钟不齐 |
| 按服务弹性伸缩（下单热点只扩下单） | 数据一致性从"一个事务"变成"最终一致"课题 |
| 技术栈自由、故障隔离 | 运维成本暴涨：没有容器化+自动化 CI/CD 玩不转 |
| 组织上对齐业务团队（康威定律） | 本地调用变远程调用，性能与事务语义全变 |

**"你们服务怎么拆的？"标准答法**：按业务能力/领域边界（DDD 限界上下文）拆，一个服务一个私有数据库（严禁跨库直连表），拆分从单体模块化开始（Maven 多模块先解耦，再物理拆分），粒度宁粗勿细——拆错了合并代价极大。

## 二、技术栈全景（2026 选型地图）

Spring Cloud 是规范与骨架，底下有两套主流实现路线：

| 能力 | Spring Cloud 官方/Netflix 系 | Spring Cloud Alibaba 系（国内主流） |
| --- | --- | --- |
| 注册发现 | Eureka（维护状态） | **Nacos**（注册+配置二合一） |
| 配置中心 | Config | **Nacos** |
| 客户端负载均衡 | Ribbon（已停更）→ LoadBalancer | LoadBalancer |
| 服务调用 | OpenFeign | OpenFeign / Dubbo |
| 网关 | Spring Cloud Gateway | Gateway / Higress |
| 熔断限流 | Hystrix（停更）→ Resilience4j | **Sentinel** |
| 分布式事务 | — | **Seata** |
| 消息 | Spring Cloud Stream | RocketMQ / Kafka |

**版本对齐是第一个坑**：Boot / Cloud / Cloud Alibaba 三者有严格兼容表（如 Boot 3.x ↔ Cloud 2023.x/2025.x ↔ Alibaba 对应版本线），升级必须整线核对官方 BOM，不能只动一个版本号。

## 三、注册中心与服务发现（Nacos）

### 原理一句话

服务启动把自己（IP:端口+元数据）注册到 Nacos 列表；调用方拉取列表缓存在本地，**客户端负载均衡**挑选实例发起调用；Nacos 通过心跳（临时实例 5s）剔除不健康节点。

- Nacos 支持 AP（临时实例，心跳，CP 权衡下优先可用）与 CP（持久实例 + Distro/Raft 协议）双模式——"注册中心该选 AP 还是 CP"的考点：短暂脏数据（调用到已下线实例）可由重试兜底，宁可 AP 保可用。
- 对比 Eureka：只有 AP、无配置功能；Consul/Zookeeper：CP，K8s 时代 Service 与 Headless Service 也能替代注册发现（云原生趋势题）。

### OpenFeign 声明式调用

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-openfeign</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-loadbalancer</artifactId>
</dependency>
```

```java
// 启动类 @EnableFeignClients；接口即客户端，签名对齐提供方 Controller
@FeignClient(name = "product-service", path = "/api/products")
public interface ProductClient {
    @GetMapping("/{id}")
    Result<ProductVO> detail(@PathVariable("id") Long id);
}

@Service
public class OrderService {
    private final ProductClient productClient;      // 构造注入
    public OrderService(ProductClient productClient) { this.productClient = productClient; }

    public OrderVO create(CreateDTO dto) {
        var product = productClient.detail(dto.getSkuId()).getData(); // 像本地方法一样调远程
        ...
    }
}
```

- 负载均衡由 LoadBalancer 完成（轮询默认；`ServiceInstanceListSupplier` 可换一致性哈希/就近）。
- **超时必须显式配**：Feign 默认 connect 10s/read 60s 太长，配合网关整体超时链要"外层 > 内层"，否则重试风暴。
- 拦截器统一加认证头：实现 `RequestInterceptor` 把网关透传下来的 `Authorization` 塞进下游请求。

## 四、配置中心（Nacos Config）

```yaml
# bootstrap 阶段拉取（Boot 3 用 spring.config.import）
spring:
  application:
    name: order-service
  cloud:
    nacos:
      server-addr: nacos:8848
      config:
        file-extension: yaml
        namespace: prod            # 环境隔离：dev/test/prod 命名空间
        group: SHOP_GROUP
  config:
    import:
      - optional:nacos:${spring.application.name}.${spring.cloud.nacos.config.file-extension}
```

- **动态刷新**：配置变更 Nacos 推送 → 标注 `@ConfigurationProperties` 的 Bean 自动重绑；`@Value` 字段需类上加 `@RefreshScope`（重建代理）才生效——高频追问点。
- 三层数据模型：`namespace`（环境）→ `group`（业务分组）→ `dataId`（服务名+后缀）；共享配置用 `shared-configs`。
- 配置优先级：Nacos 配置 > 本地 profile 文件 > 本地主文件（可用 `spring.cloud.config.override-none` 系列调整）。
- 密码类配置生产用 KMS/加密插件，不进明文 dataId。

## 五、API 网关（Spring Cloud Gateway）

### 三大概念：Route + Predicate + Filter

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: order-route
          uri: lb://order-service          # lb:// 走注册中心 + 负载均衡
          predicates:
            - Path=/api/orders/**
            - After=2026-10-01T00:00:00+08:00[Asia/Shanghai]
          filters:
            - StripPrefix=1                # /api/orders/x → /orders/x
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 100
                redis-rate-limiter.burstCapacity: 200
                key-resolver: "#{@ipKeyResolver}"
```

网关职责清单（面试"网关都干什么"背这个）：**统一认证鉴权、路由与负载均衡入口、全局限流、CORS 统一处理、日志与 traceId 起点、请求改写（StripPrefix/AddRequestHeader）、灰度分流**。网关不做业务逻辑，别把它写成第二个业务系统。

### 全局鉴权过滤器

```java
@Component
public class AuthGlobalFilter implements GlobalFilter, Ordered {
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        if (WHITE_LIST.stream().anyMatch(path::startsWith)) {
            return chain.filter(exchange);                    // 登录等白名单放行
        }
        String token = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        Claims claims = JwtUtils.parse(token);                 // 失败抛 UnauthorizedException
        // 把用户身份透传给下游，下游不再解析 token
        return chain.filter(exchange.mutate()
                .request(r -> r.header("X-User-Id", String.valueOf(claims.getUid()))).build());
    }
    @Override
    public int getOrder() { return -100; }
}
```

## 六、容错：熔断、降级、限流（Sentinel）

### 三个概念先分清（必考辨析题）

- **限流**：控制入口流量速率（保护系统不被打垮），维度：QPS/线程数/来源/热点参数。
- **熔断**：下游异常率/慢调用超阈值时**快速失败一段时间**（半开探测恢复），防止雪崩拖死上游线程池。
- **降级**：失败时的兜底返回（缓存旧值、默认文案、返回排队号），是"限流/熔断触发后给用户看什么"。

### Sentinel 使用

```java
// 资源保护：流控 + 降级规则可在控制台动态配置（生产主流玩法），也可代码硬规则
@SentinelResource(value = "createOrder",
        blockHandler = "createOrderBlocked",          // 限流/熔断触发走这里
        fallback = "createOrderFallback")             // 业务异常兜底
public OrderVO create(CreateDTO dto) {
    return orderService.create(dto);
}

public OrderVO createOrderBlocked(CreateDTO dto, BlockException ex) {
    return OrderVOqueued.tip("当前下单人数过多，请稍后重试");   // 快速失败提示
}

// 热点参数限流：单个 SKU 的秒杀场景
@SentinelResource(value = "seckill", blockHandler = "seckillBlocked")
public OrderVO seckill(@Param("skuId") Long skuId) { ... }
// 规则：paramIdx=0, count=100 → skuId 维度每实例 100 QPS
```

- 规则持久化：默认存内存重启即丢，生产接 **Nacos 数据源**推送规则（`datasource.nacos`）。
- 对比 Resilience4j：轻量注解式（`@CircuitBreaker/@RateLimiter/@Retry`），无控制台，适合非 Alibaba 技术栈。
- **重试也是风险**：下游超时重试 × 上游重试 × 网关重试 = 流量放大事故，重试预算（retry budget）要全链路统筹，只对幂等接口重试。

## 七、可观测性：日志、指标、链路

三支柱在微服务下的形态：

| 支柱 | 技术 | 关键点 |
| --- | --- | --- |
| 日志 | ELK/Loki | 集中收集 + **traceId 检索**（MDC 贯穿） |
| 指标 | Micrometer + Prometheus + Grafana | QPS/RT/错误率/线程池/连接池水位 |
| 链路 | Micrometer Tracing（Bridge OTel/Zipkin）| 一次请求跨 N 个服务的调用树与耗时瀑布图 |

```yaml
management:
  tracing:
    sampling:
      probability: 1.0          # 生产按 0.01~0.1 采样
  zipkin:
    tracing:
      endpoint: http://zipkin:9411/api/v2/spans
```

- Boot 3 起官方抽象是 **Micrometer Observation**，底层桥接 OpenTelemetry——面试说出"OTel 已是事实标准"是加分项。
- traceId 如何跨线程/跨服务：MDC + Reactor Context / Feign 拦截器塞 `traceparent` 头（W3C Trace Context）。
- 排障标准动线：Grafana 大盘发现 RT 飙升 → 链路系统按慢 trace 找到瓶颈服务 → 该服务日志按 traceId 精确定位堆栈。

## 八、把五大件串起来：一次下单请求的完整旅程

```
用户 → 网关(鉴权+限流+路由 lb://order-service)
     → 订单服务：本地校验 → OpenFeign 调商品服务(查价) → 调库存服务(扣减,幂等)
     → 写订单库 → 发 RocketMQ 消息(下单事件) → 同步返回
     → 异步：积分/通知/风控 服务消费消息(最终一致)
全链路：Nacos 注册发现+配置；Sentinel 熔断降级兜底；traceId 从网关贯穿到日志与链路系统
```

面试被问"画一下你们微服务架构"，就按这条线讲，并主动指出两处细节：① 库存扣减为什么走幂等接口+消息而不是分布式强一致事务；② 网关鉴权后为什么用头透传身份而不是让每个服务解析 token。

## 九、本章面试高频清单

1. 为什么要微服务？什么情况下不该用微服务（考判断力）。
2. 服务拆分原则与粒度；拆分后数据库怎么处理。
3. Nacos 注册发现原理；AP/CP 怎么选。
4. OpenFeign 调用链路上负载均衡发生在哪一层？
5. Nacos 配置动态刷新原理，`@Value` 为什么不生效？
6. 网关的职责；Gateway 三大组件；网关鉴权怎么做？
7. 限流/熔断/降级三概念辨析 + 算法（计数器/滑动窗口/漏桶/令牌桶）。
8. 重试风暴怎么防？
9. traceId 如何跨服务跨线程传播？
10. Spring Cloud、Alibaba、Boot 版本怎么对齐？
