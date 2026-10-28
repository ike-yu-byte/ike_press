# Python 进阶与工程化

> 第 2 站：从"能跑"到"地道"。这一站的内容决定了你写的代码像不像 Python，也决定了后面学 Web/数据/AI 时能不能看懂真实项目的源码。**GIL、装饰器、生成器、asyncio 是国内 Python/AI 面试的四大高频考点。**

## 一、迭代器与生成器

```python
# 可迭代(Iterable) = 有 __iter__；迭代器(Iterator) = 有 __next__，一次性消耗
it = iter([1, 2, 3])
next(it)          # 1；耗尽后抛 StopIteration，for 循环就是在捕获它收尾

# 生成器函数：含 yield 的函数，调用返回生成器对象——惰性求值、状态自动保存
def countdown(n: int):
    while n > 0:
        yield n       # 执行到这里暂停并交出一个值，下次从暂停处继续
        n -= 1

list(countdown(3))    # [3, 2, 1]

# 为什么重要：处理 10GB 日志不爆内存（一次只读一行）、无限序列、管道式组合
def parse(lines):      # 生成器可以串成流水线，每行数据流过全部阶段
    return (line.split("|") for line in lines if line.strip())
```

- `yield` 与 `return`：函数级暂停/恢复靠帧对象挂起，内存只占当前状态。
- 生成器表达式 `(x*x for x in xs)` vs 列表推导 `[x*x for x in xs]`：后者立刻全算全存。
- 面试追问点：**`iter()`/`next()` 协议、`yield` 保存了什么（局部变量+执行位置）、`send/as.throw` 知道即可**。

## 二、装饰器与"函数是一等公民"的进阶玩法

```python
import functools
import time

def retry(times: int = 3, delay: float = 1.0):
    """带参数的装饰器：三层结构（参数层→装饰层→包装层）"""
    def deco(func):
        @functools.wraps(func)               # 保住原函数的 __name__/__doc__——面试细节分
        def wrapper(*args, **kwargs):
            for i in range(times):
                try:
                    return func(*args, **kwargs)
                except Exception:
                    if i == times - 1:
                        raise
                    time.sleep(delay * (2 ** i))   # 指数退避
        return wrapper
    return deco

@retry(times=5, delay=0.5)
def call_llm(prompt: str) -> str: ...        # 调用失败自动重试——AI/网络代码的常客

@functools.lru_cache(maxsize=256)            # 标准库自带：缓存纯函数结果
def fib(n: int) -> int:
    return n if n < 2 else fib(n - 1) + fib(n - 2)

@functools.cache                             # 3.9+：不限容量的简写
def heavy(x): ...
```

- 本质：`@deco` 等价于 `func = deco(func)`——**高阶函数对函数的包装**。
- 常见用途：日志/计时、重试、缓存、鉴权（Flask/Django 的路由和登录保护全是装饰器）、注册钩子。
- 类装饰器与 `functools.wraps` 是面试二级追问；能白板写一个带参装饰器 = 这题过关。

## 三、类型注解与数据校验

```python
from typing import Optional, Union, Literal, TypedDict

def find_user(uid: int, active: bool = True) -> Optional[dict]:   # 3.10+ 可写 dict | None
    ...

# 注解不影响运行（Python 依旧动态）——它服务的是 IDE 补全和 mypy/pyright 静态检查
# 真实项目口径：新代码全量注解 + CI 跑 mypy；这是"Python 工程化成熟度"的信号

Point = tuple[float, float]                  # 类型别名（3.9+ 直接下标内置容器）
class Config(TypedDict):                     # 给 dict 定形状
    host: str
    port: int

# Pydantic（AI 生态基石，FastAPI/LangChain 都用它）：注解 + 运行时真校验
from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    temperature: float = Field(default=0.7, ge=0, le=2)   # 越界自动报 422

ChatRequest.model_validate({"prompt": "hi"})  # JSON → 对象，错误信息精确到字段
```

- `typing` 是"写给人和检查器看的"，Pydantic 是"运行时真的拦"——分清这两层，面试问到能讲透。

## 四、GIL 与并发模型（面试必考）

**GIL（全局解释器锁）**：CPython 中同一时刻只有一个线程执行 Python 字节码。

- 为什么存在：保护引用计数线程安全，是历史实现决策，不是语言规定。
- 后果：**多线程吃不了多核**——CPU 密集任务多线程不提速（甚至更慢）。
- 例外：线程在 IO 等待 / 调用 C 扩展（NumPy 矩阵运算、编解码）时会释放 GIL——**IO 密集多线程依然有效**。
- 演进：3.13+ 实验性 free-threading 构建（PEP 703），3.14 继续推进；生态尚在路上，面试提一句显水平。

```python
# 选型口诀：IO 密集 → 线程/异步；CPU 密集 → 进程；海量连接 → asyncio
import threading
t = threading.Thread(target=worker, args=(1,), daemon=True)   # daemon：主程序退出即收摊
t.start(); t.join()

from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
with ThreadPoolExecutor(max_workers=8) as pool:               # 线程池：批量抓 8 个 URL
    futures = {pool.submit(fetch, u): u for u in urls}
    for f in as_completed(futures):
        print(futures[f], f.result())                         # 谁先完成谁先出

with ProcessPoolExecutor() as pool:                           # 进程池：绕开 GIL 吃满多核
    pool.map(cpu_heavy, data_chunks)                          # 代价：进程间传数据要序列化

# 线程安全：GIL 不等于安全！count += 1 不是原子操作
lock = threading.Lock()
with lock:                       # 获取/自动释放
    count += 1
# queue.Queue 内置锁——生产者消费者优先用它，别手写 Condition

# 多进程要点：数据要 pickle 传输（大对象别跨进程传来传去）；
# __main__ 保护块在 Windows 上是必须的（子进程会重新 import 主模块）
if __name__ == "__main__":
    with ProcessPoolExecutor(4) as pool: ...
```

## 五、asyncio 异步编程

```python
import asyncio

async def fetch_one(session, url: str) -> dict:
    async with session.get(url) as resp:          # await：让出控制权给事件循环
        return await resp.json()

async def main():
    import aiohttp
    async with aiohttp.ClientSession() as session:
        # 并发 100 个请求：gather 打包并发跑，总耗时 ≈ 最慢的一个
        results = await asyncio.gather(*[fetch_one(session, u) for u in urls])
    print(results)

asyncio.run(main())
```

- 心智模型：**单线程 + 事件循环**——`async def` 定义协程，`await` 处挂起、IO 完成处恢复。JS 的 async/await 同构，前端同学秒懂。
- 规则：**async 函数只能被 async 调用**；混用同步阻塞代码（`time.sleep`、requests）会卡死整个循环——阻塞库用 `asyncio.to_thread()` 包一层。
- 生态：HTTP 用 `aiohttp`/`httpx.AsyncClient`；DB 用 `asyncpg`/`SQLAlchemy async`。**FastAPI 端点直接写 async**（第 7 站 AI 流式服务的基础）。
- 线程 vs 协程：协程省线程内存、切换快，但一堵全堵且生态要 async 兼容；几千并发 IO 用协程，几十个用线程足够。

## 六、工程化：环境、依赖、规范、测试

```bash
# 虚拟环境：每个项目一个隔离环境——Python 工程第一课，不建 venv 的教程都是耍流氓
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install requests             # 装进当前环境
pip freeze > requirements.txt    # 锁定依赖清单

# 现代工具链（2026 口径）：uv 一个工具全包（建环境/装包/锁文件/跑脚本，快 10-100 倍）
uv init && uv add fastapi        # 生成 pyproject.toml + uv.lock
uv sync && uv run main.py        # 复现环境并运行

# 代码规范：ruff（lint + format 二合一，替代 flake8+black 的事实标准）
ruff check . && ruff format .

# 测试：pytest（断言直接用 assert，fixture 做依赖注入）
pytest -q --cov=app
```

```python
# pytest 惯用法
import pytest

@pytest.fixture
def db():                        # fixture：测试前置资源，自动注入参数
    conn = make_test_db()
    yield conn                   # yield 前 setup、后 teardown
    conn.close()

@pytest.mark.parametrize("raw,expected", [("3", 3), ("-1", -1)])
def test_parse_int(raw, expected):
    assert parse_int(raw) == expected
```

- 项目结构最小模板：`src/包名/`（代码）+ `tests/` + `pyproject.toml`（元数据与工具配置统一入口）。
- 版本号语义 `MAJOR.MINOR.PATCH`；依赖写范围 `fastapi>=0.115,<1`，锁文件保证可复现——与 Java 章"版本仲裁"同一课。

## 七、Python 与 Java 心智对照（给转过来的同学）

| 维度 | Java | Python |
| --- | --- | --- |
| 类型 | 静态编译期检查 | 动态运行期 + 可选注解 + Pydantic 校验 |
| 并发单位 | 线程真多核 | GIL 限线程 → 多进程/协程组合拳 |
| 空 | null（NPE 之乡） | None（`if x is None`），truthy/falsy 泛化 |
| 数据载体 | POJO/record | dict / dataclass / Pydantic BaseModel |
| 构建 | Maven/Gradle | pip/uv/poetry + pyproject.toml |
| 框架哲学 | 注解 + DI 容器 | 显式函数调用 + 装饰器；"可读性优先" |

## 八、本章自检清单

1. GIL 是什么？为什么多线程跑不满多核、但 IO 密集又有效？怎么绕开？
2. 生成器和返回 list 的函数比，优势在哪？`yield` 时函数状态放哪里？
3. 白板写一个带参数的 `@retry` 装饰器，并解释 `functools.wraps` 的作用。
4. `count += 1` 在线程里为什么不安全？三种并发原语（Lock/Queue/信号量）怎么选？
5. 协程和线程的区别？`asyncio.gather` 干什么？为什么 `time.sleep` 会卡死事件循环？
6. 类型注解在运行时生效吗？Pydantic 和 typing 的分工？
7. 为什么必须用虚拟环境？venv/poetry/uv 各解决什么？
8. `if __name__ == "__main__"` 在多进程程序里为什么是 Windows 的硬性要求？

下一站 → [Flask Web 开发](./flask)：把语言本事变成 HTTP 服务。
