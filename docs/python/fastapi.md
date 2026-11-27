# FastAPI 入门

> 第 3 站（补充）：FastAPI 是 Python AI 服务化的事实标准。它把**类型注解、运行时校验、异步、OpenAPI 文档**揉在一起，写起来像 Express 一样轻，能力却接近 NestJS。本章从安装写到部署，最后接 Dify 自定义工具。
>
> **阅读方式**：代码对照沿用 **左 Python、右 JS/TS** 的双栏组件；注释统一写在代码行下面。

## 一、安装与第一个接口

```bash
python -m venv .venv
# 创建虚拟环境

# Windows PowerShell
.\.venv\Scripts\Activate.ps1
# 激活虚拟环境

pip install "fastapi[standard]"
# 一次装齐 fastapi / uvicorn / pydantic 等

uvicorn main:app --reload
# 启动开发服务器，改代码自动重启
```

**JS 对照：**

```bash
npm init -y
# 生成 package.json

npm install express
# 安装 Express

node --watch app.js
# 开发模式，改代码自动重启
```

新建 `main.py`：

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

访问：

- `http://127.0.0.1:8000/` → `{"msg":"hello"}`
- `http://127.0.0.1:8000/hello?name=小明` → `{"msg":"hello, 小明"}`
- `http://127.0.0.1:8000/docs` → 自动生成的交互式 API 文档

> 这三件套是 FastAPI 的核心卖点：**Pydantic 模型 = 契约**、**Depends = 依赖注入**、**async 端点 = 高并发 IO**。

## 二、三种参数怎么区分（最容易混）

FastAPI 按**类型和位置**判断参数来自哪里，不靠参数名：

| 写法 | 来源 | 例子 |
| --- | --- | --- |
| 路径里声明的变量 | URL 路径 | `/users/{user_id}` → `user_id: int` |
| 简单类型（str/int/bool/float） | 查询参数 | `?keyword=abc` → `keyword: str = ""` |
| Pydantic `BaseModel` 类型 | JSON 请求体 | `body: UserIn` |
| `Request` 类型 | 整个请求对象 | 读 headers / cookies |

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

调用：

```text
POST /users/1?keyword=vip
Content-Type: application/json

{"name": "小明", "age": 20}
```

- 参数顺序可以打乱，FastAPI 按类型注入。
- `keyword: str = ""` 是**可选查询参数**；不写默认值就是必填，缺了返回 `422`。
- 如果只写 `location: str`，它会被当成查询参数，而不是请求体。

## 三、Pydantic 模型：校验、别名与响应模型

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

要点：

- `Field(min_length=1)`、`ge=0` 这类约束在请求进入业务层前就生效，失败自动返回 `422`。
- `response_model=UserOut` 会**过滤掉未声明字段**，上面的 `password` 不会出现在响应里。
- `alias_generator` 让 Python 的 `user_name` 接收前端的 `userName`，不用改前端字段风格。

## 四、错误处理

<CodeCompare>

<template #python>

```python
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

@app.get("/users/{user_id}")
def get_user(user_id: int):
    user = db.find(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="用户不存在")

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
  if (!user) return res.status(404).json({ detail: "用户不存在" });
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

- `raise HTTPException(...)` 会被 FastAPI 转成 JSON 响应，不需要自己 `return`。
- Pydantic 校验失败固定返回 `422`，响应体里有精确到字段的错误信息。
- 用 `@app.exception_handler(异常类型)` 做全局兜底，避免 HTML 错误页。

## 五、依赖注入 Depends

依赖注入适合放**每个请求都要用的东西**：数据库连接、当前用户、配置。

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
        raise HTTPException(status_code=401, detail="未登录")
    return verify_token(authorization[7:], db)

@app.get("/me")
def me(user: Annotated[User, Depends(current_user)]):
    return user
```

</template>

<template #js>

```js
// Express 没有内置 DI，通常用中间件把数据挂到 req 上
function auth(req, res, next) {
  const token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
  if (!token) return res.status(401).json({ detail: "未登录" });
  req.user = verifyToken(token);
  next();
}

app.get("/me", auth, (req, res) => {
  res.json(req.user);
});
```

</template>

</CodeCompare>

- `yield` 的依赖会在响应结束后执行 `finally` 里的清理逻辑。
- `Annotated[类型, Depends(...)]` 是 0.95+ 推荐写法，可读性好。
- NestJS 的 provider / guard 和它是同一类思想。

## 六、async 端点与阻塞任务

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
    # CPU 密集或同步阻塞库，丢到线程里，别卡事件循环
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
  // Node 同样怕同步阻塞，重 CPU 任务交给 Worker
  const result = await buildReportAsync();
  res.json({ result });
});
```

</template>

</CodeCompare>

- `async def` 里可以 `await` 其它协程；同步阻塞代码（比如 `requests`）会卡住整个事件循环。
- 兼容老库用 `asyncio.to_thread(...)`；CPU 密集任务得多进程或 Worker。

## 七、流式响应：SSE 逐 token 输出

AI 应用最常见需求：模型边生成边推给前端。

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

- SSE 的格式是 `data: 内容\n\n`，前端用 `EventSource` 接收。
- 生成式 AI 场景靠它把首字延迟（TTFT）降下来。

## 八、中间件与 CORS

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

## 九、OpenAPI 文档与 Dify 自定义工具

FastAPI 自动生成 `/docs`（Swagger UI）和 `/openapi.json`。Dify 的自定义工具可以直接导入这份 OpenAPI。

```python
from fastapi import FastAPI

app = FastAPI(
    title="天气查询",
    version="1.0",
    description="Dify 自定义工具用的 OpenAPI 服务",
)

@app.post(
    "/weather",
    summary="查询城市天气",
    operation_id="get_current_weather",
    description="按城市名返回当天天气，需要 Bearer Token",
)
def get_current_weather(body: WeatherRequest):
    ...
```

Dify 配置步骤：

1. 打开 Dify → 工具 → 创建自定义工具。
2. 填入 OpenAPI Schema 地址：`http://你的域名/openapi.json`。
3. 权限认证选 **API Key**，位置选 **Header**，名称填 `Authorization`，值填 `Bearer 你的令牌`。
4. 保存后，在 Agent 里把工具加进去即可调用。

把服务公网暴露可用 localtunnel / ngrok，或部署到云服务器。生产环境记得关掉 `docs_url` 或加访问保护。

## 十、部署

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
# 单进程

uvicorn main:app --workers 4
# 多进程，CPU 核数决定 worker 数

gunicorn main:app -k uvicorn.workers.UvicornWorker -w 4
# Gunicorn 做进程管理，生产更稳
```

Docker 最小示例：

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 十一、本章自检清单

1. `user_id: int`、`q: str = ""`、`body: UserIn` 分别来自哪里？
2. 为什么函数参数顺序可以打乱？
3. Pydantic 校验失败返回什么状态码？
4. `Depends` 里用 `yield` 有什么好处？
5. 为什么 `async def` 里不能直接调 `requests.get`？
6. SSE 响应的 `media_type` 和数据格式是什么？
7. Dify 导入 OpenAPI 时，API Key 放在哪里？

下一站 → [Django 全栈框架](./django)：对比"全家桶"与"轻量异步"两种哲学。
