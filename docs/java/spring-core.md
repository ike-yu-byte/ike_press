# Spring 核心：IoC 与 AOP

> Spring 是 Java 后端的"操作系统"，Spring Boot 只是它的"一键发行版"。理解了 IoC 容器和 AOP，Boot 的自动配置才不是玄学。本章对应 JD 里"熟悉 Spring 的 IoC、AOP"。

## 一、为什么需要 Spring：从 new 说起

不用框架写一个 Service：

```java
public class OrderService {
    private OrderDao dao = new OrderMysqlDao();          // 硬编码依赖实现
    private PriceCalculator calc = new PriceCalculator(dao); // 依赖链越拉越长
}
```

三个问题：**耦合实现类**（换 Redis 缓存要改代码）、**依赖链手动组装**（new 到地老天荒）、**横切逻辑散落**（每个方法里都写一遍事务/日志/权限）。

Spring 的答案：

- **IoC（控制反转）**：对象的创建和依赖装配交给容器，你只声明"我需要什么"。DI（依赖注入）是 IoC 的实现手段。
- **AOP（面向切面）**：把每个方法都要写的样板逻辑抽到切面，运行时织入。
- **抽象与模板**：`JdbcTemplate`、`RestClient` 等把易错资源管理封装成回调模板。

```java
@Service
public class OrderService {
    private final OrderDao dao;
    private final PriceCalculator calc;
    public OrderService(OrderDao dao, PriceCalculator calc) {  // 只声明需求
        this.dao = dao;
        this.calc = calc;
    }
}
// 容器启动时自动找到实现类注入——这就是构造器注入
```

## 二、IoC 容器与 Bean

### 容器是什么

`ApplicationContext`（`BeanFactory` 的增强版：加了事件、国际化、注解处理）内部维护 `Map<String, Object> beanDefinitionMap`（元数据）+ 单例池 `Map<String, Object> singletonObjects`（成品）。启动流程一句话：**扫描 → 解析成 BeanDefinition → 按依赖顺序实例化并注入 → 放进单例池**。

### 注册 Bean 的三种方式（现代主流是注解/组件扫描）

```java
@Configuration
@ComponentScan("com.example")          // Boot 主类默认扫描自身所在包及以下
public class AppConfig {

    @Bean
    public RestClient restClient() {   // 第三方类无法加注解 → 用 @Bean 方法注册
        return RestClient.create();
    }

    @Bean
    @ConditionalOnProperty(name = "pay.channel", havingValue = "alipay")
    public PayChannel alipayChannel() { // 按条件装配（Boot 自动配置的看家能力）
        return new AlipayChannel();
    }
}
```

 stereotype 注解族：`@Component`（通用）、`@Service`、`@Repository`（额外翻译持久层异常）、`@Controller/@RestController`。功能上等价，语义上让分层一眼可读。

### 依赖注入的三种姿势

| 方式 | 评价 |
| --- | --- |
| **构造器注入** | ✅ 官方推荐：依赖不可变（final）、不可能拿到半初始化对象、单测直接 new |
| Setter 注入 | 可选依赖用 |
| 字段注入 `@Autowired` | ❌ 官方已不推荐：脱离容器无法测试、掩盖依赖过多问题 |

```java
@Service
public class UserService {
    private final UserRepo repo;
    private final MailSender mail;

    public UserService(UserRepo repo, @Nullable MailSender mail) { // 只有一个构造器时 @Autowired 可省
        this.repo = repo;
        this.mail = mail;               // @Nullable 标注可选依赖
    }
}
```

同接口多实现的选择：`@Qualifier("smsSender")` 按名指定，或给 Bean 加 `@Primary` 设默认；更优雅的是注入 `Map<String, PayChannel>` 让容器把所有实现装进来做策略路由。

### Bean 的作用域与生命周期

作用域：`singleton`（默认，容器一份）、`prototype`（每次获取新建）、request/session（Web）。**prototype 注入 singleton 里会失效**（只注入一次），需要时改用 `ObjectProvider<T>`。

生命周期（面试标准链路）：

```
实例化(构造器) → 属性注入 → Aware回调(BeanNameAware/ApplicationContextAware)
→ BeanPostProcessor#postProcessBefore → @PostConstruct / afterPropertiesSet
→ BeanPostProcessor#postProcessAfter   ← AOP 代理在这里生成！
→ 使用 → @PreConstruct → 销毁
```

**BeanPostProcessor 是 Spring 扩展性的命门**：@Autowired 解析、@PostConstruct、AOP 代理、@ConfigurationProperties 绑定……全是各个 BPP 干的活。自定义 BPP 可实现"所有带某注解的 Bean 自动包一层代理"这类框架级需求。

### 循环依赖与三级缓存（必考）

A 依赖 B、B 依赖 A，构造器注入下无解（Spring Boot 2.6+ 默认直接禁止，报错让你改设计）。**字段/setter 注入**的循环依赖由三级缓存化解：

```
一级 singletonObjects：成品
二级 earlySingletonObjects：半成品（提前暴露的原始或代理）
三级 singletonFactories：ObjectFactory —— 调用时才决定暴露原始还是 AOP 代理
```

流程：A 实例化后先把"工厂"放进三级 → 注入 B 时发现 B 未创建去创建 B → B 注入 A 时从三级缓存拿到 A 的早期引用（若 A 需要代理则此时生成并升到二级）→ B 完成 → A 继续。**为什么必须三级**：AOP 代理的创建时机必须推迟到确实发生循环依赖时才决定，否则"提前暴露的就是代理"会破坏 BPP 生命周期。

**构造器循环依赖救不了**：实例化都完不成，没有"半成品"可暴露。

## 三、AOP 与事务失效

### 术语与最小示例

切面（Aspect）= 通知（Advice：Before/After/Around/AfterReturning/AfterThrowing）+ 切点（Pointcut：在哪织入）。

```java
@Aspect
@Component
@Slf4j
public class LogCostAspect {

    // 切点：com.example.service 下所有 public 方法
    @Pointcut("execution(public * com.example.service..*.*(..))")
    public void svc() {}

    @Around("svc()")
    public Object around(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.nanoTime();
        try {
            return pjp.proceed();                     // 放行目标方法
        } finally {
            log.info("{} 耗时 {} ms", pjp.getSignature().toShortString(),
                    (System.nanoTime() - start) / 1_000_000);
        }
    }
}
```

实现原理即 [Java 进阶](./java-advanced) 的动态代理：有接口用 JDK 代理，无接口用 CGLIB 子类代理。**AOP 代理只对"从代理对象进来的调用"生效**——这句话是理解下面事务失效场景的钥匙。

### @Transactional 失效六大场景（面试+事故双高频）

```java
@Service
public class OrderService {

    @Transactional
    public void a() { ... }

    public void b() {
        this.a();        // ❌场景1：自调用——this 不是代理对象，切面根本没进
    }

    @Transactional
    private void c() {}  // ❌场景2：非 public 方法代理不了

    @Transactional
    public void d() throws Exception {
        try {
            riskyOp();
        } catch (Exception e) {
            log.error("吞了", e);   // ❌场景3：异常被 catch 未抛出，回滚触发器看不到
        }
    }
    // 补救：@Transactional(rollbackFor = Exception.class) 且让异常外抛，或 catch 后手动 setRollbackOnly

    @Transactional
    public void e() {
        dao.insert(x);
        Thread.sleep(30_000);       // ⚠️场景4：事务里干耗时远程调用——长事务占连接，比失效更可怕
    }

    // ❌场景5：方法所在的类没被 Spring 管理（忘了 @Service / 自己 new 出来的）
    // ❌场景6：数据库引擎/连接不支持事务（MyISAM、手动关闭 autoCommit 的裸 JDBC）
}
```

传播行为（面试进阶问法）：`REQUIRED`（默认，并入当前事务）、`REQUIRES_NEW`（挂起当前、开新事务——日志落库不受主业务回滚影响）、`NESTED`（保存点）。`try { A(REQUIRES_NEW) } catch { 继续 }` 实现"部分失败不回滚整体"。

## 四、Spring 家族地图与 Boot 的关系

| 项目 | 管什么 |
| --- | --- |
| Spring Framework | IoC/AOP/MVC/事务/数据访问——核心能力 |
| Spring Boot | **不是替代而是加速**：自动配置 + starter 依赖 + 内嵌容器 + 约定优于配置，把"搭建与装配"从几天缩到几分钟 |
| Spring MVC | Web 层：DispatcherServlet 请求链路 |
| Spring Data / Security / AI | 数据访问、认证授权、AI 应用开发各一套抽象 |

**DispatcherServlet 一次请求**（后端八股常客）：Filter 链 → DispatcherServlet → HandlerMapping 找 Controller → 参数解析/校验 → HandlerAdapter 反射调用 → 返回值处理（@RestController 走 HttpMessageConverter 序列化成 JSON）→ 异常则走 HandlerExceptionResolver。

## 五、本章面试高频清单

1. IoC 解决了什么问题？构造器注入为什么优于字段注入？
2. Bean 生命周期完整链路；BeanPostProcessor 是干什么的？
3. 三级缓存解决循环依赖，为什么不能只有两级？
4. @Autowired 和 @Resource 区别（byType vs byName；前者 Spring 后者 JDK）。
5. @Transactional 失效场景（至少 4 个）+ 原理（代理）。
6. JDK 代理 vs CGLIB。
7. 事务传播行为 REQUIRES_NEW 的使用场景。
8. 手写一个自定义注解 + AOP 的字段脱敏/耗时统计切面（现场编程题，见上文 LogCostAspect 可当场默写）。
