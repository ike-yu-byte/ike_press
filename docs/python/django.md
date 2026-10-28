# Django 全栈框架

> 第 3 站（下）："全家桶"框架。Django 的哲学是**电池全含**：ORM、Admin 后台、鉴权、表单、迁移、缓存、安全防御全部内置且互相打通。做内容管理、后台系统、CRUD 重的业务，Django 的交付速度无出其右。

## 一、项目结构与 MTV 架构

```bash
django-admin startproject config .       # 项目（配置层）
python manage.py startapp blog           # 应用（业务模块）——按领域拆 app 是 Django 的核心组织方式
python manage.py runserver               # 开发服务器
```

```
config/  settings.py urls.py wsgi.py asgi.py   ← 项目配置与总路由
blog/   models.py views.py admin.py apps.py    ← 应用：M、T(视图)、模板
        migrations/                             ← 数据库变更的版本记录
```

**MTV 模型**：Model（数据层）→ Template（展示层）→ **View（业务逻辑，注意 Django 的 View 相当于别家的 Controller）**。请求流：`URLconf 匹配 → view 处理 → 返回 HttpResponse`。

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
    created = models.DateTimeField(auto_now_add=True)      # 自动填充三件套：
    updated = models.DateTimeField(auto_now=True)          # auto_now_add / auto_now / default=timezone.now

    class Meta:
        ordering = ["-created"]                            # 默认排序
        indexes = [models.Index(fields=["status", "-created"])]   # 组合索引——高频查询路径

    def __str__(self) -> str:                              # Admin 与调试显示用
        return self.title
```

```bash
python manage.py makemigrations        # 根据 Model 变更生成迁移文件（要提交进 git）
python manage.py migrate               # 应用到数据库——等价 Flyway 的 versioned migration
python manage.py shell                 # 交互式操作 ORM 的 REPL
```

### QuerySet：惰性求值是灵魂

```python
# 查询永远返回 QuerySet（惰性 SQL 描述），真正执行发生在被遍历时
recent = Post.objects.filter(status="published", created__gte=week_ago) \
                     .select_related("author") \          # FK 一对一：JOIN 预加载，杀 N+1
                     .prefetch_related("tags") \          # 多对多：二次 IN 查询预加载
                     .only("id", "title", "author__name") \
                     .order_by("-created")[:20]           # 切片 = SQL LIMIT

recent.count()          # 触发 COUNT(*)——注意 list(recent) 后再 len() 会把全表拉进内存
Post.objects.create(title="t", author=a)                  # 即插即 save()
Post.objects.filter(id=1).update(status="published")      # 批量 UPDATE 一条 SQL；逐条 save() 是 N 条
F("view_count").__class__                                  # F 对象：数据库侧原子自增，防竞态
# 事务：from django.db import transaction
with transaction.atomic():                                 # 视图函数默认各自提交；多写操作包事务
    ...
```

- 双下划线查询语法：`created__gte` / `author__name__icontains` / `tags__in`——跨关系查询就是点号链的 SQL 版。
- 高频坑：`.filter().update()` 后对象内存值不刷新；循环里 `get()`（应批量 `in_bulk`）；大表 `delete()`（QuerySet 删除逐条发信号，超慢，海量数据走原生 SQL 或分批）。

## 三、视图、URL 与 DRF API

```python
# 函数视图 vs 类视图；API 时代主流是 Django REST Framework（DRF）
# posts/api.py
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response

class PostViewSet(viewsets.ModelViewSet):        # 一个类 = list/create/retrieve/update/partial/destroy 六个端点
    queryset = Post.objects.select_related("author").filter(status="published")
    serializer_class = PostSerializer            # 序列化器 = DTO 映射 + 入参校验
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "body"]

    @action(detail=True, methods=["post"])       # 自定义子资源：POST /posts/1/publish/
    def publish(self, request, pk=None):
        post = self.get_object()
        post.status = Post.Status.PUBLISHED
        post.save(update_fields=["status"])
        return Response(PostSerializer(post).data)
```

```python
# urls.py —— DRF Router 自动生成 REST 路由
from rest_framework.routers import DefaultRouter
router = DefaultRouter()
router.register("posts", PostViewSet)
urlpatterns = [path("api/", include(router.urls))]
```

- 序列化器要点：字段显式声明（别 `fields = "__all__"` 上生产，防止意外暴露敏感列）；`validate_<field>` 钩子做业务校验。
- 分页：DRF `PageNumberPagination` 或性能更好的 `LimitOffsetPagination`；游标分页（CursorPagination）适合无限流。
- 鉴权：`TokenAuthentication` / **`SimpleJWT`（JWT 双 token）** / Session；权限类 `IsAuthenticated`、自定义 `BasePermission`——概念细节见[分布式专题](../java/distributed)认证节。

## 四、Admin：白送的后台管理系统

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

面试加分说法："Django Admin 让运营自助处理 80% 的数据订正，省下整个后台前端"——但生产要收紧权限、审计操作日志、改 URL 前缀。

## 五、中间件、信号与安全

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

- 内置安全（Django 的护城河）：CSRF 双提交 token、XSS 模板自动转义、SQL 注入由 ORM 参数化免疫、`SECURE_*` 系列 HTTPS/HSTS 开关、XSS 过滤——面试问"Web 安全三件套 Django 怎么防"直接对答。
- 信号（signal）`post_save` 做解耦副作用要克制——隐式调用链是排查黑洞，能显式调用不打信号。
- settings 分环境：`base.py / dev.py / prod.py` + `python-decouple` 或环境变量注入密钥；`DEBUG=False` 时 500 页不泄露栈。

## 六、性能与部署

```bash
# 生产四件套：Nginx(静态/TLS) → Gunicorn/Uvicorn(worker) → Django → PostgreSQL
gunicorn config.wsgi:application -w 4 -k gthread --threads 2 -b :8000 --timeout 60
```

- 优化顺序背熟：**先量化再优化**——`django-debug-toolbar` / `nplusone` 找慢查询 → 加索引 → `select_related/prefetch_related` 杀 N+1 → Redis 缓存热点（`cache.get_or_set`）→ 静态化/分页限流。
- Celery 异步任务（发邮件、跑报表）：broker 用 Redis，`@shared_task` + `delay()`——同步接口先回 202，任务结果轮询或推送。
- 大项目上 `ruff` + `mypy`（Django 有 django-stubs）；测试用 `pytest-django`，`@pytest.mark.django_db` + fixtures 建数据。

## 七、本章自检清单

1. MTV 里 V 是什么？和 Java MVC 的 C 怎么对应？
2. QuerySet 的"惰性"什么意思？`count()` 和 `len(list(qs))` 的 SQL 差别？
3. `select_related` vs `prefetch_related` 各适合什么关系？
4. 迁移文件要不要进 git？多人协作迁移冲突怎么处理？
5. DRF 的 Serializer 承担什么职责？ViewSet + Router 少写了什么代码？
6. Django 内置防了哪几类 Web 攻击？分别靠什么机制？
7. 一个接口慢，你的排查和优化顺序是什么？

下一站 → [数据处理三件套](./data-analysis)：Python 真正的看家本领。
