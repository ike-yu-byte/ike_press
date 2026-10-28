# Flask Web 开发

> 第 3 站（上）：最小而清晰的 Web 框架。Flask 核心只有"路由 + 请求上下文"两件事，适合用来**搞懂 Web 框架到底在干什么**——学完再看 Django/FastAPI 的概念都是重复练习。目标岗位纯 AI 的同学，本章学"最小可用"即可。

## 一、Hello Flask 与请求周期

```python
# app.py —— 2.x 推荐 create 模式
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.get("/hello")                    # 3.0+ 的快捷注册（等价 methods=["GET"]）
def hello():
    name = request.args.get("name", "world")   # 查询参数 ?name=xx，get 带默认值防 400
    return jsonify(msg=f"hello, {name}")       # dict → JSON 响应自动序列化

@app.post("/echo")
def echo():
    data = request.get_json(force=True)         # 请求体 JSON → dict
    return jsonify(echoed=data), 201            # 元组第二项 = HTTP 状态码

if __name__ == "__main__":
    app.run(debug=True)                # debug 仅开发用：自动重载 + 交互调试器（生产暴露=安全事故）
```

运行：`flask --app app run`（开发）；生产用 **Gunicorn**（多 worker 进程）——Flask 自带的服务器是单线程开发玩具。

请求周期背下来：`WSGI 服务器(Gunicorn) → Flask 路由匹配 → 装饰的视图函数 → Response 返回`。Flask 是 **WSGI（同步）** 框架，不原生支持 async 视图。

## 二、路由与 REST 设计

```python
from flask import abort

@app.get("/users/<int:uid>")             # 路径转换器 int:/str:/uuid:/path:
def get_user(uid: int):
    user = find_user(uid)
    if user is None:
        abort(404)                       # 或直接 return jsonify(error="not found"), 404
    return jsonify(user)

@app.route("/users/<int:uid>", methods=["PATCH", "DELETE"])
def edit_user(uid: int): ...

# REST 口径：URL 是名词资源，动作交给 HTTP 方法；
# 200 查询 / 201 创建 / 204 删除无体 / 400 参数错 / 401 未认证 / 403 无权限 / 404 不存在 / 409 冲突
```

## 三、蓝图：中型项目的分目录方式

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

结构：`app/（工厂+蓝图） + models/ + services/ + schemas/`——视图函数保持薄，业务逻辑下沉 service 层，和 Java 的 Controller/Service 分层同构。

## 四、请求上下文：thread-local 的魔法与坑

```python
from flask import request, g, session

@app.before_request                # 钩子：每个请求进来先执行（鉴权、计时、初始化连接）
def before():
    g.start = time.perf_counter()  # g：本次请求的临时储物柜，请求结束即销毁

@app.after_request                 # 出站钩子：加响应头、上报耗时
def after(resp):
    resp.headers["X-Time"] = f"{time.perf_counter() - g.start:.3f}"
    return resp

# request/session/g 都是"上下文代理对象"——为什么 import 进来的全局变量能拿到当前请求？
# 答案：Flask 用 thread-local 栈把请求对象绑在当前线程上，视图执行期间才可用。
# 坑：脱离请求上下文（后台线程、CLI）访问 request 抛 RuntimeError——显式传参，别贪全局。
```

- `session` 默认是**签名 cookie**（客户端存储，只放小数据如 user_id；密钥 `app.secret_key` 必须环境变量注入，泄露=可伪造任意会话）。

## 五、SQLAlchemy 2.0 ORM

```python
# models.py —— flask-sqlalchemy 或直接 SQLAlchemy
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

# 查询：2.0 风格 = session.execute(select(...))
with Session(engine) as session:
    user = session.execute(select(User).where(User.name == "小明")).scalar_one_or_none()
    posts = session.scalars(select(Post).where(Post.author_id == 1).order_by(Post.id.desc()).limit(10)).all()
    session.add(Post(title="新帖", author=user))     # 写入：add → commit（一个事务边界）
    session.commit()
```

- 高频坑：**N+1 查询**（循环里逐条取关系属性）——用 `lazy="selectin"` 或 `joinedload` 预加载；排查靠打开 SQL echo 日志。
- 建表：`Base.metadata.create_all(engine)` 够小项目用；正式项目上 **Alembic** 迁移（版本化 schema，等价 Flyway/Liquibase）。

## 六、参数校验与统一错误响应

```python
from marshmallow import Schema, fields, validate

class UserIn(Schema):                       # 或直接用 Pydantic——FastAPI 生态统一
    name = fields.Str(required=True, validate=validate.Length(max=50))
    age = fields.Int(load_default=None, validate=validate.Range(min=0, max=150))

@app.post("/users")
def create_user():
    errors = UserIn().validate(request.get_json(force=True))
    if errors:
        return jsonify(errors=errors), 400  # 校验失败永不进业务层
    ...

# 全局异常兜底：任何未处理异常都返回 JSON 而不是 HTML 错误页（API 的体面）
@app.errorhandler(Exception)
def on_error(e):
    app.logger.exception(e)                          # 带栈进日志
    return jsonify(error="internal error"), 500      # 对外不泄露内部信息
```

## 七、鉴权：token 中间件最小实现

```python
import jwt, functools
from flask import current_app

SECRET = current_app.config["JWT_SECRET"]

def login_required(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        token = request.headers.get("Authorization", "").removeprefix("Bearer ")
        try:
            g.user_id = jwt.decode(token, SECRET, algorithms=["HS256"])["uid"]   # 验签+过期
        except jwt.PyJWTError:
            return jsonify(error="unauthorized"), 401
        return fn(*args, **kwargs)
    return wrapper

@app.get("/me")
@login_required                    # 装饰器鉴权——进阶用 Flask-Login / Flask-Security-Too
def me():
    return jsonify(uid=g.user_id)
```

登录接口发 token（密码校验用 `werkzeug.security` 的 generate/check_password_hash，本质 PBKDF2；别自造加密），JWT/OAuth 概念细节见 [分布式专题](../java/distributed)。

## 八、Flask vs Django vs FastAPI 选型（面试常问）

| 维度 | Flask | Django | FastAPI |
| --- | --- | --- | --- |
| 哲学 | 微框架，自己攒 | 全家桶，约定优于配置 | 现代异步，类型驱动 |
| ORM/后台/鉴权 | 全部第三方拼装 | 内置且成熟（Admin 是杀手锏） | 自带校验，ORM 自选（SQLAlchemy） |
| 异步 | 不支持（WSGI） | 部分支持（ASGI 渐进） | 原生 async 一流 |
| 适合 | 小服务/教学/已有架构嵌入 | CMS、后台管理、CRUD 重业务 | **AI 模型服务、流式 API、新项目** |
| 学习曲线 | 最低 | 最陡（概念多） | 低（会类型注解即可） |

## 九、本章自检清单

1. Flask 一个请求从 Gunicorn 到 Response 经过了哪些环节？
2. `request`/`g` 为什么能在视图里当全局变量用？thread-local 的坑在哪？
3. session 默认存哪里？secret_key 泄露会怎样？
4. N+1 查询是什么，怎么发现和解决？
5. 为什么生产不能用 `app.run(debug=True)`？
6. 蓝图解决什么问题？你的项目怎么分层？
7. 三框架选型一句话各说一个适用场景。

下一站 → [Django 全栈框架](./django)。
