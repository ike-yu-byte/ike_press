# Django Full-Stack Framework

> Stop 3 (part 2): the "batteries included" framework. Django's philosophy: ORM, admin, auth, forms, migrations, caching, security defenses — all built-in and interlocked. For content sites, admin panels and CRUD-heavy business, nothing ships faster.
>
> **How to read**: every Django/Python concept is immediately followed by a **JS counterpart (NestJS / Prisma / Express)**. The JS ecosystem assembles these pieces yourself — the comparison highlights **what Django gives you for free**.

## 1. Project layout and the MTV architecture

```bash
django-admin startproject config .
# project (configuration layer)
python manage.py startapp blog
# app (business module) — splitting apps by domain is the Django way
python manage.py runserver
# dev server
```

```text
config/  settings.py urls.py wsgi.py asgi.py   ← project config and root URLconf
blog/   models.py views.py admin.py apps.py    ← the app: M, V(iews), templates
        migrations/                             ← versioned database changes
```

**MTV**: Model (data) → Template (presentation) → **View (business logic — note Django's "View" is everyone else's Controller)**. Request flow: `URLconf match → view → HttpResponse`.

**JS counterpart:**

```bash
npx @nestjs/cli new config
# ≈ startproject: scaffold
npx nest generate module blog
# ≈ startapp: domain module
npm run start:dev
# ≈ runserver with hot reload
```

| Django | NestJS / Express |
| --- | --- |
| `settings.py` | `app.module.ts` + `.env` |
| `urls.py` | `@Controller()` routing |
| `views.py` | Controller (≈ everyone else's Controller) |
| `models.py` | Prisma schema / TypeORM entity |
| `migrations/` | `prisma/migrations/` |
| MTV's View = Controller | NestJS simply calls it Controller |

> Django's **View is actually the Controller**; Template is the V — the biggest terminology mismatch. NestJS calling it Controller is easier to grasp.

## 2. ORM: models and migrations

```python
# blog/models.py
from django.db import models

class Author(models.Model):
    name = models.CharField(max_length=50)
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, null=True)

class Post(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"

    title = models.CharField(max_length=200)
    body = models.TextField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    author = models.ForeignKey(Author, on_delete=models.CASCADE, related_name="posts")
    created = models.DateTimeField(auto_now_add=True)
    # the auto-fill trio:
    updated = models.DateTimeField(auto_now=True)
    # auto_now_add / auto_now / default=timezone.now

    class Meta:
        ordering = ["-created"]
        # default order
        indexes = [models.Index(fields=["status", "-created"])]
        # composite index on the hot query path

    def __str__(self) -> str:
    # shown in Admin and shell
        return self.title
```

<CodeCompare>

<template #python>

```bash
python manage.py makemigrations
# generate migration files from model changes (commit them to git!)
python manage.py migrate
# apply to the database — Flyway-style versioned migrations
python manage.py shell
# REPL with the ORM wired up
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
# ≈ makemigrations + migrate in one
npx prisma studio
# ≈ a lighter Django shell + Admin
```

> `choices` / `TextChoices` → Prisma `enum` (or Zod validation); `on_delete=models.CASCADE` → `onDelete: Cascade`.

### QuerySets: laziness is the soul

<CodeCompare>

<template #python>

```python
# queries return QuerySets (lazy SQL descriptions); execution happens on iteration
recent = Post.objects.filter(status="published", created__gte=week_ago) \
                     .select_related("author") \
                     # FK/O2O: JOIN preload, kills N+1
                     .prefetch_related("tags") \
                     # M2M: second IN-query preload
                     .only("id", "title", "author__name") \
                     .order_by("-created")[:20]
                     # slicing = SQL LIMIT

recent.count()
# issues COUNT(*) — beware: len(list(recent)) drags every row into memory
Post.objects.create(title="t", author=a)
# save() in one call
Post.objects.filter(id=1).update(status="published")
# one bulk UPDATE; per-row save() = N queries
Post.objects.filter(id=1).update(views=F("views") + 1)
# F objects: atomic DB-side increment, race-proof
# transactions: from django.db import transaction
with transaction.atomic():
# views commit per-query by default; wrap multi-writes
    ...
```

</template>

<template #js>

```js
const recent = await prisma.post.findMany({
// Prisma executes immediately on await
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
await prisma.post.update({ where: { id: 1 }, data: { views: { increment: 1 } } });
// ≈ F()

await prisma.$transaction([
// ≈ transaction.atomic()
  prisma.post.update(/* ... */),
  prisma.author.update(/* ... */),
]);
```

</template>

</CodeCompare>

> **Key difference**: Django QuerySets are **lazy** — no SQL until iterated, and you can keep chaining. Prisma executes on call. Query builders like Knex/Drizzle are closer to Django's lazy feel.

- Double-underscore lookups: `created__gte` / `author__name__icontains` / `tags__in` — cross-relation queries as dotted SQL chains. Prisma: `createdAt: { gte }` / `author: { name: { contains } }` / `tags: { some: { id: { in } } }`.
- Frequent traps: in-memory objects stale after `.update()`; `get()` inside loops (use `in_bulk`); deleting big QuerySets (row-by-row signals — go raw SQL or batch for mass deletes).

## 3. Views, URLs and DRF APIs

```python
# function vs class views; the API era belongs to Django REST Framework (DRF)
# posts/api.py
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response

class PostViewSet(viewsets.ModelViewSet):
# one class = list/create/retrieve/update/partial/destroy
    queryset = Post.objects.select_related("author").filter(status="published")
    serializer_class = PostSerializer
    # serializers = DTO mapping + input validation
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "body"]

    @action(detail=True, methods=["post"])
    # custom sub-resource: POST /posts/1/publish/
    def publish(self, request, pk=None):
        post = self.get_object()
        post.status = Post.Status.PUBLISHED
        post.save(update_fields=["status"])
        return Response(PostSerializer(post).data)
```

<CodeCompare>

<template #python>

```python
# urls.py — the DRF router generates REST routes for you
from rest_framework.routers import DefaultRouter
router = DefaultRouter()
router.register("posts", PostViewSet)
urlpatterns = [path("api/", include(router.urls))]
```

</template>

<template #js>

```ts
@Controller("posts")
// ≈ ViewSet + Router combined
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
// DTO + class-validator/Zod ≈ Serializer: input validation + output mapping
// NestJS has no auto-router, but @Controller decorators keep it equally thin
```

</template>

</CodeCompare>

- Serializer discipline: declare fields explicitly (`fields = "__all__"` in production leaks sensitive columns someday); `validate_<field>` hooks for business checks. NestJS counterpart: DTO whitelist + `ValidationPipe({ whitelist: true })`.
- Pagination: `PageNumberPagination`, faster `LimitOffsetPagination`, endless feeds via `CursorPagination`. NestJS: hand-rolled `skip/take` or `nestjs-paginate`.
- Auth: `TokenAuthentication` / **`SimpleJWT` (access+refresh)** / Session; permissions `IsAuthenticated`, custom `BasePermission` — JS counterpart: Passport.js strategies + Guards. Concepts in the [distributed topics chapter](../java/distributed).

## 4. Admin: a free back-office system

<CodeCompare>

<template #python>

```python
# blog/admin.py — internal tools/ops consoles in a dozen lines; CRUD included
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
// The JS ecosystem has no exact equivalent. Closest options:
// - low-code admin: Retool / Appsmith / NocoDB (point at a DB, get CRUD screens)
// - AdminJS: the Node admin framework, auto-generating lists/filters/search
import AdminJS from "adminjs";
import { Database, Resource } from "@adminjs/prisma";

const admin = new AdminJS({
  resources: [{ resource: { model: prisma.post, client: prisma }, options: {} }],
});
// roughly the JS counterpart of Django Admin — but far less mature
```

</template>

</CodeCompare>

Interview bonus phrasing: "Django Admin lets ops fix 80% of data issues themselves — it saved an entire admin frontend" — while noting production hardening: tight permissions, audit logs, renamed URL prefix. **The JS stack usually needs a whole admin frontend; that's Django's core moat.**

## 5. Middleware, signals and security

<CodeCompare>

<template #python>

```python
# middleware: global request/response aspects (order matters: in top-down, out bottom-up)
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
// Express middleware: request flows top-down
  const start = performance.now();
  res.on("finish", () => console.log("duration", performance.now() - start));
  // outbound
  res.setHeader("X-Duration", `${performance.now() - start}ms`);
  next();
});
```

</template>

</CodeCompare>

- Built-in defenses (Django's moat): CSRF double-token, XSS via template auto-escaping, SQL injection immunity through ORM parameterization, `SECURE_*` HTTPS/HSTS switches — "how does Django stop the big three web attacks" is a free points question. The JS stack assembles this with `helmet` (headers), `csurf`, ORM parameterization and template auto-escaping.
- Signals (`post_save` etc.): use sparingly — implicit call chains are debugging black holes; prefer explicit calls. JS counterpart: EventEmitter, same caution.
- Settings per environment: `base.py / dev.py / prod.py` + secrets from env vars; with `DEBUG=False` the 500 page never leaks stacks. JS counterpart: `.env` + `config` package; always disable verbose errors in production.

## 6. Performance and deployment

<CodeCompare>

<template #python>

```bash
# production quartet: Nginx (static/TLS) → Gunicorn/Uvicorn (workers) → Django → PostgreSQL
gunicorn config.wsgi:application -w 4 -k gthread --threads 2 -b :8000 --timeout 60
```

</template>

<template #js>

```bash
# Nginx (static/TLS) → PM2/cluster (workers) → NestJS/Express → PostgreSQL
pm2 start dist/main.js -i 4
# -i 4 = 4 workers ≈ gunicorn -w 4
```

</template>

</CodeCompare>

| Optimization | Django | JS / Node |
| --- | --- | --- |
| Find slow queries | `django-debug-toolbar` / `nplusone` | Prisma query log / `explain` |
| Kill N+1 | `select_related` / `prefetch_related` | `include` / DataLoader |
| Cache | Redis `cache.get_or_set` | Redis via `ioredis` / node-cache |
| Async jobs | Celery + `@shared_task.delay()` | BullMQ / Agenda + Redis |

- Memorize the order: **measure before optimizing** — find slow queries → indexes → preload to kill N+1 → Redis for hot paths → static generation / pagination / rate limits.
- Celery for async jobs (emails, reports): Redis as broker, `@shared_task` + `delay()` — respond 202 immediately, poll or push results. JS counterpart: BullMQ.
- Larger repos: `ruff` + `mypy` (django-stubs); tests via `pytest-django`. JS counterpart: ESLint + TypeScript + Vitest/Jest.

## 7. Self-check

1. What is V in MTV? How does it map to Java's Controller? (Why does NestJS just call it Controller?)
2. What does QuerySet laziness mean? SQL difference between `count()` and `len(list(qs))`? (Why is Prisma different?)
3. `select_related` vs `prefetch_related` — which relation suits which? (Prisma `include` equivalent?)
4. Do migration files belong in git? Handling multi-dev migration conflicts?
5. What does a DRF Serializer do? What did ViewSet + Router delete? (DTO + Controller counterpart?)
6. Which web attacks does Django defend out of the box, and how? (Which middleware must JS add?)
7. A slow endpoint — your investigation and optimization sequence?

Next stop → [Data Processing Trio](./data-analysis): Python's actual home turf.
