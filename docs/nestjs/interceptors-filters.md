# 拦截器与异常过滤器

这两位负责"锦上添花"和"兜底救火"：拦截器加工请求的来去（响应包装、日志、缓存），异常过滤器统一所有错误出口。

## 拦截器 Interceptor

拦截器基于 **RxJS Observable**，可以在请求前后做文章：

```
intercept() {
  // ① 请求前：改 request、记时间、开事务
  return next.handle()          // ② 调用后续流水线
    .pipe(
      map(data => data),        // ③ 响应前：改写返回值
      tap(() => ...),           //    副作用（日志）不改值
      catchError(err => ...),   //    也能接错误
    );
}
```

### 实战一：统一响应格式

前端最爱——让所有接口都返回 `{ code, data, message }`：

```ts
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, { code: number; data: T; message: string }> {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map((data) => ({ code: 0, data, message: 'ok' })),
    );
  }
}

// main.ts 全局生效
app.useGlobalInterceptors(new TransformInterceptor());
```

### 实战二：接口耗时日志

```ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const now = Date.now();
    const req = context.switchToHttp().getRequest();
    return next.handle().pipe(
      tap(() =>
        console.log(`${req.method} ${req.url} - ${Date.now() - now}ms`),
      ),
    );
  }
}
```

### 实战三：简单缓存

```ts
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private cache = new Map<string, any>();

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const key = `${req.method}:${req.url}`;

    if (this.cache.has(key)) {
      return of(this.cache.get(key)); // 命中缓存，直接返回，不调 next
    }
    return next.handle().pipe(
      tap((data) => this.cache.set(key, data)),
    );
  }
}
```

### 绑定方式

```ts
@UseInterceptors(LoggingInterceptor)  // 方法级
export class UsersController {
  @UseInterceptors(CacheInterceptor)  // 也可贴在单个方法上
  @Get()
  findAll() {}
}
// 全局：app.useGlobalInterceptors(...) 或在 AppModule providers 里用 APP_INTERCEPTOR token（推荐，可注入依赖）
```

## 异常过滤器 Exception Filter

NestJS 流水线里任何一环抛出的异常，最终都会被异常过滤器接住。

### 内置 HttpException

业务代码里直接抛，框架自动转成对应状态码的 JSON：

```ts
throw new NotFoundException(`用户 #${id} 不存在`);
// → 404 { statusCode: 404, message: "用户 #1 不存在" }

throw new UnauthorizedException('登录已过期');   // 401
throw new BadRequestException('参数不合法');     // 400
throw new ForbiddenException('没有权限');        // 403
throw new HttpException('自定义', HttpStatus.CONFLICT); // 409
```

**这是 NestJS 的核心体验：Service 里只管抛，不用 try/catch 包一层又一层。**

### 自定义业务错误类

```ts
export class BusinessException extends HttpException {
  constructor(code: number, message: string) {
    super({ code, message }, HttpStatus.OK); // 业务错误 HTTP 状态 200，用 body 里的 code 区分
  }
}

// Service 里
throw new BusinessException(10001, '库存不足');
```

### 全局异常过滤器：统一错误格式

```ts
@Catch() // 不传参数 = 捕获所有异常
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    // 未捕获的异常记得打日志排查
    if (status >= 500) console.error(exception);

    response.status(status).json({
      code: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message: typeof body === 'string' ? body : (body as any).message,
    });
  }
}

// 注册
app.useGlobalFilters(new AllExceptionsFilter());
```

### 只捕获特定类型

```ts
@Catch(BusinessException)
export class BusinessFilter implements ExceptionFilter { /* ... */ }
```

## 两者的分工

| 需求 | 拦截器 | 异常过滤器 |
| --- | --- | --- |
| 包装成功响应 | ✅ | 不合适 |
| 记录成功请求的日志/耗时 | ✅ | — |
| 统一错误响应格式 | 可以（`catchError`） | ✅ 更正统 |
| 兜底 500 | — | ✅ |

实践中常见组合：拦截器负责成功路径的包装，过滤器负责失败路径的格式，两者输出结构保持一致，前端只写一套处理逻辑。

下一篇进入真实项目离不开的话题：[数据库](./database)。
