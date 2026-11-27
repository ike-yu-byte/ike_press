# Python 进阶与工程化

> 第 2 站：从"能跑"到"地道"。这一站的内容决定了你写的代码像不像 Python，也决定了后面学 Web/数据/AI 时能不能看懂真实项目的源码。**GIL、装饰器、生成器、asyncio 是国内 Python/AI 面试的四大高频考点。**
>
> **阅读方式**：每个 Python 知识点后都紧跟 **JS 对照**，用你熟悉的前端语言做锚点。asyncio 一节你会发现和 JS 的 async/await 几乎逐行对应。

## 一、迭代器与生成器

<CodeCompare>

<template #python>

```python
# 可迭代(Iterable) = 有 __iter__；迭代器(Iterator) = 有 __next__，一次性消耗
it = iter([1, 2, 3])
next(it)
# 1；耗尽后抛 StopIteration，for 循环就是在捕获它收尾

# 生成器函数：含 yield 的函数，调用返回生成器对象——惰性求值、状态自动保存
def countdown(n: int):
    while n > 0:
        yield n
        # 执行到这里暂停并交出一个值，下次从暂停处继续
        n -= 1

list(countdown(3))
# [3, 2, 1]

# 为什么重要：处理 10GB 日志不爆内存（一次只读一行）、无限序列、管道式组合
def parse(lines):
# 生成器可以串成流水线，每行数据流过全部阶段
    return (line.split("|") for line in lines if line.strip())
```

</template>

<template #js>

```js
const it = [1, 2, 3][Symbol.iterator]();
it.next();
// { value: 1, done: false }，耗尽后 done: true
                        // JS 用 done 标记结束，Python 用 StopIteration 异常

function* countdown(n) {
  while (n > 0) yield n--;
  // yield 暂停/恢复，语义几乎一样
}
console.log([...countdown(3)]);
// [3,2,1]

function* parse(lines) {
  for (const line of lines) {
    if (line.trim()) yield line.split("|");
  }
}
```

</template>

</CodeCompare>

- `yield` 与 `return`：函数级暂停/恢复靠帧对象挂起，内存只占当前状态。
- 生成器表达式 `(x*x for x in xs)` vs 列表推导 `[x*x for x in xs]`：后者立刻全算全存。JS 对应 `yield*` / `Array.from(generator)`。
- 面试追问点：**`iter()`/`next()` 协议、`yield` 保存了什么（局部变量+执行位置）、`send/as.throw` 知道即可**。

## 二、装饰器与"函数是一等公民"的进阶玩法

<CodeCompare>

<template #python>

```python
import functools
import time

def retry(times: int = 3, delay: float = 1.0):
    """带参数的装饰器：三层结构（参数层→装饰层→包装层）"""
    def deco(func):
        @functools.wraps(func)
        # 保住原函数的 __name__/__doc__——面试细节分
        def wrapper(*args, **kwargs):
            for i in range(times):
                try:
                    return func(*args, **kwargs)
                except Exception:
                    if i == times - 1:
                        raise
                    time.sleep(delay * (2 ** i))
                    # 指数退避
        return wrapper
    return deco

@retry(times=5, delay=0.5)
def call_llm(prompt: str) -> str: ...
# 调用失败自动重试——AI/网络代码的常客

@functools.lru_cache(maxsize=256)
# 标准库自带：缓存纯函数结果
def fib(n: int) -> int:
    return n if n < 2 else fib(n - 1) + fib(n - 2)

@functools.cache
# 3.9+：不限容量的简写
def heavy(x): ...
```

</template>

<template #js>

```js
// JS 没有 @装饰器语法（提案阶段），靠高阶函数手动包一层
function retry(times = 3, delay = 1000) {
  return function (func) {
    return async function (...args) {
      for (let i = 0; i < times; i++) {
        try {
          return await func(...args);
        } catch (e) {
          if (i === times - 1) throw e;
          await new Promise(r => setTimeout(r, delay * 2 ** i));
          // 指数退避
        }
      }
    };
  };
}

const callLLM = retry(5, 500)(async (prompt) => { /* ... */ });
// ≈ Python 的 @retry(times=5, delay=0.5) def call_llm(...)

// lru_cache：lodash.memoize 或自己用 Map
const cache = new Map();
function fib(n) {
  if (cache.has(n)) return cache.get(n);
  const r = n < 2 ? n : fib(n - 1) + fib(n - 2);
  cache.set(n, r);
  return r;
}
```

</template>

</CodeCompare>

- 本质：`@deco` 等价于 `func = deco(func)`——**高阶函数对函数的包装**。JS 里就是 `const f = deco(f)`。
- 常见用途：日志/计时、重试、缓存、鉴权（Flask/Django 的路由和登录保护全是装饰器）、注册钩子。前端里的 HOC、中间件（Express/Koa）是同一套思想。
- 类装饰器与 `functools.wraps` 是面试二级追问；JS 里对应 `Object.defineProperty(wrapper, "name", ...)` 保留元信息。

## 三、类型注解与数据校验

<CodeCompare>

<template #python>

```python
from typing import Optional, Union, Literal, TypedDict

def find_user(uid: int, active: bool = True) -> Optional[dict]:
# 3.10+ 可写 dict | None
    ...

# 注解不影响运行（Python 依旧动态）——它服务的是 IDE 补全和 mypy/pyright 静态检查
# 真实项目口径：新代码全量注解 + CI 跑 mypy；这是"Python 工程化成熟度"的信号

Point = tuple[float, float]
# 类型别名（3.9+ 直接下标内置容器）
class Config(TypedDict):
# 给 dict 定形状
    host: str
    port: int

# Pydantic（AI 生态基石，FastAPI/LangChain 都用它）：注解 + 运行时真校验
from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    temperature: float = Field(default=0.7, ge=0, le=2)
    # 越界自动报 422

ChatRequest.model_validate({"prompt": "hi"})
# JSON → 对象，错误信息精确到字段
```

</template>

<template #js>

```ts
// 类型注解 → TypeScript（编译期检查，运行时擦除，和 Python 注解定位类似）
type Point = [number, number];
interface Config { host: string; port: number; }
function findUser(uid: number, active = true): User | null { /* ... */ }
```

</template>

</CodeCompare>

```js
// 运行时校验 → Zod（Pydantic 在 JS 里最直接的对位）
import { z } from "zod";

const ChatRequest = z.object({
  prompt: z.string().min(1).max(4000),
  temperature: z.number().min(0).max(2).default(0.7),
});

ChatRequest.parse({ prompt: "hi" });
// 校验失败抛错，错误信息精确到字段
// FastAPI 里 Pydantic 校验失败自动返回 422；Express 里要自己接住 ZodError 返回 400
```

- `typing` 是"写给人和检查器看的"，Pydantic 是"运行时真的拦"——JS 里就是 **TS（编译期）+ Zod（运行期）** 这两层，完全同构。

## 四、GIL 与并发模型（面试必考）

**GIL（全局解释器锁）**：CPython 中同一时刻只有一个线程执行 Python 字节码。

- 为什么存在：保护引用计数线程安全，是历史实现决策，不是语言规定。
- 后果：**多线程吃不了多核**——CPU 密集任务多线程不提速（甚至更慢）。
- 例外：线程在 IO 等待 / 调用 C 扩展（NumPy 矩阵运算、编解码）时会释放 GIL——**IO 密集多线程依然有效**。
- 演进：3.13+ 实验性 free-threading 构建（PEP 703），3.14 继续推进；生态尚在路上，面试提一句显水平。

**JS 对照：**

| 维度 | Python | JavaScript |
| --- | --- | --- |
| 主线程模型 | 多线程 + GIL | 单线程事件循环（无 GIL） |
| CPU 密集 | 多进程绕开 GIL | Worker / `worker_threads` |
| IO 密集 | 多线程有效 | `Promise.all` 天然并发 |
| 共享数据安全 | GIL 不等于安全，要 Lock | 单线程无需锁；`SharedArrayBuffer` 用 `Atomics` |

<CodeCompare>

<template #python>

```python
# 选型口诀：IO 密集 → 线程/异步；CPU 密集 → 进程；海量连接 → asyncio
import threading
t = threading.Thread(target=worker, args=(1,), daemon=True)
# daemon：主程序退出即收摊
t.start(); t.join()

from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
with ThreadPoolExecutor(max_workers=8) as pool:
# 线程池：批量抓 8 个 URL
    futures = {pool.submit(fetch, u): u for u in urls}
    for f in as_completed(futures):
        print(futures[f], f.result())
        # 谁先完成谁先出

with ProcessPoolExecutor() as pool:
# 进程池：绕开 GIL 吃满多核
    pool.map(cpu_heavy, data_chunks)
    # 代价：进程间传数据要序列化

# 线程安全：GIL 不等于安全！count += 1 不是原子操作
lock = threading.Lock()
with lock:
# 获取/自动释放
    count += 1
# queue.Queue 内置锁——生产者消费者优先用它，别手写 Condition

# 多进程要点：数据要 pickle 传输（大对象别跨进程传来传去）；
# __main__ 保护块在 Windows 上是必须的（子进程会重新 import 主模块）
if __name__ == "__main__":
    with ProcessPoolExecutor(4) as pool: ...
```

</template>

<template #js>

```js
// IO 密集：Promise.all 相当于线程池批量抓
const results = await Promise.all(urls.map(fetch));

// CPU 密集：Worker 线程（真并行，无 GIL 概念）
import { Worker } from "node:worker_threads";
const worker = new Worker("./cpu-heavy.js", { workerData: chunk });
worker.on("message", result => console.log(result));

// 谁先完成谁先出：Promise.any / 手写竞争
const first = await Promise.any(urls.map(fetch));

// 共享内存才需要同步原语
import { Atomics } from "node:worker_threads";
Atomics.add(sharedArray, 0, 1);
// ≈ Python 的 lock 保护 count += 1

// JS 没有 if __name__ == "__main__"，Worker 入口天然独立
```

</template>

</CodeCompare>

## 五、asyncio 异步编程

<CodeCompare>

<template #python>

```python
import asyncio

async def fetch_one(session, url: str) -> dict:
    async with session.get(url) as resp:
    # await：让出控制权给事件循环
        return await resp.json()

async def main():
    import aiohttp
    async with aiohttp.ClientSession() as session:
        # 并发 100 个请求：gather 打包并发跑，总耗时 ≈ 最慢的一个
        results = await asyncio.gather(*[fetch_one(session, u) for u in urls])
    print(results)

asyncio.run(main())
```

</template>

<template #js>

```js
async function fetchOne(url) {
  const resp = await fetch(url);
  // await：让出控制权给事件循环
  return resp.json();
}

async function main() {
  const results = await Promise.all(urls.map(fetchOne));
  // ≈ asyncio.gather
  console.log(results);
}

main();
// JS 顶层就能 await / 调用，不需要 asyncio.run
```

</template>

</CodeCompare>

- 心智模型：**单线程 + 事件循环**——`async def` 定义协程，`await` 处挂起、IO 完成处恢复。JS 的 async/await 同构，前端同学秒懂。
- 规则：**async 函数只能被 async 调用**；混用同步阻塞代码（`time.sleep`、requests）会卡死整个循环——阻塞库用 `asyncio.to_thread()` 包一层。JS 里同理：事件循环里别调 `fs.readFileSync`。
- 生态：HTTP 用 `aiohttp`/`httpx.AsyncClient`；DB 用 `asyncpg`/`SQLAlchemy async`。JS 用原生 `fetch` / `axios`。**FastAPI 端点直接写 async**（第 7 站 AI 流式服务的基础）。
- 线程 vs 协程：协程省线程内存、切换快，但一堵全堵且生态要 async 兼容；几千并发 IO 用协程，几十个用线程足够。

## 六、工程化：环境、依赖、规范、测试

<CodeCompare>

<template #python>

```bash
# 虚拟环境：每个项目一个隔离环境——Python 工程第一课，不建 venv 的教程都是耍流氓
python -m venv .venv
source .venv/bin/activate
# Windows: .venv\Scripts\activate
pip install requests
# 装进当前环境
pip freeze > requirements.txt
# 锁定依赖清单

# 现代工具链（2026 口径）：uv 一个工具全包（建环境/装包/锁文件/跑脚本，快 10-100 倍）
uv init && uv add fastapi
# 生成 pyproject.toml + uv.lock
uv sync && uv run main.py
# 复现环境并运行

# 代码规范：ruff（lint + format 二合一，替代 flake8+black 的事实标准）
ruff check . && ruff format .

# 测试：pytest（断言直接用 assert，fixture 做依赖注入）
pytest -q --cov=app
```

</template>

<template #js>

```bash
npm init -y
# ≈ uv init，生成 package.json
npm install axios
# ≈ uv add；生产依赖
npm install -D vitest
# ≈ devDependencies
npm install
# ≈ uv sync，按 lock 文件复现
npm run dev
# ≈ uv run main.py

npx eslint . --fix && npx prettier --write .
# ≈ ruff check + ruff format
npx vitest run --coverage
# ≈ pytest -q --cov
```

</template>

</CodeCompare>

| 概念 | Python | JavaScript |
| --- | --- | --- |
| 项目清单 | `pyproject.toml` | `package.json` |
| 锁文件 | `uv.lock` / `poetry.lock` | `package-lock.json` / `pnpm-lock.yaml` |
| 虚拟环境 | `.venv` | `node_modules`（项目级隔离） |
| 安装命令 | `pip install` | `npm install` |
| Lint+Format | `ruff` | `eslint` + `prettier` |
| 测试 | `pytest` | `vitest` / `jest` |

<CodeCompare>

<template #python>

```python
# pytest 惯用法
import pytest

@pytest.fixture
def db():
# fixture：测试前置资源，自动注入参数
    conn = make_test_db()
    yield conn
    # yield 前 setup、后 teardown
    conn.close()

@pytest.mark.parametrize("raw,expected", [("3", 3), ("-1", -1)])
def test_parse_int(raw, expected):
    assert parse_int(raw) == expected
```

</template>

<template #js>

```js
import { describe, it, expect, beforeEach, afterEach } from "vitest";

let conn;
beforeEach(() => { conn = makeTestDb(); });
// ≈ fixture 的 setup
afterEach(() => { conn.close(); });
// ≈ fixture 的 teardown

it.each([["3", 3], ["-1", -1]])("parse %s", (raw, expected) => {
// ≈ parametrize
  expect(parseInt(raw, 10)).toBe(expected);
});
```

</template>

</CodeCompare>

- 项目结构最小模板：`src/包名/`（代码）+ `tests/` + `pyproject.toml`（元数据与工具配置统一入口）。JS 对应 `src/` + `tests/` + `package.json`。
- 版本号语义 `MAJOR.MINOR.PATCH`；依赖写范围 `fastapi>=0.115,<1`，锁文件保证可复现——和 `package.json` 里的 `^1.2.0` + lock 文件是同一套逻辑。

## 七、Python / JS / Java 心智对照（给转过来的同学）

| 维度 | Java | Python | JavaScript |
| --- | --- | --- | --- |
| 类型 | 静态编译期检查 | 动态运行期 + 可选注解 + Pydantic 校验 | 动态 + TS 可选静态层 + Zod 运行期校验 |
| 并发单位 | 线程真多核 | GIL 限线程 → 多进程/协程组合拳 | 单线程事件循环 + Worker + 协程 |
| 空 | null（NPE 之乡） | None（`if x is None`），truthy/falsy 泛化 | null / undefined，`??` 兜底，truthy 规则不同 |
| 数据载体 | POJO/record | dict / dataclass / Pydantic BaseModel | 对象字面量 / class / Zod schema |
| 构建 | Maven/Gradle | pip/uv/poetry + pyproject.toml | npm/pnpm + package.json |
| 框架哲学 | 注解 + DI 容器 | 显式函数调用 + 装饰器；"可读性优先" | 中间件 / HOC / 函数式组合 |

## 八、本章自检清单

1. GIL 是什么？为什么多线程跑不满多核、但 IO 密集又有效？怎么绕开？（JS 为什么不需要 GIL？）
2. 生成器和返回 list 的函数比，优势在哪？`yield` 时函数状态放哪里？（JS `function*` 对照）
3. 白板写一个带参数的 `@retry` 装饰器，并解释 `functools.wraps` 的作用。（用 JS 高阶函数写一遍）
4. `count += 1` 在线程里为什么不安全？三种并发原语（Lock/Queue/信号量）怎么选？（JS 单线程下为什么大多不需要锁？）
5. 协程和线程的区别？`asyncio.gather` 干什么？为什么 `time.sleep` 会卡死事件循环？（对照 `Promise.all` 和同步 `readFileSync`）
6. 类型注解在运行时生效吗？Pydantic 和 typing 的分工？（对照 TS + Zod）
7. 为什么必须用虚拟环境？venv/poetry/uv 各解决什么？（对照 npm + node_modules）
8. `if __name__ == "__main__"` 在多进程程序里为什么是 Windows 的硬性要求？（JS 用什么判断入口？）

下一站 → [Flask Web 开发](./flask)：把语言本事变成 HTTP 服务。
