# Microservices & Spring Cloud

> Answers the JD line "familiar with microservices / Spring Cloud / Spring Cloud Alibaba". Most architecture questions in mid/senior Java interviews come from this chapter. Build the judgment first — *why split, how to split, what the split costs* — then master the five pillars: registry, config center, gateway, circuit breaking/rate limiting, and distributed tracing.

## 1. Monolith → Microservices: Think Before You Cut

### The evolution

```
monolith (one jar does everything)
→ vertical apps (site-per-domain: shop / forum / admin, each standalone)
→ SOA/ESB (heavy enterprise bus)
→ microservices (each capability its own process, lightweight HTTP/RPC)
→ service mesh (governance sinks to sidecars; Istio-style, code-agnostic)
```

### What you gain and what you pay (lead with this dialectic)

| Gain | Cost |
| --- | --- |
| Independent deploys, no release trains | Distributed complexity: unreliable network, partial failure, skewed clocks |
| Per-service elastic scaling (scale only the hot path) | Data consistency becomes an eventual-consistency design problem |
| Free tech choices per service, fault isolation | Ops explosion: hopeless without containers + automated CI/CD |
| Teams align to capabilities (Conway's law) | Local calls become remote: performance and transaction semantics change |

**Standard answer to "how did you split services"**: by business capability / bounded context (DDD), one service = one private database (never reach across schemas), start with modular monolith (Maven multi-module decoupling) before physical splits, and err coarse — merging wrongly-split services is far more expensive than splitting later.

## 2. The Stack Map (2026 selection)

Spring Cloud is the spec and skeleton; two mainstream implementation lines:

| Capability | Netflix/official line | Alibaba line (mainstream in China) |
| --- | --- | --- |
| Registry/discovery | Eureka (maintenance) | **Nacos** (registry + config in one) |
| Config center | Config | **Nacos** |
| Client-side LB | Ribbon (dead) → LoadBalancer | LoadBalancer |
| Service calls | OpenFeign | OpenFeign / Dubbo |
| Gateway | Spring Cloud Gateway | Gateway / Higress |
| Circuit/rate limit | Hystrix (dead) → Resilience4j | **Sentinel** |
| Distributed transactions | — | **Seata** |
| Messaging | Spring Cloud Stream | RocketMQ / Kafka |

**Version alignment is trap #1**: Boot / Cloud / Cloud Alibaba follow a strict compatibility matrix (e.g. Boot 3.x ↔ Cloud 2023.x/2025.x ↔ matching Alibaba line). Bump the whole BOM line per the official table — never one version number in isolation.

## 3. Service Registry & Discovery (Nacos)

### In one sentence

On boot each instance registers itself (IP:port + metadata) into Nacos; callers pull and cache the instance list locally and **load-balance client-side**; Nacos evicts unhealthy nodes via heartbeats (5s for ephemeral instances).

- Nacos runs AP (ephemeral instances, heartbeat) or CP (persistent instances, Distro/Raft). The exam point — "AP or CP for a registry?": briefly-stale data (calling a dead instance) is tolerable and retryable, so prefer AP availability.
- Versus Eureka (AP only, no config); versus Consul/Zookeeper (CP). Cloud-native trend question: K8s Services can replace the registry entirely.

### OpenFeign declarative clients

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
// @EnableFeignClients on the app class; the interface mirrors the provider's controller
@FeignClient(name = "product-service", path = "/api/products")
public interface ProductClient {
    @GetMapping("/{id}")
    Result<ProductVO> detail(@PathVariable("id") Long id);
}

@Service
public class OrderService {
    private final ProductClient productClient;      // constructor injection
    public OrderService(ProductClient productClient) { this.productClient = productClient; }

    public OrderVO create(CreateDTO dto) {
        var product = productClient.detail(dto.getSkuId()).getData(); // remote looks local
        ...
    }
}
```

- Load balancing happens in the LoadBalancer layer (round-robin default; swap `ServiceInstanceListSupplier` for consistent-hash/zone-aware).
- **Set timeouts explicitly**: Feign's defaults (connect 10s / read 60s) are far too long; the timeout chain must shrink inward (gateway > caller > callee) or you invite retry storms.
- A `RequestInterceptor` propagates the `Authorization`/identity headers the gateway forwarded.

## 4. Config Center (Nacos Config)

```yaml
# pulled at bootstrap (Boot 3 style: spring.config.import)
spring:
  application:
    name: order-service
  cloud:
    nacos:
      server-addr: nacos:8848
      config:
        file-extension: yaml
        namespace: prod            # environment isolation: dev/test/prod
        group: SHOP_GROUP
  config:
    import:
      - optional:nacos:${spring.application.name}.${spring.cloud.nacos.config.file-extension}
```

- **Hot refresh**: Nacos pushes changes → `@ConfigurationProperties` beans rebind automatically; plain `@Value` fields only update if the class carries `@RefreshScope` (proxy re-created) — the frequent follow-up.
- Three-level model: `namespace` (env) → `group` (domain) → `dataId` (service name + suffix); shared config via `shared-configs`.
- Precedence: Nacos config > local profile file > local main file (tunable via `spring.cloud.config.override-none`).
- Secrets go through KMS/encryption plugins, never plaintext dataIds.

## 5. API Gateway (Spring Cloud Gateway)

### Three concepts: Route + Predicate + Filter

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: order-route
          uri: lb://order-service          # lb:// = registry + load balancing
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

The gateway duty list (memorize for "what does the gateway do"): **centralized authn/authz, routing + LB entry, global rate limiting, unified CORS, logging & traceId origin, request rewriting (StripPrefix/AddRequestHeader), traffic splitting for canaries**. No business logic — don't grow a second application in the gateway.

### Global auth filter

```java
@Component
public class AuthGlobalFilter implements GlobalFilter, Ordered {
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        if (WHITE_LIST.stream().anyMatch(path::startsWith)) {
            return chain.filter(exchange);                    // login etc. pass through
        }
        String token = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        Claims claims = JwtUtils.parse(token);                 // failure → UnauthorizedException
        // forward identity downstream; services never parse tokens
        return chain.filter(exchange.mutate()
                .request(r -> r.header("X-User-Id", String.valueOf(claims.getUid()))).build());
    }
    @Override
    public int getOrder() { return -100; }
}
```

## 6. Resilience: Circuit Breaking, Fallback, Rate Limiting (Sentinel)

### Disambiguate first (guaranteed question)

- **Rate limiting**: cap ingress flow (protect the system) — by QPS/threads/origin/hot parameter.
- **Circuit breaking**: when downstream error/slow-call ratios breach a threshold, **fail fast for a window** (half-open probes recovery) so callers' thread pools don't drown — avalanche prevention.
- **Fallback/degradation**: what the user actually sees when limiting/breaking fires (stale cache, default copy, queue ticket).

### Sentinel in use

```java
// rules usually configured live in the dashboard; code rules shown for clarity
@SentinelResource(value = "createOrder",
        blockHandler = "createOrderBlocked",          // fires on limit/break
        fallback = "createOrderFallback")             // business exceptions
public OrderVO create(CreateDTO dto) {
    return orderService.create(dto);
}

public OrderVO createOrderBlocked(CreateDTO dto, BlockException ex) {
    return OrderVO.queued("Too many orders right now, please retry");   // fast-fail tip
}

// hot-parameter limiting: one SKU under seckill traffic
@SentinelResource(value = "seckill", blockHandler = "seckillBlocked")
public OrderVO seckill(@Param("skuId") Long skuId) { ... }
// rule: paramIdx=0, count=100 → per-skuId 100 QPS per instance
```

- Rule persistence defaults to memory (lost on restart) — production pushes rules through a **Nacos datasource**.
- Versus Resilience4j: annotation-light (`@CircuitBreaker/@RateLimiter/@Retry`), no console; suits non-Alibaba stacks.
- **Retries are a hazard**: caller retry × gateway retry × MQ retry = amplification incidents. Budget retries across the chain and retry only idempotent operations.

## 7. Observability: Logs, Metrics, Traces

| Pillar | Tech | Key point |
| --- | --- | --- |
| Logs | ELK/Loki | centralized + **traceId search** (MDC throughout) |
| Metrics | Micrometer + Prometheus + Grafana | QPS/RT/error rate, pool watermarks |
| Traces | Micrometer Tracing (OTel/Zipkin bridge) | cross-service call trees & latency waterfalls |

```yaml
management:
  tracing:
    sampling:
      probability: 1.0          # 0.01–0.1 in production
  zipkin:
    tracing:
      endpoint: http://zipkin:9411/api/v2/spans
```

- Since Boot 3 the official abstraction is **Micrometer Observation**, bridging OpenTelemetry — naming "OTel is the de-facto standard" signals freshness.
- traceId propagation across threads/services: MDC + Reactor Context / Feign interceptor injecting the `traceparent` header (W3C Trace Context).
- The triage drill: Grafana shows RT spike → trace system pinpoints the slow service → that service's logs filtered by traceId find the exact stack.

## 8. Threading It All Together: One Order Request

```
user → gateway(auth + rate limit + route lb://order-service)
     → order service: validate → OpenFeign to product (price) → stock (idempotent decrement)
     → write order DB → publish RocketMQ event (order created) → respond synchronously
     → async: points / notification / risk services consume (eventual consistency)
cross-cutting: Nacos registry+config; Sentinel breaking/fallbacks; traceId from gateway through logs & traces
```

When asked to "draw your microservice architecture", narrate exactly this line, and volunteer two details: ① why stock decrement goes through an idempotent API + message instead of a strong distributed transaction; ② why the gateway forwards identity via header instead of every service parsing the token.

## 9. Chapter interview checklist

1. Why microservices — and when *not* to use them (judgment test).
2. Splitting principles and granularity; what happens to the databases.
3. Nacos discovery mechanics; AP vs CP choice for registries.
4. Where does load balancing happen in an OpenFeign call?
5. Nacos hot-refresh mechanics; why plain `@Value` doesn't update.
6. Gateway duties; the three components; how gateway auth works.
7. Limiting vs breaking vs degradation + algorithms (counter/sliding window/leaky bucket/token bucket).
8. How do you prevent retry storms?
9. How does traceId cross services and threads?
10. How are Spring Cloud / Alibaba / Boot versions aligned?
