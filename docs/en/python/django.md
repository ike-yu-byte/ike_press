# Django Full-Stack Framework

> Stop 3 (part 2): the "batteries included" framework. Django's philosophy: ORM, admin, auth, forms, migrations, caching, security defenses — all built-in and interlocked. For content sites, admin panels and CRUD-heavy business, nothing ships faster.

## 1. Project layout and the MTV architecture

```bash
django-admin startproject config .       # project (configuration layer)
python manage.py startapp blog           # app (business module) — splitting apps by domain is the Django way
python manage.py runserver               # dev server
```

```
config/  settings.py urls.py wsgi.py asgi.py   ← project config and root URLconf
blog/   models.py views.py admin.py apps.py    ← the app: M, V(iews), templates
        migrations/                             ← versioned database changes
```

**MTV**: Model (data) → Template (presentation) → **View (business logic — note Django's "View" is everyone else's Controller)**. Request flow: `URLconf match → view → HttpResponse`.

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
    created = models.DateTimeField(auto_now_add=True)      # the auto-fill trio:
    updated = models.DateTimeField(auto_now=True)          # auto_now_add / auto_now / default=timezone.now

    class Meta:
        ordering = ["-created"]                            # default order
        indexes = [models.Index(fields=["status", "-created"])]   # composite index on the hot query path

    def __str__(self) -> str:                              # shown in Admin and shell
        return self.title
```

```bash
python manage.py makemigrations        # generate migration files from model changes (commit them to git!)
python manage.py migrate               # apply to the database — Flyway-style versioned migrations
python manage.py shell                 # REPL with the ORM wired up
```

### QuerySets: laziness is the soul

```python
# queries return QuerySets (lazy SQL descriptions); execution happens on iteration
recent = Post.objects.filter(status="published", created__gte=week_ago) \
                     .select_related("author") \          # FK/O2O: JOIN preload, kills N+1
                     .prefetch_related("tags") \          # M2M: second IN-query preload
                     .only("id", "title", "author__name") \
                     .order_by("-created")[:20]           # slicing = SQL LIMIT

recent.count()          # issues COUNT(*) — beware: len(list(recent)) drags every row into memory
Post.objects.create(title="t", author=a)                  # save() in one call
Post.objects.filter(id=1).update(status="published")      # one bulk UPDATE; per-row save() = N queries
Post.objects.filter(id=1).update(views=F("views") + 1)    # F objects: atomic DB-side increment, race-proof
# transactions: from django.db import transaction
with transaction.atomic():                                 # views commit per-query by default; wrap multi-writes
    ...
```

- Double-underscore lookups: `created__gte` / `author__name__icontains` / `tags__in` — cross-relation queries as dotted SQL chains.
- Frequent traps: in-memory objects stale after `.update()`; `get()` inside loops (use `in_bulk`); deleting big QuerySets (row-by-row signals — go raw SQL or batch for mass deletes).

## 3. Views, URLs and DRF APIs

```python
# function vs class views; the API era belongs to Django REST Framework (DRF)
# posts/api.py
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response

class PostViewSet(viewsets.ModelViewSet):        # one class = list/create/retrieve/update/partial/destroy
    queryset = Post.objects.select_related("author").filter(status="published")
    serializer_class = PostSerializer            # serializers = DTO mapping + input validation
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "body"]

    @action(detail=True, methods=["post"])       # custom sub-resource: POST /posts/1/publish/
    def publish(self, request, pk=None):
        post = self.get_object()
        post.status = Post.Status.PUBLISHED
        post.save(update_fields=["status"])
        return Response(PostSerializer(post).data)
```

```python
# urls.py — the DRF router generates REST routes for you
from rest_framework.routers import DefaultRouter
router = DefaultRouter()
router.register("posts", PostViewSet)
urlpatterns = [path("api/", include(router.urls))]
```

- Serializer discipline: declare fields explicitly (`fields = "__all__"` in production leaks sensitive columns someday); `validate_<field>` hooks for business checks.
- Pagination: `PageNumberPagination`, faster `LimitOffsetPagination`, endless feeds via `CursorPagination`.
- Auth: `TokenAuthentication` / **`SimpleJWT` (access+refresh)** / Session; permissions `IsAuthenticated`, custom `BasePermission` — concepts in the [distributed topics chapter](../java/distributed).

## 4. Admin: a free back-office system

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

Interview bonus phrasing: "Django Admin lets ops fix 80% of data issues themselves — it saved an entire admin frontend" — while noting production hardening: tight permissions, audit logs, renamed URL prefix.

## 5. Middleware, signals and security

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

- Built-in defenses (Django's moat): CSRF double-token, XSS via template auto-escaping, SQL injection immunity through ORM parameterization, `SECURE_*` HTTPS/HSTS switches — "how does Django stop the big three web attacks" is a free points question.
- Signals (`post_save` etc.): use sparingly — implicit call chains are debugging black holes; prefer explicit calls.
- Settings per environment: `base.py / dev.py / prod.py` + secrets from env vars; with `DEBUG=False` the 500 page never leaks stacks.

## 6. Performance and deployment

```bash
# production quartet: Nginx (static/TLS) → Gunicorn/Uvicorn (workers) → Django → PostgreSQL
gunicorn config.wsgi:application -w 4 -k gthread --threads 2 -b :8000 --timeout 60
```

- Memorize the order: **measure before optimizing** — `django-debug-toolbar` / `nplusone` to find slow queries → indexes → `select_related/prefetch_related` to kill N+1 → Redis cache for hot paths (`cache.get_or_set`) → static generation / pagination / rate limits.
- Celery for async jobs (emails, reports): Redis as broker, `@shared_task` + `delay()` — respond 202 immediately, poll or push results.
- Larger repos: `ruff` + `mypy` (django-stubs); tests via `pytest-django` with `@pytest.mark.django_db` + fixtures.

## 7. Self-check

1. What is V in MTV? How does it map to Java's Controller?
2. What does QuerySet laziness mean? SQL difference between `count()` and `len(list(qs))`?
3. `select_related` vs `prefetch_related` — which relation suits which?
4. Do migration files belong in git? Handling multi-dev migration conflicts?
5. What does a DRF Serializer do? What did ViewSet + Router delete?
6. Which web attacks does Django defend out of the box, and how?
7. A slow endpoint — your investigation and optimization sequence?

Next stop → [Data Processing Trio](./data-analysis): Python's actual home turf.
