# FastAPI Fundamentals

> Stop 3 (supplement): FastAPI is the de-facto standard for serving Python AI applications. It blends **type hints, runtime validation, async, and OpenAPI docs** into a framework as light as Express yet as capable as NestJS. This chapter goes from installation to deployment, ending with a Dify custom tool.
>
> **How to read**: code comparisons use the **left Python / right JS/TS** two-column component; comments sit below the code line.

## 1. Installation and the first endpoint

```bash
python -m venv .venv
# create a virtual environment

# Windows PowerShell
.\.venv\Scripts\Activate.ps1
# activate it

pip install "fastapi[standard]"
# installs fastapi / uvicorn / pydantic and friends

uvicorn main:app --reload
# dev server with auto-reload
```

**JS counterpart:**

```bash
npm init -y
# generate package.json

npm install express
# install Express

node --watch app.js
# dev mode with auto-reload
```

Create `main.py`:

<CodeCompare>

<template #python>

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"msg": "hello"}

@app.get("/hello")
def hello(name: str = "world"):
    return {"msg": f"hello, {name}"}
```

</template>

<template #js>

```js
import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.json({ msg: "hello" });
});

app.get("/hello", (req, res) => {
  const name = req.query.name ?? "world";
  res.json({ msg: `hello, ${name}` });
});
```

</template>

</CodeCompare>

Visit:

- `http://127.0.0.1:8000/` → `{"msg":"hello"}`
- `http://127.0.0.1:8000/hello?name=Ann` → `{"msg":"hello, Ann"}`
- `http://127.0.0.1:8000/docs` → auto-generated interactive API docs

> The three pillars: **Pydantic models = contracts**, **Depends = dependency injection**, **async endpoints = high-concurrency IO**.

## 2. Telling parameter sources apart (the most common confusion)

FastAPI decides where a parameter comes from by **type and position**, not by name:

| Declaration | Source | Example |
| --- | --- | --- |
| variable declared in the path | URL path | `/users/{user_id}` → `user_id: int` |
| simple type (str/int/bool/float) | query string | `?keyword=abc` → `keyword: str = ""` |
| Pydantic `BaseModel` type | JSON body | `body: UserIn` |
| `Request` type | whole request object | read headers / cookies |

<CodeCompare>

<template #python>

```python
from fastapi import FastAPI, Request
from pydantic import BaseModel, Field

app = FastAPI()

class UserIn(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    age: int = Field(default=0, ge=0, le=150)

@app.post("/users/{user_id}")
def update_user(
    user_id: int,
    keyword: str = "",
    body: UserIn = ...,
    request: Request = ...,
):
    token = request.headers.get("Authorization", "")
    return {
        "user_id": user_id,
        "keyword": keyword,
        "name": body.name,
        "has_token": bool(token),
    }
```

</template>

<template #js>

```js
app.post("/users/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const keyword = req.query.keyword ?? "";
  const { name } = req.body;
  const token = req.headers.authorization ?? "";

  res.json({ userId, keyword, name, hasToken: Boolean(token) });
});
```

</template>

</CodeCompare>

Request:

```text
POST /users/1?keyword=vip
Content-Type: application/json

{"name": "Ann", "age": 20}
```

- Parameter order can be shuffled; FastAPI injects by type.
- `keyword: str = ""` is an **optional query param**; without a default it is required and missing it returns `422`.
- Writing only `location: str` makes it a query param, not a body field.

## 3. Pydantic models: validation, aliases, response models

<CodeCompare>

<template #python>

```python
from typing import Optional
from pydantic import BaseModel, Field, alias_generators

class UserIn(BaseModel):
    model_config = {"alias_generator": alias_generators.to_camel}

    user_name: str = Field(min_length=1)
    age: Optional[int] = Field(default=None, ge=0)

class UserOut(BaseModel):
    id: int
    user_name: str

@app.post("/users", response_model=UserOut, status_code=201)
def create_user(body: UserIn):
    return {"id": 1, "user_name": body.user_name, "password": "secret"}
```

</template>

<template #js>

```js
import { z } from "zod";

const UserIn = z.object({
  userName: z.string().min(1),
  age: z.number().int().min(0).optional(),
});

app.post("/users", (req, res) => {
  const parsed = UserIn.safeParse(req.body);
  if (!parsed.success) return res.status(422).json(parsed.error.flatten());

  const { userName } = parsed.data;
  res.status(201).json({ id: 1, userName });
});
```

</template>

</CodeCompare>

Key points:

- `Field(min_length=1)`, `ge=0` etc. run **before** business logic; failures return `422`.
- `response_model=UserOut` **filters undeclared fields**, so `password` never leaks out.
- `alias_generator` lets Python's `user_name` accept the frontend's `userName`.

## 4. Error handling

<CodeCompare>

<template #python>

```python
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

@app.get("/users/{user_id}")
def get_user(user_id: int):
    user = db.find(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return user

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=400,
        content={"error": str(exc)},
    )
```

</template>

<template #js>

```js
app.get("/users/:userId", (req, res, next) => {
  const user = db.find(Number(req.params.userId));
  if (!user) return res.status(404).json({ detail: "User not found" });
  res.json(user);
});

app.use((err, req, res, next) => {
  if (err instanceof ValueError) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});
```

</template>

</CodeCompare>

- `raise HTTPException(...)` is turned into a JSON response automatically.
- Pydantic validation failures always return `422` with field-level detail.
- `@app.exception_handler(类型)` gives a global fallback so no HTML error pages leak.

## 5. Dependency injection with Depends

Use dependencies for anything every request needs: DB sessions, current user, config.

<CodeCompare>

<template #python>

```python
from typing import Annotated
from fastapi import Depends, Header

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def current_user(
    authorization: Annotated[str, Header()] = "",
    db: Annotated[Session, Depends(get_db)] = ...,
):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not logged in")
    return verify_token(authorization[7:], db)

@app.get("/me")
def me(user: Annotated[User, Depends(current_user)]):
    return user
```

</template>

<template #js>

```js
// Express has no built-in DI — middleware attaches data to req
function auth(req, res, next) {
  const token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
  if (!token) return res.status(401).json({ detail: "Not logged in" });
  req.user = verifyToken(token);
  next();
}

app.get("/me", auth, (req, res) => {
  res.json(req.user);
});
```

</template>

</CodeCompare>

- A `yield` dependency runs its `finally` block after the response is sent.
- `Annotated[Type, Depends(...)]` is the recommended 0.95+ style.
- NestJS providers/guards are the same idea.

## 6. Async endpoints and blocking work

<CodeCompare>

<template #python>

```python
import asyncio
import httpx

@app.get("/fetch")
async def fetch(url: str):
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
    return {"status": resp.status_code}

@app.post("/report")
async def report():
    # CPU-heavy / blocking libraries: push to a thread, don't block the loop
    result = await asyncio.to_thread(build_report_sync)
    return {"result": result}
```

</template>

<template #js>

```js
app.get("/fetch", async (req, res) => {
  const resp = await fetch(req.query.url);
  res.json({ status: resp.status });
});

app.post("/report", async (req, res) => {
  // Node also fears sync blocking — hand heavy CPU work to a Worker
  const result = await buildReportAsync();
  res.json({ result });
});
```

</template>

</CodeCompare>

- In `async def` you can `await` other coroutines; blocking calls (e.g. `requests`) freeze the whole loop.
- Wrap legacy libraries with `asyncio.to_thread(...)`; CPU-bound work needs processes or Workers.

## 7. Streaming responses: SSE token by token

The most common AI app need: push tokens to the browser as they are generated.

<CodeCompare>

<template #python>

```python
from fastapi.responses import StreamingResponse

@app.get("/stream")
async def stream(q: str):
    async def gen():
        async for token in llm_stream(q):
            yield f"data: {token}\n\n"

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
    )
```

</template>

<template #js>

```js
app.get("/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");

  for await (const token of llmStream(req.query.q)) {
    res.write(`data: ${token}\n\n`);
  }

  res.end();
});
```

</template>

</CodeCompare>

- SSE format is `data: content\n\n`; the frontend uses `EventSource`.
- Generative AI uses it to cut time-to-first-token (TTFT).

## 8. Middleware and CORS

<CodeCompare>

<template #python>

```python
import time
from fastapi.middleware.cors import CORSMiddleware

@app.middleware("http")
async def add_timing(request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Time"] = f"{time.perf_counter() - start:.3f}"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://example.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

</template>

<template #js>

```js
app.use(async (req, res, next) => {
  const start = performance.now();
  res.on("finish", () => {
    console.log(performance.now() - start);
  });
  next();
});

app.use(cors({
  origin: "https://example.com",
}));
```

</template>

</CodeCompare>

## 9. OpenAPI docs and Dify custom tools

FastAPI generates `/docs` (Swagger UI) and `/openapi.json` automatically. Dify custom tools can import that OpenAPI directly.

```python
from fastapi import FastAPI

app = FastAPI(
    title="Weather Query",
    version="1.0",
    description="OpenAPI service for a Dify custom tool",
)

@app.post(
    "/weather",
    summary="Query city weather",
    operation_id="get_current_weather",
    description="Return today's weather for a city; requires Bearer token",
)
def get_current_weather(body: WeatherRequest):
    ...
```

Dify setup:

1. Dify → Tools → Create custom tool.
2. Enter the OpenAPI schema URL: `http://your-domain/openapi.json`.
3. Auth type **API Key**, location **Header**, name `Authorization`, value `Bearer your-token`.
4. Save, then add the tool to your Agent.

Expose the service publicly with localtunnel / ngrok or a cloud server. In production, disable `docs_url` or protect it.

## 10. Deployment

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
# single process

uvicorn main:app --workers 4
# multiple workers, usually the CPU core count

gunicorn main:app -k uvicorn.workers.UvicornWorker -w 4
# Gunicorn as process manager — sturdier in production
```

Minimal Dockerfile:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 11. Self-check

1. Where do `user_id: int`, `q: str = ""`, and `body: UserIn` come from?
2. Why can function parameters be shuffled?
3. What status code does a Pydantic validation failure return?
4. What does `yield` inside a `Depends` function buy you?
5. Why can't you call `requests.get` directly inside `async def`?
6. What is the `media_type` and data format of an SSE response?
7. In Dify, where does the API Key go when importing OpenAPI?

Next stop → [Django Full-Stack](./django): compare the "batteries included" and "light async" philosophies.
