# Java Basics

> The foundation of everything. Written-test multiple choice, coding questions, and every framework you'll learn later all build on this chapter. Organized around a dual goal: *write correct code* + *answer basic interview questions*.

## 1. Data Types & Operators

### The 8 primitive types

| Type | Bytes | Default | Wrapper | Notes |
| --- | --- | --- | --- | --- |
| `byte` | 1 | 0 | Byte | -128 to 127 |
| `short` | 2 | 0 | Short | Rarely used in practice |
| `int` | 4 | 0 | Integer | Default integer type, ±~2.1 billion |
| `long` | 8 | 0L | Long | Literal needs `L`: `long v = 100000L;` |
| `float` | 4 | 0.0f | Float | Literal needs `f`; 6-7 significant digits |
| `double` | 8 | 0.0d | Double | Default decimal type |
| `char` | 2 | '\u0000' | Character | UTF-16 code unit |
| `boolean` | 1 (JVM-dependent) | false | Boolean | No 0/1 substitutes in Java |

**Three classic interview traps**:

1. **Autoboxing cache**: `Integer a = 127, b = 127; a == b` is `true`; with 128 it's `false`. The Integer cache covers -128..127 — always compare wrappers with `equals()`.
2. **Floating point precision**: `0.1 + 0.2 == 0.3` is `false` (0.1 has no exact binary form). Use `BigDecimal` for money, built **from a string**:

```java
// Wrong: new BigDecimal(0.1) actually stores 0.1000000000000000055511151231257827021181583404541015625
BigDecimal bad = new BigDecimal(0.1);
// Right: string constructor or valueOf
BigDecimal price = new BigDecimal("19.90");
BigDecimal qty = new BigDecimal("3");
BigDecimal total = price.multiply(qty);              // 59.70
BigDecimal avg = total.divide(new BigDecimal("4"), 2, RoundingMode.HALF_UP); // division needs scale + rounding
```

3. **Integer overflow**: `int * int` silently wraps. Cast first for aggregations: `long total = (long) price * count;`

### Operator details

- `&` / `|` on booleans don't short-circuit; `&&` / `||` do. Prefer the short-circuiting forms.
- `%` takes the sign of the dividend: `-7 % 2 == -1`.
- `i = i++` is a classic trick question: i increments then gets overwritten by the saved old value — unchanged.
- Shifts: `<<` multiplies by 2, `>>` sign-extending right shift, `>>>` zero-fill right shift.

## 2. Control Flow & Methods

```java
public class Methods {
    // Varargs: really an array, must be the last parameter
    public static int sum(int base, int... nums) {
        int total = base;
        for (int n : nums) total += n;
        return total;
    }

    public static void main(String[] args) {
        System.out.println(sum(1, 2, 3, 4)); // 10

        // Modern switch (Java 14+): expression form, no fall-through surprises
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

- Java has no default parameter values — simulate with **overloading**.
- Java is strictly pass-by-value (for objects, a *copy of the reference* is passed), so `void f(Student s) { s = new Student(); }` does not affect the caller's variable.

## 3. OOP: Encapsulation, Inheritance, Polymorphism

### Stating the three pillars precisely

- **Encapsulation**: private fields + getter/setter control, hiding implementation details.
- **Inheritance**: single class inheritance via `extends` (interfaces can extend many). Purpose: reuse + a type hierarchy.
- **Polymorphism**: a superclass reference pointing at a subclass object; the runtime picks the overridden method. **Overriding (runtime) produces polymorphism; overloading is compile-time and is NOT polymorphism** — a common point-loser.

```java
class Animal {
    String name = "animal";
    public void shout() { System.out.println("..."); }
    public static void stat() { System.out.println("animal stat"); }
}
class Dog extends Animal {
    String name = "dog";                       // fields don't participate in polymorphism!
    @Override
    public void shout() { System.out.println("wang"); }
    public static void stat() { System.out.println("dog stat"); } // hiding, not overriding
}
public class Poly {
    public static void main(String[] args) {
        Animal a = new Dog();
        a.shout();                  // wang — methods dispatch on the actual type
        System.out.println(a.name); // animal — fields bind to the declared type!
        Animal.stat();              // animal stat — static methods bind to the class
    }
}
```

### this / super / static / final

- `this()` calls another constructor of the same class and must be the first statement; `super()` calls the parent constructor — if you don't write it, the compiler inserts a **no-arg** `super()`, which fails to compile when the parent lacks one.
- `static` members belong to the class, initialized once at class load; static methods cannot touch instance members or use `this`.
- `final`: class can't be extended (String), method can't be overridden, variable can't be reassigned (for reference types, final locks the reference, not the contents).

### Abstract class vs interface (guaranteed question)

| Dimension | Abstract class | Interface |
| --- | --- | --- |
| How many | one | many |
| Members | any fields/methods | fields must be `public static final`; methods default `public abstract` |
| Default methods | — | `default` / `static` (Java 8+), private (Java 9+) |
| Semantics | "is-a", shares state and code | "can-do", a capability contract |
| Constructor | yes | no |

Rule of thumb: capability → interface; shared fields/code among implementations → abstract class. The JDK convention is "interface + AbstractXxx skeleton implementation".

### Enums and records

```java
public enum OrderStatus {
    CREATED(0, "Created"), PAID(1, "Paid"), SHIPPED(2, "Shipped"), CLOSED(9, "Closed");

    private final int code;
    private final String label;
    OrderStatus(int code, String label) { this.code = code; this.label = label; }
    public int getCode() { return code; }

    public static OrderStatus of(int code) {
        for (OrderStatus s : values()) if (s.code == code) return s;
        throw new IllegalArgumentException("unknown code " + code);
    }
}

// Java 16+: immutable data carriers
public record Point(int x, int y) {
    public Point {                       // compact constructor for validation
        if (x < 0 || y < 0) throw new IllegalArgumentException("negative");
    }
}
// generates: canonical constructor, x() y() accessors, equals/hashCode/toString
```

The enum singleton is Effective Java's safest singleton idiom (immune to reflection and deserialization attacks).

## 4. The Exception Hierarchy

```
Throwable
├── Error                // OOM, StackOverflow — applications shouldn't catch these
└── Exception
    ├── RuntimeException // unchecked: NPE, index OOB, ClassCastException, IllegalArgumentException
    └── others           // checked: IOException, SQLException — compiler forces handle-or-declare
```

Best practices (also the prerequisite for Boot's global exception handling):

```java
// Business exception: extend RuntimeException, carry an error code
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
        throw new BizException(40001, "Order status does not allow payment");
    }
    ...
}
```

- Never `return` in `finally` (it swallows exceptions); use try-with-resources since Java 7: `try (var in = new FileInputStream(f)) { ... }`.
- Handle or log every caught exception — **empty catch blocks are forbidden**; don't catch-all and print only `e.getMessage()` (the stack is lost; use `log.error("failed", e)`).

## 5. Generics & the Collections Framework

### The generic trio

```java
// Bounded generic method — PECS: Producer Extends, Consumer Super
public static <T extends Comparable<T>> T max(List<T> list) {
    T best = list.get(0);
    for (T t : list) if (t.compareTo(best) > 0) best = t;
    return best;
}

List<? extends Number> ro = new ArrayList<Integer>(); // read-only
List<? super Integer> wo = new ArrayList<Number>();   // write-only (Integer)
```

- Generics are **erased at compile time**; you can't get `T` at runtime — `new T[]` and `T.class` are illegal.
- That's why deserialization needs an explicit `Class<T>` (Jackson's `TypeReference` exists for this).

### Collections overview

```
Collection
├── List   — ArrayList (dynamic array) / LinkedList (doubly-linked) / CopyOnWriteArrayList (concurrent)
├── Set    — HashSet / LinkedHashSet (insertion order) / TreeSet (sorted) / CopyOnWriteArraySet
└── Queue  — ArrayDeque (use it as both stack and queue) / PriorityQueue / BlockingQueue (concurrent)
Map        — HashMap / LinkedHashMap / TreeMap / ConcurrentHashMap / Hashtable (legacy)
```

**ArrayList vs LinkedList**: use ArrayList for access and iteration; despite its theoretical O(1) head insert, LinkedList loses in practice due to cache behavior. Pre-size with `new ArrayList<>(expectedSize)`.

**HashMap internals (interview Top 1)**:

- Structure: array + linked list + red-black tree (Java 8+). Put flow: `hash & (n-1)` picks the bucket → empty bucket: place → collision: tail-append → treeify when a chain hits 8 **and** table length ≥ 64 → resize ×2 past `capacity × 0.75`.
- Capacity is always a power of two so `hash & (n-1)` behaves like modulo with even distribution.
- Thread-safety: concurrent puts overwrite each other; Java 7's head-insertion could form **circular chains causing infinite loops during resize** (fixed by tail-insertion in 8, but lost updates remain). Use `ConcurrentHashMap` for concurrency: Java 8+ locks only the bucket head node via `CAS + synchronized` — per-bucket granularity.
- A null key is allowed (exactly one) but discouraged; custom keys must override both `equals` and `hashCode` (contract: equal ⇒ same hashCode).

### Everyday collection idioms

```java
List<String> names = new ArrayList<>(List.of("alice", "bob", "alice"));
Set<String> unique = new LinkedHashSet<>(names);          // dedupe, keep order
Map<String, Integer> count = new HashMap<>();
for (String n : names) count.merge(n, 1, Integer::sum);   // {alice=2, bob=1}
Map<Character, List<String>> byFirst = new HashMap<>();
for (String n : names) byFirst.computeIfAbsent(n.charAt(0), k -> new ArrayList<>()).add(n);
list.sort(Comparator.comparing(Order::getAmount).thenComparing(Order::getId)); // multi-key sort
```

## 6. Strings

- `String` is immutable (internal `byte[]` + final): cacheable (string pool), safe as map keys, inherently thread-safe.
- `s1 = "abc"; s2 = "abc";` → `s1 == s2` is true (pool reuse); `new String("abc")` always creates a new object.
- **`+` inside a loop compiles to a new StringBuilder per iteration** — reuse one explicitly when concatenating in loops.
- Blank checks: `s == null || s.isEmpty()`, or `StringUtils.isBlank()` (commons-lang3) / `StringUtils.hasText` (Spring).

```java
StringBuilder sb = new StringBuilder();
for (String part : parts) {
    if (!sb.isEmpty()) sb.append(',');
    sb.append(part);
}
String joined = sb.toString();
String joined2 = String.join(",", parts);   // one-liner since Java 8
```

## 7. IO, NIO & Serialization in Brief

- **BIO**: `InputStream/Reader` family; four byte/char abstractions `InputStream/OutputStream/Reader/Writer`. Decorator pattern: `new BufferedReader(new InputStreamReader(new FileInputStream(f), StandardCharsets.UTF_8))`.
- **NIO**: Channel + Buffer + Selector — single-thread multiplexing, the foundation of Netty.
- **Practical**: small files `Files.readString(path)` (Java 11+); streaming `Files.lines(path)` (keep it in try-with-resources).
- Prefer JSON (Jackson/Gson) or protobuf for serialization; **avoid native Java serialization** (a security hotspot, zero cross-language support).

## 8. Lambdas & the Stream API

```java
List<Employee> staff = ...;
List<String> seniorNames = staff.stream()
        .filter(e -> e.getAge() > 30)
        .sorted(Comparator.comparing(Employee::getSalary).reversed())
        .map(Employee::getName)
        .toList();                       // Java 16+ immutable collect

Map<Dept, List<Employee>> byDept = staff.stream().collect(Collectors.groupingBy(Employee::getDept));
Map<Dept, Double> avgSalary = staff.stream()
        .collect(Collectors.groupingBy(Employee::getDept,
                 Collectors.averagingDouble(Employee::getSalary)));

// Optional chaining instead of nested ifs
String city = Optional.ofNullable(user)
        .map(User::getAddress)
        .map(Address::getCity)
        .orElse("Unknown");
```

Stream caveats:

- `parallelStream` shares the JVM-global `ForkJoinPool` — avoid in web apps (one blocking task poisons everyone).
- A stream is consumed once; pass `Collection`s around, not `Stream`s.
- `orElse` always evaluates; use `orElseGet(() -> buildDefault())` when the default is expensive.

## 9. Chapter interview checklist

1. `==` vs `equals`; why must hashCode be overridden with equals?
2. Why is String immutable? How does StringBuilder grow?
3. HashMap put flow, resizing, treeification; Java 7 vs 8 differences.
4. ArrayList growth: 1.5× (`old + (old >> 1)`).
5. Interface vs abstract class; what problem do default methods solve?
6. Checked vs unchecked exceptions; what happens if finally returns?
7. What is type erasure? The PECS principle?
8. `List.of()` vs `new ArrayList<>()` (immutable vs mutable).
