# Advanced Python & Engineering

> Stop 2: from "works" to "idiomatic". This stop decides whether your code reads like Python — and whether you can survive real web/data/AI codebases. **GIL, decorators, generators, and asyncio are the four hottest Python/AI interview topics in China's market.**
>
> **How to read**: every Python concept is immediately followed by a **JS counterpart**. The asyncio section is nearly line-for-line identical to what you already write.

## 1. Iterators and generators

<CodeCompare>

<template #python>

```python
# Iterable = has __iter__; Iterator = has __next__, consumed once
it = iter([1, 2, 3])
next(it)
# 1; raises StopIteration when exhausted — for loops just catch it

# generator function: any function containing yield — lazy, state auto-saved
def countdown(n: int):
    while n > 0:
        yield n
        # pause here, hand out a value, resume exactly here next time
        n -= 1

list(countdown(3))
# [3, 2, 1]

# why it matters: stream a 10GB log without exploding memory, infinite sequences, pipelines
def parse(lines):
# generators compose into pipelines; each row flows through all stages
    return (line.split("|") for line in lines if line.strip())
```

</template>

<template #js>

```js
const it = [1, 2, 3][Symbol.iterator]();
it.next();
// { value: 1, done: false } — JS uses done, Python raises StopIteration

function* countdown(n) {
  while (n > 0) yield n--;
  // yield pause/resume — almost identical semantics
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

- `yield` vs `return`: the frame (locals + instruction pointer) is suspended, not destroyed.
- Generator expression `(x*x for x in xs)` vs list comprehension `[...]`: the latter computes and stores everything now. JS counterpart: `yield*` / `Array.from(generator)`.
- Interview follow-ups: **the iter()/next() protocol, what exactly `yield` preserves, `send/as.throw` awareness**.

## 2. Decorators and function power-ups

<CodeCompare>

<template #python>

```python
import functools
import time

def retry(times: int = 3, delay: float = 1.0):
    """decorator with arguments: three layers (args → decorator → wrapper)"""
    def deco(func):
        @functools.wraps(func)
        # preserves __name__/__doc__ — interview detail points
        def wrapper(*args, **kwargs):
            for i in range(times):
                try:
                    return func(*args, **kwargs)
                except Exception:
                    if i == times - 1:
                        raise
                    time.sleep(delay * (2 ** i))
                    # exponential backoff
        return wrapper
    return deco

@retry(times=5, delay=0.5)
def call_llm(prompt: str) -> str: ...
# auto-retry — bread and butter of AI/network code

@functools.lru_cache(maxsize=256)
# stdlib memoization for pure functions
def fib(n: int) -> int:
    return n if n < 2 else fib(n - 1) + fib(n - 2)

@functools.cache
# 3.9+: unbounded shorthand
def heavy(x): ...
```

</template>

<template #js>

```js
// JS has no @decorator syntax (still a proposal) — wrap with a higher-order function
function retry(times = 3, delay = 1000) {
  return function (func) {
    return async function (...args) {
      for (let i = 0; i < times; i++) {
        try {
          return await func(...args);
        } catch (e) {
          if (i === times - 1) throw e;
          await new Promise(r => setTimeout(r, delay * 2 ** i));
          // exponential backoff
        }
      }
    };
  };
}

const callLLM = retry(5, 500)(async (prompt) => { /* ... */ });
// ≈ Python's @retry(times=5, delay=0.5) def call_llm(...)

// lru_cache: lodash.memoize or a Map of your own
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

- Essence: `@deco` is literally `func = deco(func)` — **a higher-order function wrapping a function**. In JS: `const f = deco(f)`.
- Typical uses: logging/timing, retries, caching, auth, registration hooks. Frontend HOCs and Express/Koa middleware are the same idea.
- `functools.wraps` preserves metadata; in JS use `Object.defineProperty(wrapper, "name", ...)`.

## 3. Type annotations and runtime validation

<CodeCompare>

<template #python>

```python
from typing import Optional, Union, Literal, TypedDict

def find_user(uid: int, active: bool = True) -> Optional[dict]:
# 3.10+: dict | None
    ...

# annotations don't affect runtime (Python stays dynamic) — they serve IDEs and mypy/pyright.
# Real-project stance: full annotations on new code + mypy in CI — a maturity signal.

Point = tuple[float, float]
# type alias (3.9+: builtin containers subscript directly)
class Config(TypedDict):
# give dicts a shape
    host: str
    port: int

# Pydantic (the bedrock of the AI ecosystem — FastAPI and LangChain both run on it):
# annotations + REAL runtime validation
from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    temperature: float = Field(default=0.7, ge=0, le=2)
    # out of range → automatic 422

ChatRequest.model_validate({"prompt": "hi"})
# JSON → object, errors pinpointed to the field
```

</template>

<template #js>

```ts
// Type annotations → TypeScript (compile-time, erased at runtime — same role as Python annotations)
type Point = [number, number];
interface Config { host: string; port: number; }
function findUser(uid: number, active = true): User | null { /* ... */ }
```

</template>

</CodeCompare>

```js
// Runtime validation → Zod (the direct JS counterpart of Pydantic)
import { z } from "zod";

const ChatRequest = z.object({
  prompt: z.string().min(1).max(4000),
  temperature: z.number().min(0).max(2).default(0.7),
});

ChatRequest.parse({ prompt: "hi" });
// throws with field-level detail
// FastAPI turns Pydantic failures into 422 automatically; Express must catch ZodError itself
```

- `typing` is for humans and checkers; Pydantic actually blocks at the gate — in JS that's **TS (compile-time) + Zod (runtime)**, exactly the same two layers.

## 4. The GIL and concurrency models (guaranteed exam topic)

**The GIL (Global Interpreter Lock)**: in CPython only one thread executes bytecode at a time.

- Why: protects reference-count thread-safety — a historical implementation decision, not a language mandate.
- Consequence: **threads can't use multiple cores** — CPU-bound threading doesn't speed up (often slows down).
- Escape hatch: threads release the GIL during IO waits / C-extension calls (NumPy math, codecs) — **IO-bound threading still works fine**.
- Evolution: experimental free-threading builds since 3.13 (PEP 703), pushed further in 3.14; ecosystem still catching up — a one-liner here scores points.

**JS counterpart:**

| Axis | Python | JavaScript |
| --- | --- | --- |
| Main thread | multi-thread + GIL | single-thread event loop (no GIL) |
| CPU-bound | processes to bypass GIL | Worker / `worker_threads` |
| IO-bound | threads work | `Promise.all` concurrency |
| Shared state | GIL isn't safety — use Lock | single thread needs no lock; `SharedArrayBuffer` uses `Atomics` |

<CodeCompare>

<template #python>

```python
# selection mantra: IO-bound → threads/async; CPU-bound → processes; massive connections → asyncio
import threading
t = threading.Thread(target=worker, args=(1,), daemon=True)
# daemon: dies with the main program
t.start(); t.join()

from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
with ThreadPoolExecutor(max_workers=8) as pool:
# thread pool: fetch 8 URLs at once
    futures = {pool.submit(fetch, u): u for u in urls}
    for f in as_completed(futures):
        print(futures[f], f.result())
        # first done, first out

with ProcessPoolExecutor() as pool:
# process pool: sidestep the GIL
    pool.map(cpu_heavy, data_chunks)
    # cost: pickling data across processes

# thread safety: a GIL is NOT safety! count += 1 is not atomic
lock = threading.Lock()
with lock:
# acquire / auto-release
    count += 1
# queue.Queue has its own lock — reach for producer/consumer before hand-rolling Conditions

# multiprocessing notes: data crosses processes by pickle (don't shuttle big objects around);
# the __main__ guard is MANDATORY on Windows (children re-import the main module)
if __name__ == "__main__":
    with ProcessPoolExecutor(4) as pool: ...
```

</template>

<template #js>

```js
// IO-bound: Promise.all ≈ thread pool fetching URLs
const results = await Promise.all(urls.map(fetch));

// CPU-bound: real parallel workers, no GIL concept
import { Worker } from "node:worker_threads";
const worker = new Worker("./cpu-heavy.js", { workerData: chunk });
worker.on("message", result => console.log(result));

// first done, first out
const first = await Promise.any(urls.map(fetch));

// shared memory needs atomics
import { Atomics } from "node:worker_threads";
Atomics.add(sharedArray, 0, 1);
// ≈ Lock protecting count += 1

// JS has no if __name__ == "__main__" — worker entry files are naturally separate
```

</template>

</CodeCompare>

## 5. asyncio

<CodeCompare>

<template #python>

```python
import asyncio

async def fetch_one(session, url: str) -> dict:
    async with session.get(url) as resp:
    # await: yield control to the event loop
        return await resp.json()

async def main():
    import aiohttp
    async with aiohttp.ClientSession() as session:
        # 100 concurrent requests: gather runs them together; total ≈ the slowest one
        results = await asyncio.gather(*[fetch_one(session, u) for u in urls])
    print(results)

asyncio.run(main())
```

</template>

<template #js>

```js
async function fetchOne(url) {
  const resp = await fetch(url);
  // yield control to the event loop
  return resp.json();
}

async function main() {
  const results = await Promise.all(urls.map(fetchOne));
  // ≈ asyncio.gather
  console.log(results);
}

main();
// no asyncio.run needed in JS
```

</template>

</CodeCompare>

- Mental model: **one thread + an event loop** — `async def` defines coroutines, `await` suspends, IO completion resumes. Identical to JS async/await; frontend devs pick it up in an afternoon.
- Rules: **coroutines can only be awaited from coroutines**; blocking calls (`time.sleep`, requests) freeze the entire loop — wrap them with `asyncio.to_thread()`. In JS, avoid `fs.readFileSync` inside async flows for the same reason.
- Ecosystem: `aiohttp`/`httpx.AsyncClient` for HTTP; `asyncpg`/async SQLAlchemy for DBs. JS uses native `fetch` / `axios`. **FastAPI endpoints are plain async** (basis of AI streaming at stop 7).
- Threads vs coroutines: coroutines save memory and switch cheaply, but one block stalls all and the ecosystem must be async-ready; thousands of concurrent IO → coroutines, dozens → threads are fine.

## 6. Engineering: environments, dependencies, style, tests

<CodeCompare>

<template #python>

```bash
# virtualenv: one isolated environment per project — lesson
#1 of Python engineering
python -m venv .venv
source .venv/bin/activate
# Windows: .venv\Scripts\activate
pip install requests
# installs into the active environment
pip freeze > requirements.txt
# dependency manifest

# modern toolchain (2026 stance): uv does everything (envs/install/lock/run, 10-100× faster)
uv init && uv add fastapi
# generates pyproject.toml + uv.lock
uv sync && uv run main.py
# reproduce the environment and run

# style: ruff (lint + format in one — the de-facto successor to flake8+black)
ruff check . && ruff format .

# testing: pytest (bare assert + fixture injection)
pytest -q --cov=app
```

</template>

<template #js>

```bash
npm init -y
# ≈ uv init, generates package.json
npm install axios
# ≈ uv add; production dependency
npm install -D vitest
# ≈ devDependencies
npm install
# ≈ uv sync, reproduce from lock file
npm run dev
# ≈ uv run main.py

npx eslint . --fix && npx prettier --write .
# ≈ ruff check + ruff format
npx vitest run --coverage
# ≈ pytest -q --cov
```

</template>

</CodeCompare>

| Concept | Python | JavaScript |
| --- | --- | --- |
| Manifest | `pyproject.toml` | `package.json` |
| Lock file | `uv.lock` / `poetry.lock` | `package-lock.json` / `pnpm-lock.yaml` |
| Isolation | `.venv` | `node_modules` (per-project) |
| Install | `pip install` | `npm install` |
| Lint + format | `ruff` | `eslint` + `prettier` |
| Tests | `pytest` | `vitest` / `jest` |

<CodeCompare>

<template #python>

```python
# pytest idioms
import pytest

@pytest.fixture
def db():
# fixture: per-test resources injected as parameters
    conn = make_test_db()
    yield conn
    # before yield = setup, after = teardown
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
// ≈ fixture setup
afterEach(() => { conn.close(); });
// ≈ fixture teardown

it.each([["3", 3], ["-1", -1]])("parse %s", (raw, expected) => {
// ≈ parametrize
  expect(parseInt(raw, 10)).toBe(expected);
});
```

</template>

</CodeCompare>

- Minimal layout: `src/packagename/` (code) + `tests/` + `pyproject.toml`. JS counterpart: `src/` + `tests/` + `package.json`.
- SemVer `MAJOR.MINOR.PATCH`; depend on ranges `fastapi>=0.115,<1`, lock files for reproducibility — same logic as `^1.2.0` in `package.json` plus a lock file.

## 7. Python / JS / Java mindmap (for switchers)

| Axis | Java | Python | JavaScript |
| --- | --- | --- | --- |
| Types | static, compile-time | dynamic, runtime + optional annotations + Pydantic checks | dynamic + optional TS static layer + Zod runtime checks |
| Concurrency | real multi-core threads | GIL-capped threads → processes/coroutines combo | single-thread event loop + Workers + coroutines |
| Nothingness | null (home of NPE) | None (`if x is None`), truthy/falsy generalized | null / undefined, `??` fallback, different truthy rules |
| Data carriers | POJO/record | dict / dataclass / Pydantic BaseModel | object literals / class / Zod schema |
| Build | Maven/Gradle | pip/uv/poetry + pyproject.toml | npm/pnpm + package.json |
| Framework style | annotations + DI container | explicit calls + decorators; readability first | middleware / HOC / functional composition |

## 8. Self-check

1. What is the GIL? Why can't threads saturate cores, yet IO-bound threading still helps? Workarounds? (Why doesn't JS need a GIL?)
2. Generators vs a function returning a list — the advantage? Where does a suspended `yield` keep its state? (JS `function*`)
3. Whiteboard a parameterized `@retry`; explain what `functools.wraps` preserves. (Write it as a JS higher-order function)
4. Why isn't `count += 1` thread-safe? Choosing among Lock / Queue / Semaphore? (Why is a lock rarely needed in single-threaded JS?)
5. Coroutines vs threads? What does `asyncio.gather` do? Why does `time.sleep` freeze the loop? (Compare `Promise.all` and sync `readFileSync`)
6. Do type annotations run at runtime? Division of labor between Pydantic and typing? (TS + Zod)
7. Why must you use a virtualenv? What do venv/poetry/uv each solve? (npm + node_modules)
8. Why is `if __name__ == "__main__"` a hard requirement for multiprocessing on Windows? (What does JS use?)

Next stop → [Flask Web Development](./flask): turn language skills into HTTP services.
