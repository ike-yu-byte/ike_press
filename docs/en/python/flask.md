# Flask Web Development

> Stop 3 (part 1): the minimal, legible web framework. Flask is essentially "routing + request context" — perfect for **understanding what web frameworks actually do**; Django and FastAPI then become rewrites of the same lesson. Pure-AI candidates only need the minimum viable chapter.
>
> **How to read**: every Flask/Python concept is immediately followed by a **JS counterpart (Express / Node)** so you can anchor it in the backend style you already know.

## 1. Hello Flask and the request cycle

<CodeCompare>

<template #python>

```python
# app.py — the 2.x application-factory style
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.get("/hello")
# 3.0+ shortcut (== methods=["GET"])
def hello():
    name = request.args.get("name", "world")
    # query param with a default; .get avoids 400s
    return jsonify(msg=f"hello, {name}")
    # dict → JSON response automatically

@app.post("/echo")
def echo():
    data = request.get_json(force=True)
    # request body JSON → dict
    return jsonify(echoed=data), 201
    # tuple second item = HTTP status

if __name__ == "__main__":
    app.run(debug=True)
    # debug is dev-only: reloader + interactive debugger (exposed = breach)
```

</template>

<template #js>

```js
import express from "express";
const app = express();
app.use(express.json());
// ≈ request.get_json()

app.get("/hello", (req, res) => {
  const name = req.query.name ?? "world";
  // ≈ request.args.get
  res.json({ msg: `hello, ${name}` });
  // ≈ jsonify
});

app.post("/echo", (req, res) => {
  res.status(201).json({ echoed: req.body });
  // ≈ jsonify(...), 201
});

app.listen(5000);
// ≈ app.run(); never bare-run in production
```

</template>

</CodeCompare>

Run: `flask --app app run` (dev); **Gunicorn** in production (multi-worker) — Flask's built-in server is a single-threaded dev toy. Same for Express: `node app.js` in dev, PM2 / cluster for multiple workers in prod.

Memorize the cycle: `WSGI server (Gunicorn) → Flask route match → your view function → Response`. Flask is **WSGI (synchronous)**; async views are not native. Express runs on the Node event loop — naturally async but also single-threaded, so multi-core still needs multiple processes.

## 2. Routing and REST design

<CodeCompare>

<template #python>

```python
from flask import abort

@app.get("/users/<int:uid>")
# path converters: int:/str:/uuid:/path:
def get_user(uid: int):
    user = find_user(uid)
    if user is None:
        abort(404)
        # or return jsonify(error="not found"), 404
    return jsonify(user)

@app.route("/users/<int:uid>", methods=["PATCH", "DELETE"])
def edit_user(uid: int): ...

# REST stance: URLs are nouns, verbs live in the HTTP method;
# 200 read / 201 created / 204 delete-no-body / 400 bad input / 401 unauthenticated / 403 forbidden / 404 / 409 conflict
```

</template>

<template #js>

```js
app.get("/users/:uid", (req, res) => {
// :uid ≈ <int:uid> but Express doesn't cast types
  const user = findUser(Number(req.params.uid));
  if (!user) return res.status(404).json({ error: "not found" });
  // ≈ abort(404)
  res.json(user);
});

app.route("/users/:uid")
  .patch(editUser)
  .delete(deleteUser);

// No built-in path converters — validate yourself, or add express-validator / Zod
```

</template>

</CodeCompare>

## 3. Blueprints: how mid-size projects split folders

<CodeCompare>

<template #python>

```python
# routes/users.py
from flask import Blueprint
bp = Blueprint("users", __name__, url_prefix="/api/users")

@bp.get("")
# /api/users
def list_users(): ...

@bp.post("")
# POST /api/users
def create_user(): ...

# app.py
from routes.users import bp as users_bp
app.register_blueprint(users_bp)
```

</template>

<template #js>

```js
// routes/users.js
import { Router } from "express";
export const usersRouter = Router();

usersRouter.get("/", listUsers);
usersRouter.post("/", createUser);

// app.js
app.use("/api/users", usersRouter);
// ≈ register_blueprint(url_prefix="/api/users")
```

</template>

</CodeCompare>

Layout: `app/ (factory + blueprints) + models/ + services/ + schemas/` — views stay thin, logic sinks into services; isomorphic to Java's Controller/Service layering. Express uses `routes/ + controllers/ + services/ + models/` — the same layering idea.

## 4. Request context: thread-local magic and traps

<CodeCompare>

<template #python>

```python
from flask import request, g, session

@app.before_request
# hook: runs before every request (auth, timing, connection setup)
def before():
    g.start = time.perf_counter()
    # g: a per-request locker, destroyed at response

@app.after_request
# outbound hook: headers, latency reporting
def after(resp):
    resp.headers["X-Time"] = f"{time.perf_counter() - g.start:.3f}"
    return resp

# request/session/g are "context proxies" — how can an imported global see the current request?
# Answer: Flask binds request objects onto a thread-local stack, valid only while the view runs.
# Trap: touching request outside a context (background threads, CLI) raises RuntimeError —
# pass things explicitly instead.
```

</template>

<template #js>

```js
app.use((req, res, next) => {
// ≈ before_request
  res.locals.start = performance.now();
  // ≈ g: per-request locker
  next();
});

app.use((req, res, next) => {
// ≈ after_request via finish event
  res.on("finish", () => console.log("duration", performance.now() - res.locals.start));
  next();
});
```

</template>

</CodeCompare>

> **Key difference**: Flask uses **thread-local proxies** so `request` looks like a global; Express passes `req/res` **explicitly**, so there's no "global magic" and no out-of-context error. Flask's `g` ≈ Express's `res.locals`.

- `session` defaults to a **signed cookie** (client-side storage; keep it tiny, e.g. user_id; `app.secret_key` must come from the environment — a leaked key forges any session). Express counterpart: `express-session` (server-side store) or `cookie-session`.

## 5. SQLAlchemy 2.0 ORM

<CodeCompare>

<template #python>

```python
# models.py — flask-sqlalchemy or plain SQLAlchemy
from sqlalchemy import String, ForeignKey, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, Session

class Base(DeclarativeBase): ...

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), index=True)
    posts: Mapped[list["Post"]] = relationship(back_populates="author", lazy="selectin")

class Post(Base):
    __tablename__ = "posts"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    author: Mapped[User] = relationship(back_populates="posts")

# querying, 2.0 style = session.execute(select(...))
with Session(engine) as session:
    user = session.execute(select(User).where(User.name == "Ann")).scalar_one_or_none()
    posts = session.scalars(select(Post).where(Post.author_id == 1).order_by(Post.id.desc()).limit(10)).all()
    session.add(Post(title="new", author=user))
    # write: add → commit (one transaction boundary)
    session.commit()
```

</template>

<template #js>

```js
// Prisma schema models ≈ SQLAlchemy declarative classes
// model User { id Int @id @default(autoincrement())  name String @db.VarChar(50) ... }

const user = await prisma.user.findFirst({ where: { name: "Ann" }, include: { posts: true } });
const posts = await prisma.post.findMany({
  where: { authorId: 1 },
  orderBy: { id: "desc" },
  take: 10,
  include: { author: true },
  // ≈ lazy="selectin"
});
await prisma.post.create({ data: { title: "new", authorId: user.id } });
// no commit needed
```

</template>

</CodeCompare>

- The top trap: **N+1 queries** (touching a relationship per row in a loop) — `lazy="selectin"` or `joinedload` to preload; JS ORM counterpart is `include` / `relations`. Find them by echoing SQL logs.
- `Base.metadata.create_all(engine)` is fine for toys; real projects migrate with **Alembic**. JS counterpart: Prisma Migrate / TypeORM migration.

## 6. Validation and uniform error responses

<CodeCompare>

<template #python>

```python
from marshmallow import Schema, fields, validate

class UserIn(Schema):
# or Pydantic — the FastAPI ecosystem's common ground
    name = fields.Str(required=True, validate=validate.Length(max=50))
    age = fields.Int(load_default=None, validate=validate.Range(min=0, max=150))

@app.post("/users")
def create_user():
    errors = UserIn().validate(request.get_json(force=True))
    if errors:
        return jsonify(errors=errors), 400
        # bad input never reaches business code
    ...

# global fallback: any unhandled error returns JSON, not an HTML page (API dignity)
@app.errorhandler(Exception)
def on_error(e):
    app.logger.exception(e)
    # stack into logs
    return jsonify(error="internal error"), 500
    # nothing internal leaks out
```

</template>

<template #js>

```js
import { z } from "zod";

const UserIn = z.object({
  name: z.string().max(50),
  age: z.number().int().min(0).max(150).optional(),
});

app.post("/users", (req, res) => {
  const parsed = UserIn.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  // parsed.data reaches business code
});

app.use((err, req, res, next) => {
// ≈ @app.errorhandler(Exception)
  console.error(err);
  res.status(500).json({ error: "internal error" });
});
```

</template>

</CodeCompare>

## 7. Auth: a minimal token guard

<CodeCompare>

<template #python>

```python
import jwt, functools
from flask import current_app

SECRET = current_app.config["JWT_SECRET"]

def login_required(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        token = request.headers.get("Authorization", "").removeprefix("Bearer ")
        try:
            g.user_id = jwt.decode(token, SECRET, algorithms=["HS256"])["uid"]
            # verify + expiry
        except jwt.PyJWTError:
            return jsonify(error="unauthorized"), 401
        return fn(*args, **kwargs)
    return wrapper

@app.get("/me")
@login_required
# decorator auth — graduate to Flask-Login / Flask-Security-Too
def me():
    return jsonify(uid=g.user_id)
```

</template>

<template #js>

```js
import jwt from "jsonwebtoken";

function loginRequired(req, res, next) {
// middleware ≈ decorator
  const token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
  try {
    req.userId = jwt.verify(token, process.env.JWT_SECRET).uid;
    // ≈ g.user_id
    next();
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}

app.get("/me", loginRequired, (req, res) => res.json({ uid: req.userId }));
```

</template>

</CodeCompare>

Issue tokens at login (hash passwords with `werkzeug.security` generate/check_password_hash — PBKDF2 under the hood; never roll your own crypto). JS counterpart: `bcrypt` / `argon2`, same rule. JWT/OAuth details live in the [distributed topics chapter](../java/distributed).

## 8. Flask vs Express vs Django vs FastAPI (frequent interview question)

| Axis | Flask | Express | Django | FastAPI |
| --- | --- | --- | --- | --- |
| Philosophy | micro-framework, assemble yourself | minimal core + middleware ecosystem | batteries included, convention over config | modern async, type-driven |
| ORM/admin/auth | third-party assembly | all opt-in | built-in and mature (Admin is the killer app) | validation built-in, ORM your choice |
| Async | none (WSGI) | native event loop | partial (ASGI arriving gradually) | first-class native async |
| Sweet spot | small services, teaching, embedding | API gateways, BFF, small/medium services | CMS, admin panels, CRUD-heavy business | **AI model serving, streaming APIs, new projects** |
| Learning curve | lowest | lowest | steepest (many concepts) | low (if you know type hints) |

## 9. Self-check

1. Walk a Flask request from Gunicorn to Response. (Express: Node HTTP server → middleware chain?)
2. Why can `request`/`g` act like globals in views? Where does the thread-local bite? (Why doesn't Express have this?)
3. Where does the session live by default? Consequences of a leaked secret_key?
4. What is N+1, how do you spot and kill it? (JS ORM `include` equivalent?)
5. Why is `app.run(debug=True)` a production incident waiting to happen?
6. What problem do blueprints solve? How do you layer your project? (Express Router counterpart?)
7. One-sentence sweet spots for the frameworks.

Next stop → [Django Full-Stack](./django).
