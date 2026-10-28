# Java 进阶：并发、JVM 与新特性

> "Java 基础扎实"在面试里的真实含义是这一章：并发编程 + JVM。中高级 Java 岗的分水岭几乎全部集中在这里。

## 一、多线程与并发编程

### 线程的创建与生命周期

```java
// 三种写法本质一种：都是给 Thread 一个 Runnable
Thread t1 = new Thread(() -> System.out.println("runnable 方式"));
t1.start();                                  // 注意：start() 不是 run()！直接 run 是当前线程同步执行

// Callable + Future：有返回值、能抛异常
ExecutorService pool = Executors.newSingleThreadExecutor();
Future<Integer> f = pool.submit(() -> queryRowCount());   // 提交后继续干别的
Integer rows = f.get(3, TimeUnit.SECONDS);                // 超时获取
```

状态机：`NEW → RUNNABLE → (BLOCKED 等锁 / WAITING 等通知 / TIMED_WAITING 带超时) → TERMINATED`。

### 线程安全三性质与 synchronized

线程安全问题本质是三件事没保证：**原子性、可见性、有序性**。

```java
// 计数器错误示范：i++ 不是原子操作（读-改-写三步）
private int count;                 // 多线程下会丢更新
public synchronized void inc() { count++; }   // 方案1：加锁

private AtomicInteger count2 = new AtomicInteger();
public void inc2() { count2.incrementAndGet(); } // 方案2：CAS 无锁（竞争不激烈时更快）

private long sum = 0, cnt = 0;
public void inc3() {               // 方案3：LongAdder——高并发写统计的首选
    // sum 与 cnt 是两个变量，需要一起保护时仍得加锁或用不可变对象打包
}
```

**synchronized 的锁是什么**：对象头 Mark Word 里的监视器（monitor）。修饰实例方法锁 `this`，静态方法锁 `Class` 对象，同步块锁括号里的对象——**锁错对象是新手最常见 bug**（比如锁了一个每次新建的字符串）。

JDK 6+ 锁升级：无锁 → 偏向锁（同一线程重入）→ 轻量级锁（CAS 自旋）→ 重量级锁（OS mutex）。了解演进思路即可，面试表述为"为了减少获得锁的开销，JVM 不会一上来就用内核级锁"。

### volatile 与 JMM

Java 内存模型（JMM）规定：每个线程有工作内存（缓存/寄存器的抽象），共享变量在主内存，线程间不能直接看见对方的工作内存——这就是**可见性**问题。

`volatile` 保证两件事：

1. **可见性**：写立即刷主存、读强制从主存取（通过内存屏障实现）。
2. **禁止指令重排**：经典应用是**双重检查锁单例**中 `instance` 必须加 volatile，否则其他线程可能拿到"分配了内存但没执行构造"的半成品。

`volatile` **不保证原子性**：`volatile int i; i++;` 依然会丢更新。

### 线程池（必考中的必考）

```java
// 阿里规范：禁止用 Executors 快捷方法，必须手动 new ThreadPoolExecutor
ThreadPoolExecutor pool = new ThreadPoolExecutor(
        8,                                   // corePoolSize 核心线程数
        16,                                  // maximumPoolSize 最大线程数
        60L, TimeUnit.SECONDS,               // 空闲核心外线程存活时间
        new ArrayBlockingQueue<>(200),       // 工作队列：有界！LinkedBlockingQueue 无界会 OOM
        new ThreadFactoryBuilder().setNameFormat("order-pool-%d").build(), // 命名便于排错
        new ThreadPoolExecutor.CallerRunsPolicy()); // 拒绝策略：调用者线程执行（降压不丢任务）

pool.execute(() -> handle(order));
// 优雅关闭
pool.shutdown();
if (!pool.awaitTermination(30, TimeUnit.SECONDS)) pool.shutdownNow();
```

执行流程：核心线程 → 队列 → 非核心线程 → 拒绝策略。四种拒绝策略：`Abort`（默认抛异常）、`CallerRuns`（回压）、`Discard`（丢任务）、`DiscardOldest`。

参数怎么定（面试标准答案框架）：**CPU 密集型** N+1；**IO 密集型** 2N 起步再按压测调；混合负载拆两个池。真实生产更靠谱的做法是给池子接上监控动态调参。

### Lock、AQS 与并发工具

```java
ReentrantLock lock = new ReentrantLock();
lock.lock();
try {
    // 临界区
} finally {
    lock.unlock();                  // 必须在 finally 解锁！
}
```

- `ReentrantLock` 相比 synchronized：可中断 `lockInterruptibly()`、可超时 `tryLock()`、可公平、可多条件变量 `newCondition()`。
- **AQS** 一句话：一个 `volatile state` + CAS + FIFO 双向队列，把"抢不到锁的线程挂起排队"标准化；ReentrantLock/Semaphore/CountDownLatch 都构建在它上面。
- 工具类：`CountDownLatch`（等 N 件事做完）、`CyclicBarrier`（凑齐 N 个一起走，可复用）、`Semaphore`（限并发数，做接口降流）。

### 虚拟线程（Java 21，2026 面试新热点）

```java
// 平台线程 1:1 映射 OS 线程，几千个就到头；虚拟线程 M:N 调度，百万级
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    for (var url : urls) {
        executor.submit(() -> {
            var body = HttpClient.newHttpClient()
                    .send(HttpRequest.newBuilder(URI.create(url)).build(),
                          HttpResponse.BodyHandlers.ofString())
                    .body();                 // 阻塞时自动卸载载体线程，不浪费 OS 线程
            return body.length();
        });
    }
}   // close() 等待全部完成
```

适用：**大量阻塞 IO** 的服务（HTTP 调用、数据库查询）；不适用：CPU 密集、需要 `synchronized` 长期持锁的代码（JDK 24 前会 pin 载体线程）。Spring Boot 3.2+ 一行配置 `spring.threads.virtual.enabled=true` 即可让 Tomcat 请求线程虚拟化，Spring Boot 4 在 Java 21+ 下更进一步默认化——详见 [Spring Boot 3 vs 4](./spring-boot3-vs4)。

## 二、JVM

### 运行时内存区域

| 区域 | 线程共享 | 存什么 | 溢出异常 |
| --- | --- | --- | --- |
| 堆 | 共享 | 对象实例（GC 主战场） | `OutOfMemoryError: Java heap space` |
| 方法区/元空间 | 共享 | 类元信息、常量（JDK 8 后元空间用本地内存） | `Metaspace` |
| 虚拟机栈 | 私有 | 栈帧：局部变量表、操作数栈、返回地址 | `StackOverflowError`（递归过深）/ OOM |
| 本地方法栈 / 程序计数器 | 私有 | native 调用 / 当前字节码行号 | — |

JDK 8 重要变化：**永久代被元空间取代**（字符串常量池、静态变量搬进堆），避免"调大 PermSize 也救不了"的历史问题。

### 对象创建、逃逸与 GC Roots

- new 对象：类加载检查 → 分配内存（指针碰撞/空闲列表）→ 零值初始化 → 执行构造器 → **对象头**（Mark Word + 类指针 + 对齐填充）。
- **逃逸分析**：对象不逃出方法则标量替换（拆成局部变量，根本不进堆）、锁消除。这是"new 不一定在堆上"面试题的答案。
- 可达性分析 GC Roots：虚拟机栈引用、静态变量、常量、JNI 引用、**活跃线程**等。`System.gc()` 只是建议，生产禁用（`-XX:+DisableExplicitGC`）。

### 垃圾收集器演进

| 收集器 | 特点 | 定位 |
| --- | --- | --- |
| Serial / Parallel Scavenge | 单线程/多线程吞吐优先，STW | JDK 8 默认组合 |
| CMS | 并发标记清除，低停顿 | 有内存碎片问题，JDK 14 移除 |
| **G1** | 分 Region、可预测停顿 `-XX:MaxGCPauseMillis=200` | JDK 9+ 默认，大堆通用首选 |
| ZGC / Shenandoah | 着色指针/读屏障，停顿 <1ms 且与堆大小无关 | JDK 15 ZGC 生产可用；Java 21+ 分代 ZGC |

G1 核心话术：把堆划分为 2048 个 Region，逻辑上仍分 Eden/Survivor/Old；维护 Remembered Set 避免全堆扫描；GC 时按"停顿预测模型"挑选价值最高的 Region 回收（Garbage First 名字的由来）。

### 类加载与双亲委派

加载流程：**加载 → 验证 → 准备（静态变量零值）→ 解析 → 初始化（执行 `<clinit>`）**。

双亲委派：AppClassLoader → PlatformClassLoader → BootstrapClassLoader，收到加载请求先委托父层，父层无法完成才自己加载。意义：核心类不被篡改（你写一个 `java.lang.String` 也没用）、避免重复加载。**打破案例**：SPI（DriverManager 用线程上下文类加载器）、Tomcat Web 应用隔离、OSGi。

### 调优与排查三板斧（简历加分项）

```bash
# 常用参数
java -Xms4g -Xmx4g                      # 堆初始=最大，避免运行时扩容抖动
     -XX:MetaspaceSize=256m
     -XX:+UseG1GC -XX:MaxGCPauseMillis=200
     -Xlog:gc*:file=gc.log:time,uptime:filecount=5,filesize=20M
     -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/data/dump

# 线上 CPU 100%：top -Hp 找线程 → printf '%x' 转16进制 → jstack 找对应栈
# 频繁 Full GC / OOM：jstat -gcutil 1000 观察 → jmap -dump 或 -histo → MAT 分析支配树
```

OOM 五大原因背下来：堆内存泄漏（静态集合只进不出）、大对象（一次查全表）、Metaspace 膨胀（动态代理/热部署）、线程过多（栈内存合计）、Direct Buffer 未回收。

## 三、反射、注解与动态代理

```java
// 反射三件套：Class / Constructor / Method / Field
Class<?> clazz = Class.forName("com.demo.User");
User u = (User) clazz.getDeclaredConstructor().newInstance();
Field name = clazz.getDeclaredField("name");
name.setAccessible(true);                 // 绕过 private（模块化 JDK 对 JDK 内部类不再可行）
name.set(u, "alice");
```

反射是 Spring IoC 容器、MyBatis 结果映射、Jackson 序列化的共同底座；代价是性能（可缓存 Method 对象）与破坏封装。

**注解本质**：`@interface` + 保留策略（`RUNTIME` 才能被反射读到）+ 处理器。Spring 的每个注解背后都有一段扫描/解析代码，例如：

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface LogCost {
    String value() default "";
}
// 配合 AOP 环绕通知统计方法耗时——这就是"自定义注解 + AOP"经典面试题的最小实现
```

**动态代理**：JDK 代理基于接口（`Proxy.newProxyInstance` + `InvocationHandler`，生成 `$Proxy0`）；CGLIB 基于继承（生成子类，final 类/方法无解）。Spring 规则：目标有接口默认 JDK 代理（Boot 2.x 起默认改为 CGLIB 的 `proxyTargetClass=true`，因为更通用）。

## 四、Java 8 → 17 → 21 关键特性时间线

| 版本 | 特性 | 一句话 |
| --- | --- | --- |
| 8 | Lambda/Stream、Optional、接口 default 方法、`java.time` | 现代 Java 的起点 |
| 9 | 模块化 JPMS、`List.of()`、try-with-resources 增强 | 面试存在感低 |
| 10/11 | `var` 局部推断、`String.strip/isBlank/repeat`、HTTP Client 标准化 | 11 是继 8 后第一个 LTS |
| **17（LTS）** | **sealed 密封类、record（16）、instanceof 模式匹配、文本块** | Spring Boot 3 最低基线 |
| **21（LTS）** | **虚拟线程、switch 模式匹配、record 模式、顺序集合 SequencedCollection** | Spring Boot 4 推荐基线 |
| 25（LTS） | 结构化并发 GA、稳定 AOT/Project Leyden 方向 | Boot 4 前瞻适配 |

```java
// instanceof 模式匹配：不用再强转
if (obj instanceof String s && s.length() > 5) {
    System.out.println(s.toUpperCase());     // s 直接可用
}
// record 模式解构（Java 16+，21 完善）
record Point(int x, int y) {}
if (p instanceof Point(int x, int y) && x == y) { /* 直接拿到分量 */ }
// switch 类型模式（Java 21）
String desc = switch (obj) {
    case Integer i -> "int:" + i;
    case String s  -> "str:" + s;
    case null      -> "null";
    default        -> "other";
};
// sealed：限定继承者，配合 record 建模代数数据类型
public sealed interface Shape permits Circle, Square {}
```

## 五、本章面试高频清单

1. synchronized 锁升级过程；synchronized 与 ReentrantLock 区别。
2. volatile 两大语义；为什么不能保证原子性。
3. 线程池 7 参数、执行流程、如何合理设参、四种拒绝策略。
4. CAS 是什么？ABA 问题怎么解决（AtomicStampedReference）？
5. G1 与 CMS 区别；什么场景选 ZGC。
6. 双亲委派机制及如何打破。
7. 如何排查线上 CPU 飙高 / OOM（说清工具链）。
8. JDK 动态代理与 CGLIB 区别（这题同时是 Spring AOP 的前置）。
9. 虚拟线程解决什么问题、适用与不适用场景（新热点）。
