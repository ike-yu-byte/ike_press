# 一次请求的完整生命周期

前面零件一个个讲了，这篇把它们串成流水线。**理解这张流程图，NestJS 就算入门了。**

## 全景图

```
HTTP 请求
  │
  ▼
① 中间件 Middleware        （快递分拣：记录、解析，无权限概念）
  │
  ▼
② 守卫 Guard               （门卫：能不能进？没登录直接 401）
  │
  ▼
③ 拦截器 Interceptor（前）  （开工前：记开始时间、事务）
  │
  ▼
④ 管道 Pipe                （安检机：参数校验/转换，不合格 400）
  │
  ▼
⑤ 控制器 Controller        （接待：路由分发，调用 Service）
  │
  ▼
⑥ 服务 Service             （干活：业务逻辑、查数据库）
  │
  ▼
⑦ 拦截器 Interceptor（后）  （加工：包装响应、记耗时）
  │
  ▼
⑧ 异常过滤器 Exception Filter（消防：任何一步抛错都会落到这，统一错误格式）
  │
  ▼
HTTP 响应
```

## 每一站用代码感受一下

### ① 中间件 —— 最先处理，还看不懂"路由是谁"

```ts
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`${req.method} ${req.url} 到站了`);
    next(); // 必须调用，否则请求挂起
  }
}
// 绑定（在模块里）：
configure(consumer: MiddlewareConsumer) {
  consumer.apply(LoggerMiddleware).forRoutes('*');
}
```

### ② 守卫 —— 决定"放行还是拦截"

```ts
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return Boolean(request.headers.authorization); // 有 token 才放行
  }
}
// 返回 false → 直接 403，后面全部不执行
```

### ④ 管道 —— 校验和转换参数

```ts
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {}
// id=abc → 自动返回 400；id=42 → 转成 number 传进来
```

### ③⑦ 拦截器 —— 前后夹击

```ts
@Injectable()
export class TimingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    return next
      .handle() // 调用流水线的下一站
      .pipe(
        tap(() => console.log(`耗时 ${Date.now() - start}ms`)), // 响应前
      );
  }
}
```

### ⑧ 异常过滤器 —— 兜底

```ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    response.status(status).json({
      code: status,
      message: exception instanceof HttpException ? exception.message : '服务器开小差了',
    });
  }
}
```

Service 里抛的 `NotFoundException` 会一路向上飞，最终在这里被接住，变成统一的 JSON 错误格式——**所以业务代码里只管抛，不用 try/catch 满天飞**。

## 执行顺序的实用推论

1. **鉴权用 Guard，别用中间件**：Guard 知道路由元数据（比如 `@SetMetadata('roles', ['admin'])`），能做精细控制；中间件在路由解析前执行，拿不到这些。
2. **参数校验用 Pipe**：在进 Controller 之前把脏数据挡掉，Controller 拿到的永远是干净数据。
3. **响应包装/日志/缓存用拦截器**：基于 RxJS，能拿到"即将返回的数据"，做统一 `code/data/message` 包装最合适。
4. **错误格式统一靠异常过滤器**：全站错误一个出口。

## 拿到"当前路由的信息"

Guard/Interceptor/Filter 里经常需要知道"现在是哪个 handler、有哪些装饰器"：

```ts
const ctx = context.switchToHttp();
const request = ctx.getRequest<Request>();
const handler = context.getHandler();     // 即将执行的控制器方法
const classRef = context.getClass();      // 所属控制器类
const roles = this.reflector.get('roles', handler); // 读装饰器元数据
```

## 小结

```
中间件 → 守卫 → 拦截器(前) → 管道 → Controller → Service → 拦截器(后) → 异常过滤器
```

- 普通成功响应按这个顺序；任何环节抛异常，直接跳到异常过滤器。
- 接下来三章分别深挖：[中间件](./middleware)、[管道与校验](./pipes-validation)、[守卫与 JWT](./guards-auth)、[拦截器与过滤器](./interceptors-filters)。
