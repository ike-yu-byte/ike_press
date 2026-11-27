# Python 基础入门

> 第 1 站：语言基础。目标不是"看完语法书"，而是能独立写正确的脚本。本章按"概念 + 高频坑 + 小练习"组织，坑的部分是面试与实战的真正考点。
>
> **阅读方式**：每个 Python 知识点后都紧跟 **JS 对照**，用你熟悉的前端语言做锚点，先对照再记差异。

## 一、起步认知

- **解释型 + 动态类型**：变量是"名字的标签"，不是"装值的盒子"——`a = 1; a = "x"` 合法，因为 `a` 只是贴到不同对象上的标签。这一条想通了，后面 80% 的 Python 怪现象都能解释。
- **缩进即语法**：4 空格是约定（PEP 8），混用 Tab/空格直接报 `IndentationError`。
- **一切皆对象**：数字、函数、类都是对象，都能赋值、传参、当返回值——这是 Python 表达力（和坑）的根源。
- 运行方式：`python script.py` 脚本执行；`python -i script.py` 跑完进交互；Jupyter Notebook 做数据探索（第 4 站会大量用）。

**JS 对照：**

| 维度 | Python | JavaScript |
| --- | --- | --- |
| 类型 | 动态 + 运行期绑定 | 动态 + 运行期绑定（TS 加静态层） |
| 代码块 | 缩进（4 空格） | `{}` 大括号 |
| 运行 | `python script.py` | `node script.js` |
| 函数是一等公民 | 是 | 是 |
| 包管理 | `pip` / `uv` | `npm` / `pnpm` |

## 二、变量与基本类型

<CodeCompare>

<template #python>

```python
# 数值
n = 42
# int：任意精度，不会像 Java 那样溢出
pi = 3.14
# float：IEEE 754 双精度
big = 10 ** 100
# 完全合法，Python int 自动扩位

# 经典坑 1：浮点精度
0.1 + 0.2 == 0.3
# False！要精确比较用 math.isclose() 或 decimal.Decimal
# 经典坑 2：整数除法
7 / 2
# 3.5（真除返回 float）
7 // 2
# 3（地板除，向负无穷取整：-7 // 2 == -4）
7 % 2
# 1（取模符号跟随除数）

# 字符串：不可变序列
s = "Hello, Python"
s[0]
# 'H'
s[-1]
# 'n' 负索引从尾部数
s[7:13]
# 'Python' 切片：左闭右开，越界不报错
s.upper()
# 返回新串，s 本身不变——"字符串不可变"
",".join(["a", "b"])
# 'a,b' 拼接大量字符串用 join，别用 + 循环（O(n²) vs O(n)）

# f-string（3.6+，字符串格式化的唯一推荐姿势）
name, score = "小明", 92.5
print(f"{name} 得分 {score:.1f}, 进度 {25.4%}")
# 支持表达式与格式说明符

# 布尔与 None
bool(0), bool(""), bool([])
# False False False —— 空值/零值都是 False
x = None
# None 是单例，判断用 x is None，不用 x == None
```

</template>

<template #js>

```js
const n = 42;
const pi = 3.14;
const big = 10n ** 100n;
// BigInt：JS 数字会溢出，要显式用 bigint

0.1 + 0.2 === 0.3;
// false，一样有浮点精度坑
Math.abs((0.1 + 0.2) - 0.3) < Number.EPSILON;
// 近似比较

7 / 2;
// 3.5，JS 没有
// 地板除
Math.floor(7 / 2);
// 3
7 % 2;
// 1

const s = "Hello, Python";
s[0];
// 'H'
s.at(-1);
// 'n'，ES2022 才支持负索引
s.slice(7, 13);
// 'Python'
s.toUpperCase();
// 新串，原串不变
["a", "b"].join(",");
// 'a,b'

const name = "小明", score = 92.5;
console.log(`${name} 得分 ${score.toFixed(1)}, 进度 25.4%`);
// 模板字符串 ≈ f-string

Boolean(0), Boolean(""), Boolean([]);
// false false true！JS 里空数组是 truthy
let x = null;
// 判断用 x === null
```

</template>

</CodeCompare>

> **最容易踩的差异**：Python `bool([])` 是 `False`，JS `Boolean([])` 是 `true`。JS 里只有 `null`/`undefined`/`false`/`0`/`NaN`/`""` 是 falsy，空数组和空对象都是 truthy。

**可变 vs 不可变（面试必考）**：

| 不可变 | 可变 |
| --- | --- |
| int / float / str / tuple / frozenset / bool | list / dict / set / bytearray / 自定义类实例 |

**定义**：这里说的是**对象本身能否原地修改**，不是变量名能否重新赋值。不可变对象（如 `str`）的“修改”其实是新建对象；可变对象（如 `list`）则原地变化，变量名仍指向同一个对象。用 `id()` 判断：前后不变是可变，变了是不可变。

<CodeCompare>

<template #python>

```python
a = [1, 2, 3]
b = a
# 不是复制！b 和 a 指向同一个 list
b.append(4)
print(a)
# [1, 2, 3, 4] —— "传引用"错觉的万恶之源
c = a.copy()
# 浅拷贝：一层独立
import copy
d = copy.deepcopy(a)
# 深拷贝：嵌套对象也复制

# 经典坑：可变默认参数（函数只求值一次！）
def bad(item, box=[]):
# ← 错：所有调用共享同一个 list
    box.append(item)
    return box
def good(item, box=None):
# ← 对：哨兵模式
    if box is None:
        box = []
    box.append(item)
    return box
```

</template>

<template #js>

```js
const a = [1, 2, 3];
const b = a;
// 同样不是复制，指向同一数组
b.push(4);
console.log(a);
// [1,2,3,4]
const c = [...a];
// 浅拷贝一层
const d = structuredClone(a);
// 深拷贝（Node 17+ / 现代浏览器）

function add(item, box = []) {
// JS 默认参数每次调用都重新求值，没有 Python 的坑
  box.push(item);
  return box;
}
add(1);
// [1]
add(2);
// [2]，不是 [1,2]
```

</template>

</CodeCompare>

> **反向差异**：JS 默认参数 `function f(x = [])` 是安全的；Python 默认参数只在函数定义时求值一次，所以必须写 `box=None` 哨兵。

## 三、容器四件套

<CodeCompare>

<template #python>

```python
# list：动态数组，增删改查 O(1) 尾部 / O(n) 中部
nums = [3, 1, 4, 1, 5]
nums.append(9)
# 尾部追加 → [3,1,4,1,5,9]，O(1)
nums.insert(0, 2)
# 在下标 0 插入 2，后面的元素整体后移 → [2,3,1,4,1,5,9]，O(n) 慢
nums.pop()
# 删掉并返回末尾的 9 → [2,3,1,4,1,5]
1 in nums
# O(n) 线性扫描——频繁查找换 set
nums.sort()
# 原地排序 Timsort；sorted(nums, reverse=True) 返回新表

# dict：哈希表（3.7+ 保插入顺序），键必须不可变
user = {"name": "小明", "age": 25}
user["email"] = "x@y.com"
# 写入
user.get("phone", "未填写")
# 读不到给默认值——优先用 get 避免 KeyError
for k, v in user.items(): ...
# 同时遍历键值
"age" in user
# O(1)

# set：去重与集合运算
a, b = {1, 2, 3}, {3, 4}
a & b
# 交集 {3}    a | b 并集    a - b 差集    a ^ b 对称差

# tuple：不可变序列，可当 dict 的键、可解包
point = (3, 4)
x, y = point
# 解包
first, *rest = [1, 2, 3, 4]
# first=1, rest=[2,3,4] 星号收集
```

</template>

<template #js>

```js
const nums = [3, 1, 4, 1, 5];
nums.push(9);
// 尾部追加 → [3,1,4,1,5,9]
nums.unshift(2);
// ≈ insert(0,2)，插到头部、后面元素后移 → [2,3,1,4,1,5,9]，O(n)
nums.pop();
// 删掉末尾的 9 → [2,3,1,4,1,5]
nums.includes(1);
// O(n)
nums.sort((a, b) => a - b);
// JS 默认按字符串排，必须传比较器

const user = { name: "小明", age: 25 };
user.email = "x@y.com";
user.phone ?? "未填写";
// ≈ dict.get 默认值
for (const [k, v] of Object.entries(user)) {}
"age" in user;
// O(1)

const a = new Set([1, 2, 3]), b = new Set([3, 4]);
const inter = [...a].filter(x => b.has(x));
// Set 没有 & 运算符，要手写
const union = new Set([...a, ...b]);

const point = Object.freeze([3, 4]);
// 近似 tuple（不可变）
const [x, y] = point;
// 解包，语法几乎一样
const [first, ...rest] = [1, 2, 3, 4];
// 剩余参数，语法几乎一样
```

</template>

</CodeCompare>

## 四、流程控制与推导式

<CodeCompare>

<template #python>

```python
# if/elif/else 与三元表达式
level = "high" if score >= 90 else "mid" if score >= 60 else "low"

# for 遍历一切可迭代对象
for i, v in enumerate(["a", "b"]):
# 带下标：别写 range(len(...))
    print(i, v)
for k, v in d.items(): ...
# dict 遍历
for line in open("f.txt", encoding="utf-8"):
# 文件按行迭代，不整读进内存
    ...
while cond: ...
# 配合 break / continue / else

# 推导式（Python 最有辨识度的语法，替代 map/filter）
squares = [x * x for x in range(10) if x % 2 == 0]
# 列表
name_len = {n: len(n) for n in names}
# 字典
pairs = {k: v for k, v in d.items() if v is not None}
# 过滤 dict 惯用法
gen = (x * x for x in range(10_000_000))
# 生成器表达式：惰性不占内存
```

</template>

<template #js>

```js
const level = score >= 90 ? "high" : score >= 60 ? "mid" : "low";

["a", "b"].forEach((v, i) => console.log(i, v));
// ≈ enumerate
for (const [k, v] of Object.entries(d)) {}
// 文件按行：Node 用 readline 流，不整读进内存
// for await (const line of readline.createInterface({ input: fs.createReadStream("f.txt") })) {}

const squares = Array.from({ length: 10 }, (_, i) => i)
  .filter(x => x % 2 === 0)
  .map(x => x * x);
const nameLen = Object.fromEntries(names.map(n => [n, n.length]));
const pairs = Object.fromEntries(
  Object.entries(d).filter(([k, v]) => v != null)
);
function* gen() {
// 生成器函数 ≈ Python 生成器表达式
  for (let i = 0; i < 10_000_000; i++) yield i * i;
}
```

</template>

</CodeCompare>

## 五、函数

<CodeCompare>

<template #python>

```python
def order(paid: bool, *, channel: str = "app", **extra) -> dict:
    ...
# 参数顺序：位置参数 → 默认参数 → 星号后强制关键字 → **kwargs 收集
order(True, channel="web", coupon="X")
# channel/coupon 必须写名字

# *args / **kwargs：透传与收集
def log(*args, **kwargs):
    print(args, kwargs)
    # args 是 tuple，kwargs 是 dict

# 作用域：LEGB（Local → Enclosing → Global → Built-in）
count = 0
def inc():
    global count
    # 不改全局就用 local 变量；函数内赋值会被视为新局部变量（UnboundLocalError 之源）
    count += 1

# lambda：只配当一次性小函数（排序 key 等），复杂逻辑一律 def
sorted(users, key=lambda u: u["age"], reverse=True)

# 一等公民：函数可以进列表、当参数、被返回——装饰器与回调的基础
```

</template>

<template #js>

```js
function order(paid, { channel = "app", ...extra } = {}) {}
order(true, { channel: "web", coupon: "X" });
// 对象解构 ≈ 关键字参数

function log(...args) { console.log(args); }
// 剩余参数 ≈ *args
// JS 没有 **kwargs 的独立语法，用对象参数代替

let count = 0;
function inc() { count++; }
// JS 不需要 global 声明

const sorted = [...users].sort((a, b) => b.age - a.age);
// 箭头函数 ≈ lambda

// 一等公民同样成立
const fns = [order, log];
```

</template>

</CodeCompare>

## 六、面向对象

<CodeCompare>

<template #python>

```python
class Account:
    bank = "SPYB"
    # 类属性：所有实例共享

    def __init__(self, owner: str, balance: float = 0.0):
        self.owner = owner
        # 实例属性
        self._balance = balance
        # 单下划线：约定"内部使用"（不强制）
        self.__secret = "x"
        # 双下划线：名称改写（name mangling）防子类冲突

    def deposit(self, amount: float) -> None:
    # self 相当于 this，显式写出来
        self._balance += amount

    @property
    def balance(self) -> float:
    # 把方法伪装成属性：account.balance
        return self._balance

    @staticmethod
    def is_valid_card(no: str) -> bool: ...
    # 不碰实例的 utility

    @classmethod
    def from_csv(cls, path: str) -> "Account":
    # 备用构造器，cls 便于继承
        ...
        return cls("csv-user", 100.0)

    def __repr__(self) -> str:
    # 调试友好：<Account 小明 100.0>
        return f"<Account {self.owner} {self._balance}>"

    def __eq__(self, other) -> bool:
    # 相等语义自己定义
        return isinstance(other, Account) and self._balance == other._balance

    def __len__(self) -> int: ...
    # 协议方法（魔术方法）让对象融入语言：
    # __iter__ 可 for、__contains__ 可 in、__call__ 可调用、__enter__/__exit__ 可 with

class Savings(Account):
    def __init__(self, owner, balance=0.0, rate=0.02):
        super().__init__(owner, balance)
        # 继承：super() 调父类
        self.rate = rate

# 多继承与 MRO：C3 线性化，菱形继承只初始化一次；实际项目优先"组合优于继承"
```

</template>

<template #js>

```js
class Account {
  static bank = "SPYB";
  // 静态字段 ≈ 类属性
  #secret = "x";
  // 私有字段 ≈ 双下划线（真私有）
  constructor(owner, balance = 0) {
  // __init__
    this.owner = owner;
    this._balance = balance;
    // 单下划线只是约定，和 Python 一样
  }
  deposit(amount) { this._balance += amount; }
  // this 隐式存在，不用写 self
  get balance() { return this._balance; }
  // @property
  static isValidCard(no) {}
  // @staticmethod
  static fromCSV(path) { return new this("csv-user", 100); }
  // @classmethod
  toString() { return `<Account ${this.owner} ${this._balance}>`; }
  // __repr__
  // JS 没有 __eq__：对象比较默认按引用，要比较值需自己写 equals
  [Symbol.iterator]() {}
  // __iter__
}

class Savings extends Account {
// 单继承，无 MRO
  constructor(owner, balance = 0, rate = 0.02) {
    super(owner, balance);
    this.rate = rate;
  }
}
```

</template>

</CodeCompare>

数据类（3.7+）替代样板类：

<CodeCompare>

<template #python>

```python
from dataclasses import dataclass, field

@dataclass
class Point:
    x: float
    y: float
    tags: list[str] = field(default_factory=list)
    # 可变默认值的正确姿势
# 自动生成 __init__/__repr__/__eq__；frozen=True 变不可变；slots=True 省内存
```

</template>

<template #js>

```js
// JS 不需要 dataclass：对象字面量或 class 字段就够了
const point = { x: 1, y: 2, tags: [] };
// 需要"自动 equals / 不可变"时用 record/tuple 提案，或 Objeto.freeze：
const frozen = Object.freeze({ x: 1, y: 2 });
```

</template>

</CodeCompare>

## 七、异常与文件

<CodeCompare>

<template #python>

```python
# 异常处理：EAFP（先做，错了再处理）优于 LBYL（先检查再做）
try:
    value = int(input_dict["age"])
except KeyError:
    value = 0
    # 精确捕获——裸 except: 会吞掉 KeyboardInterrupt，禁止
except ValueError as e:
    raise ValueError(f"年龄非法: {input_dict['age']}") from e
    # 重抛并保留原因链
else:
    ...
    # 没抛异常才执行
finally:
    ...
    # 无论如何都执行

# 自定义异常体系
class AppError(Exception): ...
class NotFoundError(AppError): ...
# 业务层 catch AppError 即可

# with 上下文管理器：自动关闭，异常也关
with open("data.csv", encoding="utf-8") as f:
    header = f.readline()
# 常用模式：'r' 读 / 'w' 覆盖写 / 'a' 追加 / 'b' 二进制 / newline='' 交给 csv 模块处理
```

</template>

<template #js>

```js
let value;
try {
  value = Number(input.age);
} catch (e) {
  if (e instanceof TypeError) {
    value = 0;
  } else {
    throw new Error(`年龄非法: ${input.age}`, { cause: e });
    // Error cause ≈ raise ... from e
  }
} finally {
  // 无论如何都执行；JS 的 try 没有 else 块
}

class AppError extends Error {}
class NotFoundError extends AppError {}
// 业务层 catch (e instanceof AppError)

// 文件：Node 没有 with，用 fs / fs/promises
import { readFileSync, createReadStream } from "node:fs";
const header = readFileSync("data.csv", "utf8").split("\n")[0];
```

</template>

</CodeCompare>

## 八、模块与包

<CodeCompare>

<template #python>

```python
import math
# 标准库随手查：math/json/re/os/pathlib/datetime/collections
from datetime import datetime, timedelta
from pathlib import Path
# 现代文件路径操作，替代 os.path 字符串拼接

Path("data") / "a.csv"
# 用 / 拼路径，跨平台
p = Path("report.md")
p.read_text(encoding="utf-8")
# 一行读；write_text 一行写
p.exists(), p.suffix, p.parent

# collections：高频容器增强
from collections import Counter, defaultdict, deque
Counter("abracadabra")
# {'a': 5, 'b': 2, ...} 词频统计一行
d = defaultdict(list)
# 访问不存在的键自动建默认值——分组利器

# 自己的模块：文件即模块；包 = 带 __init__.py 的目录
# if __name__ == "__main__": 里的代码只在直接运行时执行，被 import 时不执行——脚本的标准入口写法
```

</template>

<template #js>

```js
// ESM import ≈ Python import；CommonJS require 是另一套
import path from "node:path";
import { readFileSync, existsSync } from "node:fs";
import dayjs from "dayjs";
// JS 日期靠第三方库（≈ datetime）

const p = path.join("data", "a.csv");
// ≈ Path("data") / "a.csv"
const text = readFileSync("report.md", "utf8");
// ≈ read_text
existsSync("report.md");

// Counter：reduce 手写
const counter = [..."abracadabra"].reduce((m, c) => m.set(c, (m.get(c) ?? 0) + 1), new Map());
// defaultdict(list)：Map + 取值兜底
const groups = new Map();
const bucket = groups.get(k) ?? [];

// 包：目录 + package.json / index.js，不需要 __init__.py
// main 入口判断：
if (import.meta.url === `file://${process.argv[1]}`) {}
```

</template>

</CodeCompare>

## 九、本章自检清单（能秒答算过关）

1. `0.1 + 0.2 == 0.3` 为什么是 False？金额计算用什么？
2. `def f(x=[])` 有什么坑？正确写法？（JS 里为什么没这个坑？）
3. `b = a` 之后改 `b`，`a` 变不变？浅拷贝和深拷贝差在哪层？
4. `list` 查元素、`dict` 查键、`set` 判存在——复杂度各是什么？什么时候换 set？（JS 对应 Array/Object/Set）
5. `is` 和 `==` 的区别？`x is None` 为什么不能写成 `x == None`？（JS 对应 `===`）
6. `*args`、`**kwargs`、`*` 分隔符各是干什么的？（JS 对应 `...args` 和对象解构）
7. `@property`、`@classmethod`、`@staticmethod` 选用场景？（JS 对应 getter / static）
8. `try/except/else/finally` 四段各什么时候执行？为什么禁止裸 `except:`？（JS 没有 else 块）
9. `if __name__ == "__main__"` 的原理？（JS 用 `import.meta.url` 判断）
10. 可变对象为什么不能当 dict 的键？（JS 的 Map 用引用作键，行为不同）

下一站 → [Python 进阶与工程化](./python-advanced)：把"能跑"升级为"地道"。
