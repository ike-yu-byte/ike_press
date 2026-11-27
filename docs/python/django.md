# Django 全栈框架

> 第 3 站（下）："全家桶"框架。Django 的哲学是**电池全含**：ORM、Admin 后台、鉴权、表单、迁移、缓存、安全防御全部内置且互相打通。做内容管理、后台系统、CRUD 重的业务，Django 的交付速度无出其右。
>
> **阅读方式**：每个 Django/Python 知识点后都紧跟 **JS 对照（NestJS / Prisma / Express）**。JS 生态更偏"自己拼装"，对照时重点看**哪些能力 Django 白送**。

## 一、项目结构与 MTV 架构

```bash
django-admin startproject config .
# 项目（配置层）
python manage.py startapp blog
# 应用（业务模块）——按领域拆 app 是 Django 的核心组织方式
python manage.py runserver
# 开发服务器
```

```text
config/  settings.py urls.py wsgi.py asgi.py   ← 项目配置与总路由
blog/   models.py views.py admin.py apps.py    ← 应用：M、T(视图)、模板
        migrations/                             ← 数据库变更的版本记录
```

**MTV 模型**：Model（数据层）→ Template（展示层）→ **View（业务逻辑，注意 Django 的 View 相当于别家的 Controller）**。请求流：`URLconf 匹配 → view 处理 → 返回 HttpResponse`。

**JS 对照：**

```bash
npx @nestjs/cli new config
# ≈ startproject：生成项目骨架
npx nest generate module blog
# ≈ startapp：按领域拆模块
npm run start:dev
# ≈ runserver，带热重载
```

| Django | NestJS / Express |
| --- | --- |
| `settings.py` | `app.module.ts` + `.env` |
| `urls.py` | `@Controller()` 装饰器路由 |
| `views.py` | Controller（≈ 别家的 Controller） |
| `models.py` | Prisma schema / TypeORM entity |
| `migrations/` | `prisma/migrations/` |
| MTV 的 View = Controller | NestJS 的 Controller 就是 Controller（命名不绕） |

> Django 的 **View 其实是 Controller**，Template 才是 V——这是它和 MVC 术语最大的错位。NestJS 直接叫 Controller，反而好懂。

## 二、ORM：Model 与迁移

```python
# blog/models.py
from django.db import models
from django.contrib.auth.models import AbstractUser

class Author(models.Model):
    name = models.CharField(max_length=50)
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, null=True)

class Post(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "草稿"
        PUBLISHED = "published", "已发布"

    title = models.CharField(max_length=200)
    body = models.TextField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    author = models.ForeignKey(Author, on_delete=models.CASCADE, related_name="posts")
    created = models.DateTimeField(auto_now_add=True)
    # 自动填充三件套：
    updated = models.DateTimeField(auto_now=True)
    # auto_now_add / auto_now / default=timezone.now

    class Meta:
        ordering = ["-created"]
        # 默认排序
        indexes = [models.Index(fields=["status", "-created"])]
        # 组合索引——高频查询路径

    def __str__(self) -> str:
    # Admin 与调试显示用
        return self.title
```

<CodeCompare>

<template #python>

```bash
python manage.py makemigrations
# 根据 Model 变更生成迁移文件（要提交进 git）
python manage.py migrate
# 应用到数据库——等价 Flyway 的 versioned migration
python manage.py shell
# 交互式操作 ORM 的 REPL
```

</template>

<template #js>

```prisma
model Author {
  id   Int    @id @default(autoincrement())
  name String @db.VarChar(50)
  user User?  @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String   @db.VarChar(200)
  body      String
  status    String   @default("draft")
  author    Author   @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId  Int
  createdAt DateTime @default(now())    // ≈ auto_now_add
  updatedAt DateTime @updatedAt         // ≈ auto_now
  @@index([status, createdAt])          // ≈ Meta.indexes
}
```

</template>

</CodeCompare>

```bash
npx prisma migrate dev --name add_post
# ≈ makemigrations + migrate 一步
npx prisma studio
# ≈ Django shell + Admin 的轻量版
```

> `choices` / `TextChoices` 在 Prisma 里用 `enum`（原生支持）或 Zod 校验；`on_delete=models.CASCADE` 对应 `onDelete: Cascade`。

### QuerySet：惰性求值是灵魂

<CodeCompare>

<template #python>

```python
# 查询永远返回 QuerySet（惰性 SQL 描述），真正执行发生在被遍历时
recent = Post.objects.filter(status="published", created__gte=week_ago) \
                     .select_related("author") \
                     # FK 一对一：JOIN 预加载，杀 N+1
                     .prefetch_related("tags") \
                     # 多对多：二次 IN 查询预加载
                     .only("id", "title", "author__name") \
                     .order_by("-created")[:20]
                     # 切片 = SQL LIMIT

recent.count()
# 触发 COUNT(*)——注意 list(recent) 后再 len() 会把全表拉进内存
Post.objects.create(title="t", author=a)
# 即插即 save()
Post.objects.filter(id=1).update(status="published")
# 批量 UPDATE 一条 SQL；逐条 save() 是 N 条
F("view_count").__class__
# F 对象：数据库侧原子自增，防竞态
# 事务：from django.db import transaction
with transaction.atomic():
# 视图函数默认各自提交；多写操作包事务
    ...
```

</template>

<template #js>

```js
const recent = await prisma.post.findMany({
// Prisma 是立即执行（await 即发 SQL）
  where: { status: "published", createdAt: { gte: weekAgo } },
  // ≈ created__gte
  include: { author: true, tags: true },
  // ≈ select_related + prefetch_related
  select: { id: true, title: true, author: { select: { name: true } } },
  // ≈ only()
  orderBy: { createdAt: "desc" },
  take: 20,
  // ≈ [:20]
});

await prisma.post.count({ where: { status: "published" } });
// ≈ count()
await prisma.post.create({ data: { title: "t", authorId: a.id } });
await prisma.post.updateMany({ where: { id: 1 }, data: { status: "published" } });
await prisma.post.update({ where: { id: 1 }, data: { viewCount: { increment: 1 } } });
// ≈ F()

await prisma.$transaction([
// ≈ transaction.atomic()
  prisma.post.update(/* ... */),
  prisma.author.update(/* ... */),
]);
```

</template>

</CodeCompare>

> **关键差异**：Django QuerySet 是**惰性**的——不遍历不发 SQL，还能继续链式拼接；Prisma 调用即执行（返回 Promise）。Knex/Drizzle 这类 query builder 才更接近 Django 的惰性体验。

- 双下划线查询语法：`created__gte` / `author__name__icontains` / `tags__in`——跨关系查询就是点号链的 SQL 版。Prisma 对应 `createdAt: { gte }` / `author: { name: { contains } }` / `tags: { some: { id: { in } } }`。
- 高频坑：`.filter().update()` 后对象内存值不刷新；循环里 `get()`（应批量 `in_bulk`）；大表 `delete()`（QuerySet 删除逐条发信号，超慢，海量数据走原生 SQL 或分批）。

## 三、视图、URL 与 DRF API

```python
# 函数视图 vs 类视图；API 时代主流是 Django REST Framework（DRF）
# posts/api.py
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response

class PostViewSet(viewsets.ModelViewSet):
# 一个类 = list/create/retrieve/update/partial/destroy 六个端点
    queryset = Post.objects.select_related("author").filter(status="published")
    serializer_class = PostSerializer
    # 序列化器 = DTO 映射 + 入参校验
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "body"]

    @action(detail=True, methods=["post"])
    # 自定义子资源：POST /posts/1/publish/
    def publish(self, request, pk=None):
        post = self.get_object()
        post.status = Post.Status.PUBLISHED
        post.save(update_fields=["status"])
        return Response(PostSerializer(post).data)
```

<CodeCompare>

<template #python>

```python
# urls.py —— DRF Router 自动生成 REST 路由
from rest_framework.routers import DefaultRouter
router = DefaultRouter()
router.register("posts", PostViewSet)
urlpatterns = [path("api/", include(router.urls))]
```

</template>

<template #js>

```ts
@Controller("posts")
// ≈ ViewSet + Router 合体
export class PostsController {
  constructor(private readonly svc: PostsService) {}

  @Get()
  // list
  list() { return this.svc.list(); }

  @Post()
  // create
  create(@Body() dto: CreatePostDto) { return this.svc.create(dto); }

  @Get(":id")
  // retrieve
  get(@Param("id") id: string) { return this.svc.get(id); }

  @Post(":id/publish")
  // ≈ @action(detail=True)
  publish(@Param("id") id: string) { return this.svc.publish(id); }
}
// DTO + class-validator/Zod ≈ Serializer：入参校验 + 出参映射
// NestJS 没有 Router 自动生成，但 @Controller + 装饰器写起来同样薄
```

</template>

</CodeCompare>

- 序列化器要点：字段显式声明（别 `fields = "__all__"` 上生产，防止意外暴露敏感列）；`validate_<field>` 钩子做业务校验。NestJS 对应 DTO 白名单 + `ValidationPipe({ whitelist: true })`。
- 分页：DRF `PageNumberPagination` 或性能更好的 `LimitOffsetPagination`；游标分页（CursorPagination）适合无限流。NestJS 自己写 `skip/take` 或用 `nestjs-paginate`。
- 鉴权：`TokenAuthentication` / **`SimpleJWT`（JWT 双 token）** / Session；权限类 `IsAuthenticated`、自定义 `BasePermission`——JS 对应 Passport.js 策略 + Guard。细节见[分布式专题](../java/distributed)认证节。

## 四、Admin：白送的后台管理系统

<CodeCompare>

<template #python>

```python
# blog/admin.py —— 内部工具/运营后台的极速方案，一行 CRUD 全有
@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "status", "created")
    list_filter = ("status", "created")
    search_fields = ("title", "body")
    autocomplete_fields = ("author",)
    readonly_fields = ("created", "updated")
```

</template>

<template #js>

```js
// NestJS/Express 生态没有等价物！最接近的是：
// - 低代码后台：Retool / Appsmith / NocoDB（接上数据库直接出 CRUD 页面）
// - AdminJS：Node 版 Admin 框架，可自动生成列表/过滤/搜索页
import AdminJS from "adminjs";
import { Database, Resource } from "@adminjs/prisma";

const admin = new AdminJS({
  resources: [{ resource: { model: prisma.post, client: prisma }, options: {} }],
});
// 这就是 Django Admin 在 JS 里的近似对位，但成熟度差距明显
```

</template>

</CodeCompare>

面试加分说法："Django Admin 让运营自助处理 80% 的数据订正，省下整个后台前端"——但生产要收紧权限、审计操作日志、改 URL 前缀。**JS 栈往往要额外投入一整个后台前端，这是 Django 的核心护城河。**

## 五、中间件、信号与安全

<CodeCompare>

<template #python>

```python
# 中间件：请求/响应的全局切面（顺序敏感：请求正序进、响应逆序出）
class TimingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    def __call__(self, request):
        start = time.perf_counter()
        response = self.get_response(request)
        response["X-Duration"] = f"{time.perf_counter() - start:.3f}"
        return response
```

</template>

<template #js>

```js
app.use((req, res, next) => {
// Express 中间件：请求正序进
  const start = performance.now();
  res.on("finish", () => {
  // 响应逆序出靠 finish 事件
    console.log("duration", performance.now() - start);
  });
  res.setHeader("X-Duration", `${performance.now() - start}ms`);
  next();
});
```

</template>

</CodeCompare>

- 内置安全（Django 的护城河）：CSRF 双提交 token、XSS 模板自动转义、SQL 注入由 ORM 参数化免疫、`SECURE_*` 系列 HTTPS/HSTS 开关、XSS 过滤——面试问"Web 安全三件套 Django 怎么防"直接对答。JS 栈要靠 `helmet`（HTTP 头）、`csurf`（CSRF）、ORM 参数化、模板引擎自动转义逐项补齐。
- 信号（signal）`post_save` 做解耦副作用要克制——隐式调用链是排查黑洞，能显式调用不打信号。JS 里对应 EventEmitter，同样别滥用。
- settings 分环境：`base.py / dev.py / prod.py` + `python-decouple` 或环境变量注入密钥；`DEBUG=False` 时 500 页不泄露栈。JS 对应 `.env` + `config` 包，生产务必关掉详细错误页。

## 六、性能与部署

<CodeCompare>

<template #python>

```bash
# 生产四件套：Nginx(静态/TLS) → Gunicorn/Uvicorn(worker) → Django → PostgreSQL
gunicorn config.wsgi:application -w 4 -k gthread --threads 2 -b :8000 --timeout 60
```

</template>

<template #js>

```bash
# Nginx(静态/TLS) → PM2/cluster(多进程) → NestJS/Express → PostgreSQL
pm2 start dist/main.js -i 4
# -i 4 起 4 个 worker ≈ gunicorn -w 4
```

</template>

</CodeCompare>

| 优化点 | Django | JS / Node |
| --- | --- | --- |
| 找慢查询 | `django-debug-toolbar` / `nplusone` | Prisma query log / `explain` |
| 杀 N+1 | `select_related` / `prefetch_related` | `include` / DataLoader |
| 缓存 | Redis `cache.get_or_set` | Redis `ioredis` / node-cache |
| 异步任务 | Celery + `@shared_task.delay()` | BullMQ / Agenda + Redis |

- 优化顺序背熟：**先量化再优化**——找慢查询 → 加索引 → 预加载杀 N+1 → Redis 缓存热点 → 静态化/分页限流。
- Celery 异步任务（发邮件、跑报表）：broker 用 Redis，`@shared_task` + `delay()`——同步接口先回 202，任务结果轮询或推送。JS 对应 BullMQ。
- 大项目上 `ruff` + `mypy`（Django 有 django-stubs）；测试用 `pytest-django`。JS 对应 ESLint + TypeScript + Vitest/Jest。

## 七、本章自检清单

1. MTV 里 V 是什么？和 Java MVC 的 C 怎么对应？（NestJS 为什么直接叫 Controller？）
2. QuerySet 的"惰性"什么意思？`count()` 和 `len(list(qs))` 的 SQL 差别？（Prisma 为什么不同？）
3. `select_related` vs `prefetch_related` 各适合什么关系？（Prisma `include` 对应哪个？）
4. 迁移文件要不要进 git？多人协作迁移冲突怎么处理？
5. DRF 的 Serializer 承担什么职责？ViewSet + Router 少写了什么代码？（对照 DTO + Controller）
6. Django 内置防了哪几类 Web 攻击？分别靠什么机制？（JS 栈要补哪些中间件？）
7. 一个接口慢，你的排查和优化顺序是什么？

下一站 → [数据处理三件套](./data-analysis)：Python 真正的看家本领。
