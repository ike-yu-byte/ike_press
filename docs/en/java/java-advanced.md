# Java Advanced: Concurrency, JVM & New Features

> What "solid Java fundamentals" really means in interviews: concurrency + JVM. The line between mid-level and senior offers is drawn almost entirely in this chapter.

## 1. Multithreading & Concurrency

### Creating threads and the lifecycle

```java
// Three styles, one essence: hand a Runnable to a Thread
Thread t1 = new Thread(() -> System.out.println("runnable style"));
t1.start();                                  // start(), NOT run()! run() executes inline on the caller

// Callable + Future: returns a value, can throw
ExecutorService pool = Executors.newSingleThreadExecutor();
Future<Integer> f = pool.submit(() -> queryRowCount());   // submit and keep working
Integer rows = f.get(3, TimeUnit.SECONDS);                // bounded wait
```

States: `NEW → RUNNABLE → (BLOCKED on monitor / WAITING / TIMED_WAITING) → TERMINATED`.

### The three properties & synchronized

Thread-safety bugs are failures of one of three guarantees: **atomicity, visibility, ordering**.

```java
// Broken counter: i++ is read-modify-write, not atomic
private int count;                     // lost updates under concurrency
public synchronized void inc() { count++; }   // option 1: lock

private AtomicInteger count2 = new AtomicInteger();
public void inc2() { count2.incrementAndGet(); } // option 2: CAS, lock-free (wins under low contention)
```

**What does synchronized lock?** The object's monitor, recorded in the Mark Word of the object header. Instance method → locks `this`; static method → locks the `Class` object; block → locks the parenthesized object — **locking the wrong object (e.g. a freshly created String) is the classic rookie bug**.

Java 6+ lock inflation: unbiased → lightweight (CAS spinning) → heavyweight (OS mutex). The interview phrasing: "the JVM doesn't jump to a kernel lock immediately; it escalates to reduce acquisition cost."

### volatile and the JMM

The JMM says each thread has working memory (an abstraction over caches/registers) while shared variables live in main memory — threads don't directly see each other's writes. That's the **visibility** problem.

`volatile` guarantees two things:

1. **Visibility**: writes flush to main memory, reads fetch from it (via memory barriers).
2. **No reordering across it**: the canonical use is the double-checked-locking singleton — `instance` must be volatile, otherwise other threads can observe "allocated but not constructed" objects.

`volatile` does **not** guarantee atomicity: `volatile int i; i++;` still loses updates.

### Thread pools (the most-asked question)

```java
// Alibaba manual: never Executors.newXxx — build ThreadPoolExecutor explicitly
ThreadPoolExecutor pool = new ThreadPoolExecutor(
        8,                                   // corePoolSize
        16,                                  // maximumPoolSize
        60L, TimeUnit.SECONDS,               // keep-alive for non-core threads
        new ArrayBlockingQueue<>(200),       // BOUNDED queue! LinkedBlockingQueue defaults are unbounded → OOM
        new ThreadFactoryBuilder().setNameFormat("order-pool-%d").build(), // named threads for debugging
        new ThreadPoolExecutor.CallerRunsPolicy()); // rejection: caller runs it (backpressure, no loss)

pool.execute(() -> handle(order));
// graceful shutdown
pool.shutdown();
if (!pool.awaitTermination(30, TimeUnit.SECONDS)) pool.shutdownNow();
```

Flow: core threads → queue → extra threads → rejection policy. Four policies: `Abort` (default, throws), `CallerRuns` (backpressure), `Discard`, `DiscardOldest`.

Sizing answer for interviews: **CPU-bound** N+1; **IO-bound** start at 2N then tune by load test; split pools for mixed workloads. The truly production-grade answer: expose metrics and tune parameters dynamically.

### Locks, AQS & concurrent tools

```java
ReentrantLock lock = new ReentrantLock();
lock.lock();
try {
    // critical section
} finally {
    lock.unlock();                  // MUST unlock in finally
}
```

- `ReentrantLock` over synchronized: interruptible (`lockInterruptibly`), timeout (`tryLock`), fairness, multiple `Condition`s.
- **AQS in one sentence**: a `volatile state` + CAS + FIFO deque that standardizes "park the losers in line" — ReentrantLock/Semaphore/CountDownLatch are all built on it.
- Tools: `CountDownLatch` (wait for N events), `CyclicBarrier` (N parties set off together, reusable), `Semaphore` (cap concurrency).

### Virtual threads (Java 21 — the hot 2026 topic)

```java
// Platform threads map 1:1 to OS threads and cap out in the thousands; virtual threads are M:N — millions
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    for (var url : urls) {
        executor.submit(() -> {
            var body = HttpClient.newHttpClient()
                    .send(HttpRequest.newBuilder(URI.create(url)).build(),
                          HttpResponse.BodyHandlers.ofString())
                    .body();                 // blocking unmounts the carrier thread instead of wasting an OS thread
            return body.length();
        });
    }
}   // close() awaits completion
```

Great for: massively concurrent **blocking IO** (HTTP calls, DB queries). Bad for: CPU-bound work and code holding `synchronized` across blocking calls (pins the carrier thread before JDK 24). Spring Boot 3.2+ opts in with `spring.threads.virtual.enabled=true`; Boot 4 goes further and defaults it on under Java 21+ — see [Spring Boot 3 vs 4](./spring-boot3-vs4).

## 2. JVM

### Runtime memory areas

| Area | Shared | Holds | Failure mode |
| --- | --- | --- | --- |
| Heap | shared | object instances (GC battleground) | `OutOfMemoryError: Java heap space` |
| Method area / Metaspace | shared | class metadata, constants (native memory since JDK 8) | `Metaspace` OOM |
| VM stack | per-thread | frames: locals, operand stack, return address | `StackOverflowError` / OOM |
| Native stack / PC counter | per-thread | native calls / current bytecode line | — |

Key Java 8 change: **PermGen replaced by Metaspace** (string pool & statics moved into the heap), ending the "just enlarge PermSize" era.

### Allocation, escape analysis & GC roots

- new: class-load check → allocate (pointer bump / free list) → zero-init → run constructor → **object header** (Mark Word + class pointer + padding).
- **Escape analysis**: objects that don't escape a method get scalar-replaced (never materialized on the heap) and their locks eliminated — this is the answer to "new doesn't always allocate on the heap".
- Reachability GC roots: VM stack refs, statics, constants, JNI refs, **live threads**. `System.gc()` is only a hint; disable it in production (`-XX:+DisableExplicitGC`).

### Collector evolution

| Collector | Traits | Position |
| --- | --- | --- |
| Serial / Parallel Scavenge | single/multi-thread, throughput, STW | Java 8 default |
| CMS | concurrent mark-sweep, low pause | fragmentation issues, removed in 14 |
| **G1** | region-based, pause target `-XX:MaxGCPauseMillis=200` | default since 9; general choice for big heaps |
| ZGC / Shenandoah | colored pointers / read barriers, <1ms pauses regardless of heap | ZGC production-ready since 15; generational ZGC in 21+ |

G1 phrasing: heap split into ≤2048 regions with logical Eden/Survivor/Old; remembered sets avoid whole-heap scans; collection picks the regions with the most garbage first, honoring the pause model (hence "Garbage First").

### Class loading & delegation

Phases: **loading → verification → preparation (statics zero-valued) → resolution → initialization (`<clinit>`)**.

Parent delegation: App → Platform → Bootstrap; loaders delegate upward first and only self-load if the parent can't. Why: core classes can't be hijacked (your own `java.lang.String` is never picked) and no duplicate loads. **Known breaks**: SPI (DriverManager uses the thread-context loader), Tomcat per-webapp isolation, OSGi.

### Tuning & troubleshooting toolkit (résumé material)

```bash
# Common flags
java -Xms4g -Xmx4g                      # equal initial/max heap avoids resize jitter
     -XX:MetaspaceSize=256m
     -XX:+UseG1GC -XX:MaxGCPauseMillis=200
     -Xlog:gc*:file=gc.log:time,uptime:filecount=5,filesize=20M
     -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/data/dump

# CPU pegged: top -Hp to find the thread → printf '%x' → match in jstack
# Frequent Full GC / OOM: jstat -gcutil 1000 → jmap -dump (or -histo) → dominate tree in MAT
```

Memorize the five OOM causes: heap leaks (static collections that only grow), giant objects (select-all queries), Metaspace bloat (dynamic proxies / hot reload), too many threads (stack memory adds up), unreleased Direct Buffers.

## 3. Reflection, Annotations & Proxies

```java
// Reflection quartet: Class / Constructor / Method / Field
Class<?> clazz = Class.forName("com.demo.User");
User u = (User) clazz.getDeclaredConstructor().newInstance();
Field name = clazz.getDeclaredField("name");
name.setAccessible(true);                 // bypass private (no longer works on JDK internals under modules)
name.set(u, "alice");
```

Reflection underpins the Spring container, MyBatis mapping and Jackson; costs: performance (cache the Method objects) and broken encapsulation.

**Annotations are just `@interface` + retention (`RUNTIME` to be reflection-visible) + a processor.** Every Spring annotation has scanning/parsing code behind it. Example:

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface LogCost {
    String value() default "";
}
// Pair it with an AOP around-advice to time methods — the classic "custom annotation + AOP" interview task
```

**Dynamic proxies**: JDK proxy requires interfaces (`Proxy.newProxyInstance` + `InvocationHandler`, generates `$Proxy0`); CGLIB subclasses the target (final classes/methods defeat it). Spring's rule: interface present → JDK proxy by default in framework, but Boot switched to CGLIB (`proxyTargetClass=true`) as the general default.

## 4. Java 8 → 17 → 21 Feature Timeline

| Version | Features | In one line |
| --- | --- | --- |
| 8 | Lambdas/Streams, Optional, default methods, `java.time` | Where modern Java starts |
| 9 | Modules (JPMS), `List.of()` | Low interview presence |
| 10/11 | `var`, `String.strip/isBlank/repeat`, standard HTTP Client | 11 = first LTS after 8 |
| **17 (LTS)** | **sealed types, records (16), instanceof patterns, text blocks** | Boot 3's baseline |
| **21 (LTS)** | **virtual threads, pattern matching for switch, record patterns, SequencedCollection** | Boot 4's recommended baseline |
| 25 (LTS) | structured concurrency GA, AOT/Project Leyden direction | Boot 4's forward-looking target |

```java
// instanceof pattern: no cast line needed
if (obj instanceof String s && s.length() > 5) {
    System.out.println(s.toUpperCase());     // s in scope
}
// record deconstruction (16+, refined in 21)
record Point(int x, int y) {}
if (p instanceof Point(int x, int y) && x == y) { /* components bound */ }
// switch patterns (Java 21)
String desc = switch (obj) {
    case Integer i -> "int:" + i;
    case String s  -> "str:" + s;
    case null      -> "null";
    default        -> "other";
};
// sealed: constrained hierarchy, algebraic-data-style modeling
public sealed interface Shape permits Circle, Square {}
```

## 5. Chapter interview checklist

1. synchronized lock inflation; synchronized vs ReentrantLock.
2. volatile's two guarantees; why it can't make `i++` atomic.
3. Thread pool's 7 parameters, execution flow, sizing, four rejection policies.
4. What is CAS? The ABA problem and `AtomicStampedReference`.
5. G1 vs CMS; when to pick ZGC.
6. Parent delegation and how to break it.
7. How do you diagnose high CPU / OOM in production (name the tools).
8. JDK proxy vs CGLIB (also the Spring AOP prerequisite).
9. What problem do virtual threads solve; where they don't help (the new hot one).
