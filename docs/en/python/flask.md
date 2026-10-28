# Flask Web Development

> Stop 3 (part 1): the minimal, legible web framework. Flask is essentially "routing + request context" — perfect for **understanding what web frameworks actually do**; Django and FastAPI then become rewrites of the same lesson. Pure-AI candidates only need the minimum viable chapter.

## 1. Hello Flask and the request cycle

```python
# app.py — the 2.x application-factory style
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.get("/hello")                    # 3.0+ shortcut (== methods=["GET"])
def hello():
    name = request.args.get("name", "world")   # query param with a default; .get avoids 400s
    return jsonify(msg=f"hello, {name}")       # dict → JSON response automatically

@app.post("/echo")
def echo():
    data = request.get_json(force=True)         # request body JSON → dict
    return jsonify(echoed=data), 201            # tuple second item = HTTP status

if __name__ == "__main__":
    app.run(debug=True)                # debug is dev-only: reloader + interactive debugger (exposed = breach)
```

Run: `flask --app app run` (dev); **Gunicorn** in production (multi-worker) — Flask's built-in server is a single-threaded dev toy.

Memorize the cycle: `WSGI server (Gunicorn) → Flask route match → your view function → Response`. Flask is **WSGI (synchronous)**; async views are not native.

## 2. Routing and REST design

```python
from flask import abort

@app.get("/users/<int:uid>")             # path converters: int:/str:/uuid:/path:
def get_user(uid: int):
    user = find_user(uid)
    if user is None:
        abort(404)                       # or return jsonify(error="not found"), 404
    return jsonify(user)

@app.route("/users/<int:uid>", methods=["PATCH", "DELETE"])
def edit_user(uid: int): ...

# REST stance: URLs are nouns, verbs live in the HTTP method;
# 200 read / 201 created / 204 delete-no-body / 400 bad input / 401 unauthenticated / 403 forbidden / 404 / 409 conflict
```

## 3. Blueprints: how mid-size projects split folders

```python
# routes/users.py
from flask import Blueprint
bp = Blueprint("users", __name__, url_prefix="/api/users")

@bp.get("")                    # /api/users
def list_users(): ...

@bp.post("")                   # POST /api/users
def create_user(): ...

# app.py
from routes.users import bp as users_bp
app.register_blueprint(users_bp)
```

Layout: `app/ (factory + blueprints) + models/ + services/ + schemas/` — views stay thin, logic sinks into services; isomorphic to Java's Controller/Service layering.

## 4. Request context: thread-local magic and traps

```python
from flask import request, g, session

@app.before_request                # hook: runs before every request (auth, timing, connection setup)
def before():
    g.start = time.perf_counter()  # g: a per-request locker, destroyed at response

@app.after_request                 # outbound hook: headers, latency reporting
def after(resp):
    resp.headers["X-Time"] = f"{time.perf_counter() - g.start:.3f}"
    return resp

# request/session/g are "context proxies" — how can an imported global see the current request?
# Answer: Flask binds request objects onto a thread-local stack, valid only while the view runs.
# Trap: touching request outside a context (background threads, CLI) raises RuntimeError —
# pass things explicitly instead.
```

- `session` defaults to a **signed cookie** (client-side storage; keep it tiny, e.g. user_id; `app.secret_key` must come from the environment — a leaked key forges any session).

## 5. SQLAlchemy 2.0 ORM

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
    session.add(Post(title="new", author=user))     # write: add → commit (one transaction boundary)
    session.commit()
```

- The top trap: **N+1 queries** (touching a relationship per row in a loop) — `lazy="selectin"` or `joinedload` to preload; find them by echoing SQL logs.
- `Base.metadata.create_all(engine)` is fine for toys; real projects migrate with **Alembic** (versioned schema, the Flyway/Liquibase equivalent).

## 6. Validation and uniform error responses

```python
from marshmallow import Schema, fields, validate

class UserIn(Schema):                       # or Pydantic — the FastAPI ecosystem's common ground
    name = fields.Str(required=True, validate=validate.Length(max=50))
    age = fields.Int(load_default=None, validate=validate.Range(min=0, max=150))

@app.post("/users")
def create_user():
    errors = UserIn().validate(request.get_json(force=True))
    if errors:
        return jsonify(errors=errors), 400  # bad input never reaches business code
    ...

# global fallback: any unhandled error returns JSON, not an HTML page (API dignity)
@app.errorhandler(Exception)
def on_error(e):
    app.logger.exception(e)                          # stack into logs
    return jsonify(error="internal error"), 500      # nothing internal leaks out
```

## 7. Auth: a minimal token guard

```python
import jwt, functools
from flask import current_app

SECRET = current_app.config["JWT_SECRET"]

def login_required(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        token = request.headers.get("Authorization", "").removeprefix("Bearer ")
        try:
            g.user_id = jwt.decode(token, SECRET, algorithms=["HS256"])["uid"]   # verify + expiry
        except jwt.PyJWTError:
            return jsonify(error="unauthorized"), 401
        return fn(*args, **kwargs)
    return wrapper

@app.get("/me")
@login_required                    # decorator auth — graduate to Flask-Login / Flask-Security-Too
def me():
    return jsonify(uid=g.user_id)
```

Issue tokens at login (hash passwords with `werkzeug.security` generate/check_password_hash — PBKDF2 under the hood; never roll your own crypto). JWT/OAuth details live in the [distributed topics chapter](../java/distributed).

## 8. Flask vs Django vs FastAPI (frequent interview question)

| Axis | Flask | Django | FastAPI |
| --- | --- | --- | --- |
| Philosophy | micro-framework, assemble yourself | batteries included, convention over config | modern async, type-driven |
| ORM/admin/auth | third-party assembly | built-in and mature (Admin is the killer app) | validation built-in, ORM your choice (SQLAlchemy) |
| Async | none (WSGI) | partial (ASGI arriving gradually) | first-class native async |
| Sweet spot | small services, teaching, embedding | CMS, admin panels, CRUD-heavy business | **AI model serving, streaming APIs, new projects** |
| Learning curve | lowest | steepest (many concepts) | low (if you know type hints) |

## 9. Self-check

1. Walk a Flask request from Gunicorn to Response.
2. Why can `request`/`g` act like globals in views? Where does the thread-local bite?
3. Where does the session live by default? Consequences of a leaked secret_key?
4. What is N+1, how do you spot and kill it?
5. Why is `app.run(debug=True)` a production incident waiting to happen?
6. What problem do blueprints solve? How do you layer your project?
7. One-sentence sweet spots for the three frameworks.

Next stop → [Django Full-Stack](./django).
