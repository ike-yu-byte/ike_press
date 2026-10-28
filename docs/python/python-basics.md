# Python 基础入门

> 第 1 站：语言基础。目标不是"看完语法书"，而是能独立写正确的脚本。本章按"概念 + 高频坑 + 小练习"组织，坑的部分是面试与实战的真正考点。

## 一、起步认知

- **解释型 + 动态类型**：变量是"名字的标签"，不是"装值的盒子"——`a = 1; a = "x"` 合法，因为 `a` 只是贴到不同对象上的标签。这一条想通了，后面 80% 的 Python 怪现象都能解释。
- **缩进即语法**：4 空格是约定（PEP 8），混用 Tab/空格直接报 `IndentationError`。
- **一切皆对象**：数字、函数、类都是对象，都能赋值、传参、当返回值——这是 Python 表达力（和坑）的根源。
- 运行方式：`python script.py` 脚本执行；`python -i script.py` 跑完进交互；Jupyter Notebook 做数据探索（第 4 站会大量用）。

## 二、变量与基本类型

```python
# 数值
n = 42                # int：任意精度，不会像 Java 那样溢出
pi = 3.14             # float：IEEE 754 双精度
big = 10 ** 100       # 完全合法，Python int 自动扩位

# 经典坑 1：浮点精度
0.1 + 0.2 == 0.3      # False！要精确比较用 math.isclose() 或 decimal.Decimal
# 经典坑 2：整数除法
7 / 2    # 3.5（真除返回 float）
7 // 2   # 3（地板除，向负无穷取整：-7 // 2 == -4）
7 % 2    # 1（取模符号跟随除数）

# 字符串：不可变序列
s = "Hello, Python"
s[0]           # 'H'
s[-1]          # 'n' 负索引从尾部数
s[7:13]        # 'Python' 切片：左闭右开，越界不报错
s.upper()      # 返回新串，s 本身不变——"字符串不可变"
",".join(["a", "b"])   # 'a,b' 拼接大量字符串用 join，别用 + 循环（O(n²) vs O(n)）

# f-string（3.6+，字符串格式化的唯一推荐姿势）
name, score = "小明", 92.5
print(f"{name} 得分 {score:.1f}, 进度 {25.4%}")   # 支持表达式与格式说明符

# 布尔与 None
bool(0), bool(""), bool([])    # False False False —— 空值/零值都是 False
x = None                        # None 是单例，判断用 x is None，不用 x == None
```

**可变 vs 不可变（面试必考）**：

| 不可变 | 可变 |
| --- | --- |
| int / float / str / tuple / frozenset / bool | list / dict / set / bytearray / 自定义类实例 |

```python
a = [1, 2, 3]
b = a            # 不是复制！b 和 a 指向同一个 list
b.append(4)
print(a)         # [1, 2, 3, 4] —— "传引用"错觉的万恶之源
c = a.copy()     # 浅拷贝：一层独立
import copy
d = copy.deepcopy(a)   # 深拷贝：嵌套对象也复制

# 经典坑：可变默认参数（函数只求值一次！）
def bad(item, box=[]):      # ← 错：所有调用共享同一个 list
    box.append(item)
    return box
def good(item, box=None):   # ← 对：哨兵模式
    if box is None:
        box = []
    box.append(item)
    return box
```

## 三、容器四件套

```python
# list：动态数组，增删改查 O(1) 尾部 / O(n) 中部
nums = [3, 1, 4, 1, 5]
nums.append(9); nums.insert(0, 2); nums.pop()     # 尾部操作快，insert(0) 慢（要搬移）
1 in nums                                          # O(n) 线性扫描——频繁查找换 set
nums.sort()                                        # 原地排序 Timsort；sorted(nums, reverse=True) 返回新表

# dict：哈希表（3.7+ 保插入顺序），键必须不可变
user = {"name": "小明", "age": 25}
user["email"] = "x@y.com"          # 写入
user.get("phone", "未填写")         # 读不到给默认值——优先用 get 避免 KeyError
for k, v in user.items(): ...      # 同时遍历键值
"age" in user                      # O(1)

# set：去重与集合运算
a, b = {1, 2, 3}, {3, 4}
a & b   # 交集 {3}    a | b 并集    a - b 差集    a ^ b 对称差

# tuple：不可变序列，可当 dict 的键、可解包
point = (3, 4)
x, y = point                        # 解包
first, *rest = [1, 2, 3, 4]         # first=1, rest=[2,3,4] 星号收集
```

## 四、流程控制与推导式

```python
# if/elif/else 与三元表达式
level = "high" if score >= 90 else "mid" if score >= 60 else "low"

# for 遍历一切可迭代对象
for i, v in enumerate(["a", "b"]):        # 带下标：别写 range(len(...))
    print(i, v)
for k, v in d.items(): ...                 # dict 遍历
for line in open("f.txt", encoding="utf-8"):  # 文件按行迭代，不整读进内存
    ...
while cond: ...                            # 配合 break / continue / else

# 推导式（Python 最有辨识度的语法，替代 map/filter）
squares = [x * x for x in range(10) if x % 2 == 0]     # 列表
name_len = {n: len(n) for n in names}                   # 字典
pairs = {k: v for k, v in d.items() if v is not None}  # 过滤 dict 惯用法
gen = (x * x for x in range(10_000_000))                # 生成器表达式：惰性不占内存
```

## 五、函数

```python
def order(paid: bool, *, channel: str = "app", **extra) -> dict:
    ...
# 参数顺序：位置参数 → 默认参数 → 星号后强制关键字 → **kwargs 收集
order(True, channel="web", coupon="X")   # channel/coupon 必须写名字

# *args / **kwargs：透传与收集
def log(*args, **kwargs):
    print(args, kwargs)      # args 是 tuple，kwargs 是 dict

# 作用域：LEGB（Local → Enclosing → Global → Built-in）
count = 0
def inc():
    global count        # 不改全局就用 local 变量；函数内赋值会被视为新局部变量（UnboundLocalError 之源）
    count += 1

# lambda：只配当一次性小函数（排序 key 等），复杂逻辑一律 def
sorted(users, key=lambda u: u["age"], reverse=True)

# 一等公民：函数可以进列表、当参数、被返回——装饰器与回调的基础
```

## 六、面向对象

```python
class Account:
    bank = "SPYB"                  # 类属性：所有实例共享

    def __init__(self, owner: str, balance: float = 0.0):
        self.owner = owner         # 实例属性
        self._balance = balance    # 单下划线：约定"内部使用"（不强制）
        self.__secret = "x"        # 双下划线：名称改写（name mangling）防子类冲突

    def deposit(self, amount: float) -> None:      # self 相当于 this，显式写出来
        self._balance += amount

    @property
    def balance(self) -> float:                    # 把方法伪装成属性：account.balance
        return self._balance

    @staticmethod
    def is_valid_card(no: str) -> bool: ...        # 不碰实例的 utility

    @classmethod
    def from_csv(cls, path: str) -> "Account":     # 备用构造器，cls 便于继承
        ...
        return cls("csv-user", 100.0)

    def __repr__(self) -> str:                     # 调试友好：<Account 小明 100.0>
        return f"<Account {self.owner} {self._balance}>"

    def __eq__(self, other) -> bool:               # 相等语义自己定义
        return isinstance(other, Account) and self._balance == other._balance

    def __len__(self) -> int: ...                  # 协议方法（魔术方法）让对象融入语言：
    # __iter__ 可 for、__contains__ 可 in、__call__ 可调用、__enter__/__exit__ 可 with

class Savings(Account):
    def __init__(self, owner, balance=0.0, rate=0.02):
        super().__init__(owner, balance)           # 继承：super() 调父类
        self.rate = rate

# 多继承与 MRO：C3 线性化，菱形继承只初始化一次；实际项目优先"组合优于继承"
```

数据类（3.7+）替代样板类：

```python
from dataclasses import dataclass, field

@dataclass
class Point:
    x: float
    y: float
    tags: list[str] = field(default_factory=list)   # 可变默认值的正确姿势
# 自动生成 __init__/__repr__/__eq__；frozen=True 变不可变；slots=True 省内存
```

## 七、异常与文件

```python
# 异常处理：EAFP（先做，错了再处理）优于 LBYL（先检查再做）
try:
    value = int(input_dict["age"])
except KeyError:
    value = 0                    # 精确捕获——裸 except: 会吞掉 KeyboardInterrupt，禁止
except ValueError as e:
    raise ValueError(f"年龄非法: {input_dict['age']}") from e   # 重抛并保留原因链
else:
    ...                          # 没抛异常才执行
finally:
    ...                          # 无论如何都执行

# 自定义异常体系
class AppError(Exception): ...
class NotFoundError(AppError): ...     # 业务层 catch AppError 即可

# with 上下文管理器：自动关闭，异常也关
with open("data.csv", encoding="utf-8") as f:
    header = f.readline()
# 常用模式：'r' 读 / 'w' 覆盖写 / 'a' 追加 / 'b' 二进制 / newline='' 交给 csv 模块处理
```

## 八、模块与包

```python
import math                       # 标准库随手查：math/json/re/os/pathlib/datetime/collections
from datetime import datetime, timedelta
from pathlib import Path          # 现代文件路径操作，替代 os.path 字符串拼接

Path("data") / "a.csv"            # 用 / 拼路径，跨平台
p = Path("report.md")
p.read_text(encoding="utf-8")     # 一行读；write_text 一行写
p.exists(), p.suffix, p.parent

# collections：高频容器增强
from collections import Counter, defaultdict, deque
Counter("abracadabra")            # {'a': 5, 'b': 2, ...} 词频统计一行
d = defaultdict(list)             # 访问不存在的键自动建默认值——分组利器

# 自己的模块：文件即模块；包 = 带 __init__.py 的目录
# if __name__ == "__main__": 里的代码只在直接运行时执行，被 import 时不执行——脚本的标准入口写法
```

## 九、本章自检清单（能秒答算过关）

1. `0.1 + 0.2 == 0.3` 为什么是 False？金额计算用什么？
2. `def f(x=[])` 有什么坑？正确写法？
3. `b = a` 之后改 `b`，`a` 变不变？浅拷贝和深拷贝差在哪层？
4. `list` 查元素、`dict` 查键、`set` 判存在——复杂度各是什么？什么时候换 set？
5. `is` 和 `==` 的区别？`x is None` 为什么不能写成 `x == None`？
6. `*args`、`**kwargs`、`*` 分隔符各是干什么的？
7. `@property`、`@classmethod`、`@staticmethod` 选用场景？
8. `try/except/else/finally` 四段各什么时候执行？为什么禁止裸 `except:`？
9. `if __name__ == "__main__"` 的原理？
10. 可变对象为什么不能当 dict 的键？

下一站 → [Python 进阶与工程化](./python-advanced)：把"能跑"升级为"地道"。
