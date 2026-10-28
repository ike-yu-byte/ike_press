# Advanced Python & Engineering

> Stop 2: from "works" to "idiomatic". This stop decides whether your code reads like Python — and whether you can survive real web/data/AI codebases. **GIL, decorators, generators, and asyncio are the four hottest Python/AI interview topics in China's market.**

## 1. Iterators and generators

```python
# Iterable = has __iter__; Iterator = has __next__, consumed once
it = iter([1, 2, 3])
next(it)          # 1; raises StopIteration when exhausted — for loops just catch it

# generator function: any function containing yield — lazy, state auto-saved
def countdown(n: int):
    while n > 0:
        yield n       # pause here, hand out a value, resume exactly here next time
        n -= 1

list(countdown(3))    # [3, 2, 1]

# why it matters: stream a 10GB log without exploding memory, infinite sequences, pipelines
def parse(lines):      # generators compose into pipelines; each row flows through all stages
    return (line.split("|") for line in lines if line.strip())
```

- `yield` vs `return`: the frame (locals + instruction pointer) is suspended, not destroyed.
- Generator expression `(x*x for x in xs)` vs list comprehension `[...]`: the latter computes and stores everything now.
- Interview follow-ups: **the iter()/next() protocol, what exactly `yield` preserves, `send/as.throw` awareness**.

## 2. Decorators and function power-ups

```python
import functools
import time

def retry(times: int = 3, delay: float = 1.0):
    """decorator with arguments: three layers (args → decorator → wrapper)"""
    def deco(func):
        @functools.wraps(func)               # preserves __name__/__doc__ — interview detail points
        def wrapper(*args, **kwargs):
            for i in range(times):
                try:
                    return func(*args, **kwargs)
                except Exception:
                    if i == times - 1:
                        raise
                    time.sleep(delay * (2 ** i))   # exponential backoff
        return wrapper
    return deco

@retry(times=5, delay=0.5)
def call_llm(prompt: str) -> str: ...        # auto-retry — bread and butter of AI/network code

@functools.lru_cache(maxsize=256)            # stdlib memoization for pure functions
def fib(n: int) -> int:
    return n if n < 2 else fib(n - 1) + fib(n - 2)

@functools.cache                             # 3.9+: unbounded shorthand
def heavy(x): ...
```

- Essence: `@deco` is literally `func = deco(func)` — **a higher-order function wrapping a function**.
- Typical uses: logging/timing, retries, caching, auth (Flask/Django route & login guards are decorators), registration hooks.
- Class decorators and `functools.wraps` are the second follow-up; whiteboarding a parameterized decorator = pass.

## 3. Type annotations and runtime validation

```python
from typing import Optional, Union, Literal, TypedDict

def find_user(uid: int, active: bool = True) -> Optional[dict]:   # 3.10+: dict | None
    ...

# annotations don't affect runtime (Python stays dynamic) — they serve IDEs and mypy/pyright.
# Real-project stance: full annotations on new code + mypy in CI — a maturity signal.

Point = tuple[float, float]                  # type alias (3.9+: builtin containers subscript directly)
class Config(TypedDict):                     # give dicts a shape
    host: str
    port: int

# Pydantic (the bedrock of the AI ecosystem — FastAPI and LangChain both run on it):
# annotations + REAL runtime validation
from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    temperature: float = Field(default=0.7, ge=0, le=2)   # out of range → automatic 422

ChatRequest.model_validate({"prompt": "hi"})  # JSON → object, errors pinpointed to the field
```

- `typing` is for humans and checkers; Pydantic actually blocks at the gate — being able to separate these two layers is itself an interview answer.

## 4. The GIL and concurrency models (guaranteed exam topic)

**The GIL (Global Interpreter Lock)**: in CPython only one thread executes bytecode at a time.

- Why: protects reference-count thread-safety — a historical implementation decision, not a language mandate.
- Consequence: **threads can't use multiple cores** — CPU-bound threading doesn't speed up (often slows down).
- Escape hatch: threads release the GIL during IO waits / C-extension calls (NumPy math, codecs) — **IO-bound threading still works fine**.
- Evolution: experimental free-threading builds since 3.13 (PEP 703), pushed further in 3.14; ecosystem still catching up — a one-liner here scores points.

```python
# selection mantra: IO-bound → threads/async; CPU-bound → processes; massive connections → asyncio
import threading
t = threading.Thread(target=worker, args=(1,), daemon=True)   # daemon: dies with the main program
t.start(); t.join()

from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
with ThreadPoolExecutor(max_workers=8) as pool:               # thread pool: fetch 8 URLs at once
    futures = {pool.submit(fetch, u): u for u in urls}
    for f in as_completed(futures):
        print(futures[f], f.result())                         # first done, first out

with ProcessPoolExecutor() as pool:                           # process pool: sidestep the GIL
    pool.map(cpu_heavy, data_chunks)                          # cost: pickling data across processes

# thread safety: a GIL is NOT safety! count += 1 is not atomic
lock = threading.Lock()
with lock:                       # acquire / auto-release
    count += 1
# queue.Queue has its own lock — reach for producer/consumer before hand-rolling Conditions

# multiprocessing notes: data crosses processes by pickle (don't shuttle big objects around);
# the __main__ guard is MANDATORY on Windows (children re-import the main module)
if __name__ == "__main__":
    with ProcessPoolExecutor(4) as pool: ...
```

## 5. asyncio

```python
import asyncio

async def fetch_one(session, url: str) -> dict:
    async with session.get(url) as resp:          # await: yield control to the event loop
        return await resp.json()

async def main():
    import aiohttp
    async with aiohttp.ClientSession() as session:
        # 100 concurrent requests: gather runs them together; total ≈ the slowest one
        results = await asyncio.gather(*[fetch_one(session, u) for u in urls])
    print(results)

asyncio.run(main())
```

- Mental model: **one thread + an event loop** — `async def` defines coroutines, `await` suspends, IO completion resumes. Identical to JS async/await; frontend devs pick it up in an afternoon.
- Rules: **coroutines can only be awaited from coroutines**; blocking calls (`time.sleep`, requests) freeze the entire loop — wrap them with `asyncio.to_thread()`.
- Ecosystem: `aiohttp`/`httpx.AsyncClient` for HTTP; `asyncpg`/async SQLAlchemy for DBs. **FastAPI endpoints are plain async** (the basis of AI streaming services at stop 7).
- Threads vs coroutines: coroutines save memory and switch cheaply, but one block stalls all and the ecosystem must be async-ready; thousands of concurrent IO → coroutines, dozens → threads are fine.

## 6. Engineering: environments, dependencies, style, tests

```bash
# virtualenv: one isolated environment per project — lesson #1 of Python engineering
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install requests             # installs into the active environment
pip freeze > requirements.txt    # dependency manifest

# modern toolchain (2026 stance): uv does everything (envs/install/lock/run, 10-100× faster)
uv init && uv add fastapi        # generates pyproject.toml + uv.lock
uv sync && uv run main.py        # reproduce the environment and run

# style: ruff (lint + format in one — the de-facto successor to flake8+black)
ruff check . && ruff format .

# testing: pytest (bare assert + fixture injection)
pytest -q --cov=app
```

```python
# pytest idioms
import pytest

@pytest.fixture
def db():                        # fixture: per-test resources injected as parameters
    conn = make_test_db()
    yield conn                   # before yield = setup, after = teardown
    conn.close()

@pytest.mark.parametrize("raw,expected", [("3", 3), ("-1", -1)])
def test_parse_int(raw, expected):
    assert parse_int(raw) == expected
```

- Minimal layout: `src/packagename/` (code) + `tests/` + `pyproject.toml` (single front door for metadata and tool config).
- SemVer `MAJOR.MINOR.PATCH`; depend on ranges `fastapi>=0.115,<1`, lock files for reproducibility — the same lesson as Maven version arbitration in the Java section.

## 7. Python vs Java mindmap (for switchers)

| Axis | Java | Python |
| --- | --- | --- |
| Types | static, compile-time | dynamic, runtime + optional annotations + Pydantic checks |
| Concurrency | real multi-core threads | GIL-capped threads → processes/coroutines combo |
| Nothingness | null (home of NPE) | None (`if x is None`), truthy/falsy generalized |
| Data carriers | POJO/record | dict / dataclass / Pydantic BaseModel |
| Build | Maven/Gradle | pip/uv/poetry + pyproject.toml |
| Framework style | annotations + DI container | explicit calls + decorators; readability first |

## 8. Self-check

1. What is the GIL? Why can't threads saturate cores, yet IO-bound threading still helps? Workarounds?
2. Generators vs a function returning a list — the advantage? Where does a suspended `yield` keep its state?
3. Whiteboard a parameterized `@retry`; explain what `functools.wraps` preserves.
4. Why isn't `count += 1` thread-safe? Choosing among Lock / Queue / Semaphore?
5. Coroutines vs threads? What does `asyncio.gather` do? Why does `time.sleep` freeze the loop?
6. Do type annotations run at runtime? Division of labor between Pydantic and typing?
7. Why must you use a virtualenv? What do venv/poetry/uv each solve?
8. Why is `if __name__ == "__main__"` a hard requirement for multiprocessing on Windows?

Next stop → [Flask Web Development](./flask): turn language skills into HTTP services.
