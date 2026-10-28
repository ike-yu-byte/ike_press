# Java 基础入门

> 一切的地基。面试笔试的选择题、编程题，以及后面所有框架学习，都建立在这一章之上。按"能写正确代码 + 能答出基础面试题"双目标组织。

## 一、数据类型与运算符

### 8 种基本类型

| 类型 | 字节 | 默认值 | 包装类 | 备注 |
| --- | --- | --- | --- | --- |
| `byte` | 1 | 0 | Byte | -128 ~ 127 |
| `short` | 2 | 0 | Short | 实际很少用 |
| `int` | 4 | 0 | Integer | 整数默认类型，-2³¹ ~ 2³¹-1（约 ±21 亿） |
| `long` | 8 | 0L | Long | 字面量要加 `L`：`long v = 100000L;` |
| `float` | 4 | 0.0f | Float | 字面量加 `f`，精度 6-7 位有效数字 |
| `double` | 8 | 0.0d | Double | 小数默认类型 |
| `char` | 2 | '\u0000' | Character | UTF-16 码元，可存一个汉字 |
| `boolean` | 1（JVM 实现相关） | false | Boolean | 不能用 0/1 代替 |

**面试必考三个坑**：

1. **自动装箱缓存**：`Integer a = 127, b = 127; a == b` 为 `true`；换成 128 就是 `false`。Integer 缓存池默认 -128~127，比较包装类型永远用 `equals()`。
2. **浮点数精度**：`0.1 + 0.2 == 0.3` 为 `false`（二进制无法精确表示 0.1）。金额计算用 `BigDecimal`，且必须用**字符串构造**：

```java
// 错误：new BigDecimal(0.1) 拿到的是 0.1000000000000000055511151231257827021181583404541015625
BigDecimal bad = new BigDecimal(0.1);
// 正确：字符串构造或 valueOf
BigDecimal price = new BigDecimal("19.90");
BigDecimal qty = new BigDecimal("3");
BigDecimal total = price.multiply(qty);              // 59.70
BigDecimal avg = total.divide(new BigDecimal("4"), 2, RoundingMode.HALF_UP); // 除不尽必须指定精度与舍入
```

3. **整数溢出**：`int * int` 超界静默回绕，统计类乘法先转 `long`：`long total = (long) price * count;`

### 运算符细节

- `&`、`|` 用于布尔时不短路；`&&`、`||` 短路。判断链中永远优先 `&&`/`||`。
- `%` 结果符号跟随被除数：`-7 % 2 == -1`。
- `i = i++` 是经典笔试题：i 先自增再被旧值覆盖，结果不变。
- 移位：`<<` 左移乘 2，`>>` 有符号右移，`>>>` 无符号右移。

## 二、流程控制与方法

```java
public class Methods {
    // 可变参数：本质是数组，只能是最后一个参数
    public static int sum(int base, int... nums) {
        int total = base;
        for (int n : nums) total += n;
        return total;
    }

    public static void main(String[] args) {
        System.out.println(sum(1, 2, 3, 4)); // 10

        // 增强 switch（Java 14+）：表达式形式、无穿透问题
        String day = "MON";
        int workHours = switch (day) {
            case "MON", "TUE", "WED", "THU", "FRI" -> 8;
            case "SAT", "SUN" -> 0;
            default -> throw new IllegalArgumentException("bad day: " + day);
        };
        System.out.println(workHours); // 8
    }
}
```

- Java 没有默认参数值，用**方法重载**模拟。
- Java 只有值传递（对象传的是"引用的副本"），`void f(Student s) { s = new Student(); }` 不影响外部变量。

## 三、面向对象：封装、继承、多态

### 三大特性的准确表述

- **封装**：字段私有化 + getter/setter 控制访问，隐藏实现细节。
- **继承**：`extends` 单继承（类只能继承一个类，接口可以多实现）。继承的目的：复用 + 建立类型体系。
- **多态**：父类引用指向子类对象，运行时根据实际类型选择方法（**方法重写 override 产生运行时多态；方法重载 overload 是编译期行为，不算多态**——这是常见扣分点）。

```java
class Animal {
    String name = "animal";
    public void shout() { System.out.println("..."); }
    public static void stat() { System.out.println("animal stat"); }
}
class Dog extends Animal {
    String name = "dog";                       // 字段不参与多态！
    @Override
    public void shout() { System.out.println("wang"); }
    public static void stat() { System.out.println("dog stat"); } // 隐藏而非重写
}
public class Poly {
    public static void main(String[] args) {
        Animal a = new Dog();
        a.shout();               // wang —— 方法看实际类型（重写→运行时多态）
        System.out.println(a.name); // animal —— 字段看声明类型！
        Animal.stat();           // animal stat —— 静态方法与类绑定
    }
}
```

### this / super / static / final

- `this()` 调用本类其他构造器，必须是首行；`super()` 调用父类构造器，子类构造器若不写则隐式调用**无参** `super()`——父类没有无参构造时会编译报错。
- `static` 成员属于类，随类加载初始化一次；静态方法不能访问实例成员、不能用 `this`。
- `final`：修饰类不可继承（String）、方法不可重写、变量不可重新赋值（引用类型的 final 只锁引用不锁内容）。

### 抽象类 vs 接口（必考）

| 维度 | 抽象类 | 接口 |
| --- | --- | --- |
| 继承数量 | 单继承 | 多实现 |
| 成员 | 任意字段/方法 | 字段只能 `public static final`；方法默认 `public abstract` |
| 默认方法 | — | `default` / `static` 方法（Java 8+），私有方法（Java 9+） |
| 语义 | "is-a"，抽取子类共性（含状态） | "can-do"，定义能力契约 |
| 构造器 | 有 | 无 |

经验法则：定义能力用接口，多个实现共享字段和代码用抽象类；JDK 源码惯例是"接口 + AbstractXxx 骨架实现类"。

### 枚举与 record

```java
public enum OrderStatus {
    CREATED(0, "待支付"), PAID(1, "已支付"), SHIPPED(2, "已发货"), CLOSED(9, "已关闭");

    private final int code;
    private final String label;
    OrderStatus(int code, String label) { this.code = code; this.label = label; }
    public int getCode() { return code; }

    public static OrderStatus of(int code) {
        for (OrderStatus s : values()) if (s.code == code) return s;
        throw new IllegalArgumentException("unknown code " + code);
    }
}

// Java 16+：不可变数据载体，替代 Lombok @Value 场景
public record Point(int x, int y) {
    public Point {                       // 紧凑构造器做校验
        if (x < 0 || y < 0) throw new IllegalArgumentException("negative");
    }
}
// 自动生成：全参构造、x() y() 访问器、equals/hashCode/toString
```

枚举单例是《Effective Java》推荐的最安全单例写法（天然防反射和反序列化攻击）。

## 四、异常体系

```
Throwable
├── Error                // OOM、StackOverflow —— 应用不该捕获
└── Exception
    ├── RuntimeException // 非受检：NPE、数组越界、ClassCastException、IllegalArgumentException
    └── 其他              // 受检：IOException、SQLException —— 编译器强制 try-catch 或 throws
```

最佳实践（也是 Spring Boot 全局异常处理的前置知识）：

```java
// 业务异常：继承 RuntimeException，配合错误码
public class BizException extends RuntimeException {
    private final int code;
    public BizException(int code, String message) {
        super(message);
        this.code = code;
    }
    public int getCode() { return code; }
}

public Order pay(Long id) {
    Order o = find(id);
    if (o.getStatus() != OrderStatus.CREATED) {
        throw new BizException(40001, "订单状态不允许支付");
    }
    ...
}
```

- `finally` 中不要 `return`（会吞掉异常）；JDK 7+ 用 try-with-resources 自动关流：`try (var in = new FileInputStream(f)) { ... }`。
- 捕获异常必须处理或记录，**禁止空 catch**；不要用一个 catch 兜住所有 Exception 还只打印 `e.getMessage()`（丢失堆栈，应 `log.error("xx失败", e)`）。

## 五、泛型与集合框架

### 泛型三件套

```java
// 泛型方法：读多写少用 ? extends（PECS 原则：Producer Extends, Consumer Super）
public static <T extends Comparable<T>> T max(List<T> list) {
    T best = list.get(0);
    for (T t : list) if (t.compareTo(best) > 0) best = t;
    return best;
}

List<? extends Number> ro = new ArrayList<Integer>(); // 只能读，不能 add
List<? super Integer> wo = new ArrayList<Number>();   // 只能写 Integer
```

- 泛型是**编译期**擦除机制，运行时拿不到 `T`；`new T[]`、`T.class` 都不合法。
- 因此集合判空、反序列化都需要传 `Class<T>`（Jackson 的 `TypeReference` 就是为此存在）。

### 集合框架总览

```
Collection
├── List   —— ArrayList（动态数组）/ LinkedList（双向链表）/ CopyOnWriteArrayList（并发）
├── Set    —— HashSet / LinkedHashSet（保序）/ TreeSet（排序）/ CopyOnWriteArraySet
└── Queue  —— ArrayDeque（当栈和队列都用它）/ PriorityQueue / BlockingQueue（并发）
Map        —— HashMap / LinkedHashMap / TreeMap / ConcurrentHashMap / Hashtable(过时)
```

**ArrayList vs LinkedList**：随机访问和遍历用 ArrayList；LinkedList 虽理论上头部插入 O(1)，但实测因缓存不友好几乎全面落后，日常场景 `new ArrayList<>(expectedSize)` 预扩容即可。

**HashMap 核心（面试 Top 1）**：

- 结构：数组 + 链表 + 红黑树（JDK 8+）。put 流程：计算 `hash & (n-1)` 定位桶 → 桶空直接放 → 冲突则尾插链表 → 链表长度 ≥8 且数组长度 ≥64 时树化 → 超过 `容量 × 0.75` 扩容为 2 倍。
- 容量永远是 2 的幂：让 `hash & (n-1)` 等价取模且分布均匀。
- 线程不安全的体现：多线程 put 会互相覆盖；JDK 7 头插法在并发扩容时会形成**环形链表导致死循环**（8 改为尾插修掉了死循环，但数据覆盖问题仍在）。并发场景用 `ConcurrentHashMap`：JDK 8 后采用 `CAS + synchronized 锁单个桶头节点`，粒度细到数组元素级别。
- key 可以为 null（只有一个），但**强烈不建议**；自定义对象做 key 必须同时正确重写 `equals` 和 `hashCode`（约定：equals 相等 ⇒ hashCode 相等）。

### 常用集合操作

```java
List<String> names = new ArrayList<>(List.of("alice", "bob", "alice"));
// 去重保序
Set<String> unique = new LinkedHashSet<>(names);
// Map 惯用法
Map<String, Integer> count = new HashMap<>();
for (String n : names) count.merge(n, 1, Integer::sum);   // {alice=2, bob=1}
// computeIfAbsent 分组
Map<Character, List<String>> byFirst = new HashMap<>();
for (String n : names) byFirst.computeIfAbsent(n.charAt(0), k -> new ArrayList<>()).add(n);
// 排序：多条件
list.sort(Comparator.comparing(Order::getAmount).thenComparing(Order::getId));
```

## 六、字符串

- `String` 不可变（内部 `byte[]` + `final`），好处：可缓存（字符串常量池）、安全做 HashMap key、天然线程安全。
- `s1 = "abc"; s2 = "abc";` `s1 == s2` 为 true（常量池复用）；`new String("abc")` 一定新建对象。
- **`+` 拼接在循环里会被编译成每轮 new StringBuilder**——循环拼接必须手动复用 `StringBuilder`。
- 判空用 `s == null || s.isEmpty()`，或引入 `StringUtils.isBlank()`（commons-lang3 / Spring 的 `StringUtils.hasText`）。

```java
StringBuilder sb = new StringBuilder();
for (String part : parts) {
    if (!sb.isEmpty()) sb.append(',');
    sb.append(part);
}
String joined = sb.toString();
// Java 8+ 一行版：
String joined2 = String.join(",", parts);
```

## 七、IO、NIO 与序列化速览

- **BIO**：`InputStream/Reader` 家族，字节流 4 大抽象类 `InputStream/OutputStream/Reader/Writer`。装饰器模式：`new BufferedReader(new InputStreamReader(new FileInputStream(f), StandardCharsets.UTF_8))`。
- **NIO**：Channel + Buffer + Selector，单线程轮询多路复用，Netty 的底座。
- **实用姿势**：读小文件用 `Files.readString(path)`（Java 11+）、按行流式读用 `Files.lines(path)`（记得 try-with-resources）。
- 序列化首选 JSON（Jackson/Gson）或业务协议（protobuf），**不要用 Java 原生 Serializable**（安全漏洞重灾区、跨语言性为零）。

## 八、Lambda 与 Stream API

```java
List<Employee> staff = ...;
// 过滤 + 转换 + 收集
List<String> seniorNames = staff.stream()
        .filter(e -> e.getAge() > 30)
        .sorted(Comparator.comparing(Employee::getSalary).reversed())
        .map(Employee::getName)
        .toList();                       // Java 16+ 不可变收集，替代 collect(Collectors.toList())

// 分组与统计
Map<Dept, List<Employee>> byDept = staff.stream().collect(Collectors.groupingBy(Employee::getDept));
Map<Dept, Double> avgSalary = staff.stream()
        .collect(Collectors.groupingBy(Employee::getDept,
                 Collectors.averagingDouble(Employee::getSalary)));

// Optional 正确姿势：链式取值，避免 if 套娃
String city = Optional.ofNullable(user)
        .map(User::getAddress)
        .map(Address::getCity)
        .orElse("未知城市");
```

Stream 注意事项：

- `parallelStream` 共用 JVM 全局 `ForkJoinPool`，Web 应用中慎用（一处阻塞全应用受害）。
- 流只能消费一次，`Stream` 不要作为方法参数/字段传递，传 `Collection` 进去再开流。
- `orElse` 总会执行、`orElseGet` 惰性——默认值有计算成本时用 `orElseGet(() -> buildDefault())`。

## 九、本章面试高频清单

1. `==` 与 `equals` 区别；为什么重写 equals 必须重写 hashCode？
2. String 为什么不可变？StringBuilder 扩容机制？
3. HashMap put 流程、扩容、树化条件；JDK 7/8 区别。
4. ArrayList 扩容：1.5 倍（`old + (old >> 1)`）。
5. 接口与抽象类如何选择？default 方法解决了什么问题？
6. 受检 vs 非受检异常；finally 里有 return 会怎样？
7. 泛型擦除是什么？PECS 原则？
8. `List.of()` 与 `new ArrayList<>()` 区别（不可变 vs 可变）。
