# Spring Core: IoC & AOP

> Spring is the "operating system" of the Java backend; Spring Boot is merely its "one-click distro". Once IoC and AOP click, Boot's auto-configuration stops feeling like magic. This chapter answers the JD line "understand Spring IoC and AOP".

## 1. Why Spring Exists: Start from `new`

Without the framework:

```java
public class OrderService {
    private OrderDao dao = new OrderMysqlDao();          // hard-wired to an implementation
    private PriceCalculator calc = new PriceCalculator(dao); // the chain snowballs
}
```

Three problems: **coupled to implementations** (swapping to a Redis-backed dao means editing code), **manual wiring** (new until dawn), **cross-cutting logic sprayed everywhere** (transactions/logging/permissions repeated in every method).

Spring's answers:

- **IoC (Inversion of Control)**: the container owns creation and wiring; you only declare what you need. DI is the mechanism.
- **AOP**: hoist per-method boilerplate into aspects, woven in at runtime.
- **Abstractions & templates**: `JdbcTemplate`, `RestClient` etc. wrap error-prone resource management into callback templates.

```java
@Service
public class OrderService {
    private final OrderDao dao;
    private final PriceCalculator calc;
    public OrderService(OrderDao dao, PriceCalculator calc) {  // declare the need
        this.dao = dao;
        this.calc = calc;
    }
}
// the container finds implementations and injects them at startup — constructor injection
```

## 2. The Container and Beans

### What the container is

`ApplicationContext` (a `BeanFactory` plus events, i18n, annotation processing) maintains a `Map<String, BeanDefinition>` (metadata) plus the singleton pool (finished products). Startup in one line: **scan → parse into BeanDefinitions → instantiate & wire in dependency order → publish into the singleton pool**.

### Registering beans (annotations are the modern default)

```java
@Configuration
@ComponentScan("com.example")          // a Boot main class scans its own package and below by default
public class AppConfig {

    @Bean
    public RestClient restClient() {   // third-party classes can't be annotated → register via @Bean
        return RestClient.create();
    }

    @Bean
    @ConditionalOnProperty(name = "pay.channel", havingValue = "alipay")
    public PayChannel alipayChannel() { // conditional assembly — Boot auto-config's bread and butter
        return new AlipayChannel();
    }
}
```

Stereotypes: `@Component` (generic), `@Service`, `@Repository` (adds persistence exception translation), `@Controller/@RestController`. Functionally interchangeable; semantically they make layers readable at a glance.

### Three injection styles

| Style | Verdict |
| --- | --- |
| **Constructor** | ✅ official preference: final deps, no half-initialized objects, trivial unit tests via plain `new` |
| Setter | for optional dependencies |
| Field `@Autowired` | ❌ deprecated in practice: untestable without a container, hides over-fanned dependencies |

```java
@Service
public class UserService {
    private final UserRepo repo;
    private final MailSender mail;

    public UserService(UserRepo repo, @Nullable MailSender mail) { // single ctor → @Autowired optional
        this.repo = repo;
        this.mail = mail;               // mark optional deps @Nullable
    }
}
```

Multiple implementations of one interface: `@Qualifier("smsSender")` by name, `@Primary` for the default; the elegant option is injecting `Map<String, PayChannel>` and doing strategy dispatch yourself.

### Scopes & lifecycle

Scopes: `singleton` (default, one per container), `prototype` (new per lookup), request/session. **A prototype injected into a singleton is injected once** — use `ObjectProvider<T>` when you truly need per-call instances.

Lifecycle (the canonical interview chain):

```
instantiate (ctor) → populate properties → Aware callbacks (BeanNameAware/ApplicationContextAware)
→ BeanPostProcessor#postProcessBefore → @PostConstruct / afterPropertiesSet
→ BeanPostProcessor#postProcessAfter   ← AOP proxies are created here!
→ in service → destroy callbacks
```

**BeanPostProcessor is where Spring's extensibility lives**: @Autowired resolution, @PostConstruct, AOP proxies, @ConfigurationProperties binding — all are BPPs. Writing your own enables framework-grade features ("proxy every bean with annotation X").

### Circular dependencies & the three caches (guaranteed question)

A needs B, B needs A — hopeless with constructor injection (Boot 2.6+ forbids it by default and tells you to fix the design). With field/setter injection, three caches save the day:

```
L1 singletonObjects:        finished beans
L2 earlySingletonObjects:   early references (raw or already proxied)
L3 singletonFactories:      ObjectFactory — decides raw-vs-proxy lazily
```

Flow: A instantiates, drops its factory into L3 → wiring B discovers B missing → B creation asks for A → L3 factory runs (generating A's AOP proxy *now* if needed, promoting to L2) → B finishes → A continues. **Why three levels**: the decision "expose raw or proxied" must be deferred until a cycle actually occurs, otherwise early proxying would break BPP ordering.

**Constructor cycles are unsolvable**: there is no half-made object to expose before the constructor completes.

## 3. AOP & Transaction Failure Modes

### Vocabulary + minimal aspect

An aspect = advice (Before/After/Around/AfterReturning/AfterThrowing) + pointcut (where to weave).

```java
@Aspect
@Component
@Slf4j
public class LogCostAspect {

    @Pointcut("execution(public * com.example.service..*.*(..))")
    public void svc() {}

    @Around("svc()")
    public Object around(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.nanoTime();
        try {
            return pjp.proceed();                     // invoke the target
        } finally {
            log.info("{} took {} ms", pjp.getSignature().toShortString(),
                    (System.nanoTime() - start) / 1_000_000);
        }
    }
}
```

The mechanism is exactly the dynamic proxies from [Java Advanced](./java-advanced): interface → JDK proxy, none → CGLIB subclass. **AOP only intercepts calls that arrive through the proxy** — this single sentence unlocks every transaction failure below.

### Six ways @Transactional silently dies (interview + production incident special)

```java
@Service
public class OrderService {

    @Transactional
    public void a() { ... }

    public void b() {
        this.a();        // ❌1 self-invocation — `this` is not the proxy; advice never runs
    }

    @Transactional
    private void c() {}  // ❌2 non-public methods can't be proxied

    @Transactional
    public void d() throws Exception {
        try {
            riskyOp();
        } catch (Exception e) {
            log.error("swallowed", e);   // ❌3 exception eaten — the rollback trigger never fires
        }
    }
    // fix: @Transactional(rollbackFor = Exception.class), rethrow, or setRollbackOnly manually

    @Transactional
    public void e() {
        dao.insert(x);
        Thread.sleep(30_000);       // ⚠️4 remote call inside a txn — long transaction hogs a connection;
                                    //   worse in production than a failure
    }

    // ❌5 the class isn't a spring bean (forgotten @Service, or someone `new`-ed it)
    // ❌6 engine/driver without transaction support (MyISAM, raw JDBC with autoCommit quirks)
}
```

Propagation (the senior follow-up): `REQUIRED` (default, joins), `REQUIRES_NEW` (suspend mine, start fresh — audit logs that must survive the caller's rollback), `NESTED` (savepoint). Wrapping a `REQUIRES_NEW` call in try/catch yields "partial failure without global rollback".

## 4. The Family Map & Boot's Relationship

| Project | Owns |
| --- | --- |
| Spring Framework | IoC/AOP/MVC/transactions/data access — the core |
| Spring Boot | **accelerates, doesn't replace**: auto-configuration + starters + embedded server + convention-over-configuration compress setup from days to minutes |
| Spring MVC | the web layer: DispatcherServlet request flow |
| Spring Data / Security / AI | data access, authn/authz, AI app development abstractions |

**One request through MVC** (the eternal question): filter chain → DispatcherServlet → HandlerMapping locates the controller → argument resolution/validation → HandlerAdapter invokes via reflection → return-value handling (@RestController serializes via HttpMessageConverter) → on error, HandlerExceptionResolver.

## 5. Chapter interview checklist

1. What problem does IoC solve? Why constructor over field injection?
2. Full bean lifecycle; what is a BeanPostProcessor?
3. Three caches vs circular deps — why not two caches?
4. @Autowired vs @Resource (byType vs byName; Spring vs Jakarta).
5. At least four @Transactional failure modes + the proxy explanation.
6. JDK proxy vs CGLIB.
7. When do you reach for REQUIRES_NEW?
8. Whiteboard: custom annotation + AOP timing/masking aspect (the LogCostAspect above is memorizable verbatim).
