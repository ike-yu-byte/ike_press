# Python Basics

> Stop 1: language fundamentals. The goal isn't "finish the syntax book" but writing correct scripts solo. This chapter is organized as concept + high-frequency trap + mini exercise — the traps are what interviews and real code actually test.

## 1. Starting mental model

- **Interpreted + dynamically typed**: variables are name tags, not boxes — `a = 1; a = "x"` is legal because `a` just re-sticks onto a different object. Internalize this and 80% of Python's "weirdness" explains itself.
- **Indentation is syntax**: 4 spaces is the convention (PEP 8); mixing tabs/spaces is an `IndentationError`.
- **Everything is an object**: numbers, functions, classes — all assignable, passable, returnable. The root of both Python's expressiveness and its traps.
- Running: `python script.py`; `python -i script.py` drops into the REPL after; Jupyter for data exploration (stop 4 lives in notebooks).

## 2. Variables and primitive types

```python
# numbers
n = 42                # int: arbitrary precision — never overflows like Java
pi = 3.14             # float: IEEE 754 double
big = 10 ** 100       # perfectly legal, Python ints grow on demand

# classic trap 1: float precision
0.1 + 0.2 == 0.3      # False! Use math.isclose() or decimal.Decimal for exact compares
# classic trap 2: division
7 / 2    # 3.5 (true division returns float)
7 // 2   # 3 (floor division rounds toward -inf: -7 // 2 == -4)
7 % 2    # 1 (modulo takes the sign of the divisor)

# strings: immutable sequences
s = "Hello, Python"
s[0]           # 'H'
s[-1]          # 'n' — negative indexes count from the end
s[7:13]        # 'Python' — slices are half-open, out-of-range is silent
s.upper()      # returns a NEW string; s is unchanged — "strings are immutable"
",".join(["a", "b"])   # 'a,b' — join, don't += in a loop (O(n) vs O(n²))

# f-strings (3.6+, the only formatting style you should teach yourself)
name, score = "Ann", 92.5
print(f"{name} scored {score:.1f}, progress {25.4%}")   # expressions + format specs

# booleans and None
bool(0), bool(""), bool([])    # False False False — empties and zeros are falsy
x = None                        # None is a singleton: test with `x is None`, never `x == None`
```

**Mutable vs immutable (guaranteed interview topic)**:

| Immutable | Mutable |
| --- | --- |
| int / float / str / tuple / frozenset / bool | list / dict / set / bytearray / instances of your classes |

```python
a = [1, 2, 3]
b = a            # NOT a copy! b and a name the same list
b.append(4)
print(a)         # [1, 2, 3, 4] — the mother of all "pass-by-reference" illusions
c = a.copy()     # shallow copy: one level independent
import copy
d = copy.deepcopy(a)   # deep copy: nested objects duplicated too

# classic trap: the mutable default argument (evaluated once at def time!)
def bad(item, box=[]):      # ← wrong: every call shares one list
    box.append(item)
    return box
def good(item, box=None):   # ← right: sentinel pattern
    if box is None:
        box = []
    box.append(item)
    return box
```

## 3. The four containers

```python
# list: dynamic array — O(1) tail ops / O(n) middle ops
nums = [3, 1, 4, 1, 5]
nums.append(9); nums.insert(0, 2); nums.pop()     # tail fast, insert(0) slow (shifts everything)
1 in nums                                          # O(n) scan — use a set for frequent membership
nums.sort()                                        # in-place Timsort; sorted(nums, reverse=True) copies

# dict: hash table (insertion-ordered since 3.7), keys must be immutable
user = {"name": "Ann", "age": 25}
user["email"] = "x@y.com"          # write
user.get("phone", "n/a")           # default on miss — prefer .get over KeyError roulette
for k, v in user.items(): ...      # iterate pairs
"age" in user                      # O(1)

# set: dedup + algebra
a, b = {1, 2, 3}, {3, 4}
a & b   # intersection {3}    a | b union    a - b difference    a ^ b symmetric diff

# tuple: immutable sequence, hashable, unpackable
point = (3, 4)
x, y = point                        # unpack
first, *rest = [1, 2, 3, 4]         # first=1, rest=[2,3,4] — star collection
```

## 4. Control flow and comprehensions

```python
# if/elif/else and the ternary
level = "high" if score >= 90 else "mid" if score >= 60 else "low"

# for iterates anything iterable
for i, v in enumerate(["a", "b"]):        # indexed: never write range(len(...))
    print(i, v)
for k, v in d.items(): ...                 # dict iteration
for line in open("f.txt", encoding="utf-8"):  # streams line by line, no full read
    ...
while cond: ...                            # with break / continue / else

# comprehensions (Python's most recognizable syntax; replaces map/filter)
squares = [x * x for x in range(10) if x % 2 == 0]     # list
name_len = {n: len(n) for n in names}                   # dict
pairs = {k: v for k, v in d.items() if v is not None}  # idiomatic dict filter
gen = (x * x for x in range(10_000_000))                # generator expr: lazy, tiny memory
```

## 5. Functions

```python
def order(paid: bool, *, channel: str = "app", **extra) -> dict:
    ...
# parameter order: positional → defaults → keyword-only after * → **kwargs collector
order(True, channel="web", coupon="X")   # channel/coupon must be named

# *args / **kwargs: pass-through and collection
def log(*args, **kwargs):
    print(args, kwargs)      # args is a tuple, kwargs a dict

# scoping: LEGB (Local → Enclosing → Global → Built-in)
count = 0
def inc():
    global count        # assigning inside makes it a NEW local otherwise (UnboundLocalError source #1)
    count += 1

# lambda: fine as a one-shot key function, everything else deserves def
sorted(users, key=lambda u: u["age"], reverse=True)

# first-class citizens: functions go in lists, params, returns — the basis of decorators & callbacks
```

## 6. Object-oriented Python

```python
class Account:
    bank = "SPYB"                  # class attribute: shared by all instances

    def __init__(self, owner: str, balance: float = 0.0):
        self.owner = owner         # instance attributes
        self._balance = balance    # single underscore: "internal by convention" (not enforced)
        self.__secret = "x"        # double underscore: name mangling, subclass-collision shield

    def deposit(self, amount: float) -> None:      # self is the explicit this
        self._balance += amount

    @property
    def balance(self) -> float:                    # method masquerading as attribute: account.balance
        return self._balance

    @staticmethod
    def is_valid_card(no: str) -> bool: ...        # utility that touches no instance

    @classmethod
    def from_csv(cls, path: str) -> "Account":     # alternate constructor; cls survives inheritance
        ...
        return cls("csv-user", 100.0)

    def __repr__(self) -> str:                     # debug-friendly: <Account Ann 100.0>
        return f"<Account {self.owner} {self._balance}>"

    def __eq__(self, other) -> bool:               # define your own equality
        return isinstance(other, Account) and self._balance == other._balance

    def __len__(self) -> int: ...                  # dunder methods integrate objects into the language:
    # __iter__ for `for`, __contains__ for `in`, __call__ to be callable, __enter__/__exit__ for `with`

class Savings(Account):
    def __init__(self, owner, balance=0.0, rate=0.02):
        super().__init__(owner, balance)           # inheritance: super() calls the parent
        self.rate = rate

# multiple inheritance & MRO: C3 linearization, diamonds initialize once; prefer composition in real code
```

Dataclasses (3.7+) kill boilerplate:

```python
from dataclasses import dataclass, field

@dataclass
class Point:
    x: float
    y: float
    tags: list[str] = field(default_factory=list)   # the correct mutable default
# generates __init__/__repr__/__eq__; frozen=True for immutability; slots=True to save memory
```

## 7. Exceptions and files

```python
# EAFP (do it, handle failure) beats LBYL (check first) in Python
try:
    value = int(input_dict["age"])
except KeyError:
    value = 0                    # catch precisely — a bare except: also eats KeyboardInterrupt; banned
except ValueError as e:
    raise ValueError(f"bad age: {input_dict['age']}") from e   # re-raise keeping the cause chain
else:
    ...                          # runs only when no exception happened
finally:
    ...                          # always runs

# your own exception hierarchy
class AppError(Exception): ...
class NotFoundError(AppError): ...     # business layers catch AppError once

# with closes automatically, even on exceptions
with open("data.csv", encoding="utf-8") as f:
    header = f.readline()
# modes: 'r' read / 'w' truncate-write / 'a' append / 'b' binary / newline='' for the csv module
```

## 8. Modules and packages

```python
import math                       # standard library worth memorizing: math/json/re/os/pathlib/datetime/collections
from datetime import datetime, timedelta
from pathlib import Path          # modern path handling; retire os.path string surgery

Path("data") / "a.csv"            # / to join, cross-platform
p = Path("report.md")
p.read_text(encoding="utf-8")     # one-line read; write_text one-line write
p.exists(), p.suffix, p.parent

# collections: container power-ups
from collections import Counter, defaultdict, deque
Counter("abracadabra")            # {'a': 5, 'b': 2, ...} — word frequency in one line
d = defaultdict(list)             # missing keys materialize a default — grouping made easy

# your own modules: a file IS a module; a package is a directory with __init__.py
# code under if __name__ == "__main__": runs only when executed directly, not when imported
```

## 9. Self-check (answer instantly to pass)

1. Why is `0.1 + 0.2 == 0.3` False? What do you use for money?
2. What's wrong with `def f(x=[])`? The fix?
3. After `b = a`, does mutating `b` change `a`? Shallow vs deep copy — which level differs?
4. Lookup complexity for list / dict key / set membership? When do you switch to a set?
5. `is` vs `==`? Why must `x is None` not become `x == None`?
6. What do `*args`, `**kwargs`, and a bare `*` separator each do?
7. When to pick `@property` vs `@classmethod` vs `@staticmethod`?
8. When do try/except/else/finally each run? Why are bare `except:` banned?
9. How does `if __name__ == "__main__"` work?
10. Why can't mutable objects be dict keys?

Next stop → [Advanced Python & Engineering](./python-advanced): from "works" to "idiomatic".
