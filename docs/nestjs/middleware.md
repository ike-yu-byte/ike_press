# 中间件

Middleware 是请求进入 NestJS 流水线的**第一站**。如果你用过 Express/Koa，这章会非常眼熟——NestJS 的中间件就是在类里包装了 Express 中间件。

## 类中间件

```ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next(); // 必须！不调用则请求永远挂起
  }
}
```

## 绑定：中间件必须挂在模块上

和 Guard/Pipe 不同，中间件**不能用装饰器直接绑定**，要在模块的 `configure` 里注册：

```ts
@Module({ imports: [UsersModule] })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('users');          // 只对 /users* 生效

    consumer
      .apply(LoggerMiddleware, AuthMiddleware) // 顺序执行多个
      .exclude('auth/login', { path: 'health', method: RequestMethod.GET }) // 排除路由
      .forRoutes('*');              // 对所有路由生效
  }
}
```

`NestModule` 接口要求模块实现 `configure` 方法。

## 函数式中间件

简单场景不用写类：

```ts
consumer
  .apply((req, res, next) => {
    console.log('简单日志');
    next();
  })
  .forRoutes('*');
```

## 直接用现成的第三方中间件

比如 Express 生态的 `helmet`、`cors`（NestJS 有内置方式，见下）、`compression`：

```ts
consumer.apply(helmet()).forRoutes('*');
```

## 中间件 vs 守卫，到底用哪个

| 场景 | 用中间件 | 用守卫 |
| --- | --- | --- |
| 通用日志、请求 ID、body 解析 | ✅ | — |
| 登录鉴权、角色控制 | ❌ | ✅ |
| 需要知道路由元数据（如 `@Roles()`） | ❌ 拿不到 | ✅ |
| 需要注入 NestJS 服务 | ✅（构造函数注入） | ✅ |

一句话：**中间件是" preprocessing"，守卫是"准入判断"**。执行顺序上中间件先于守卫。

## 全局中间件

```ts
// main.ts
app.use(logger); // 函数式全局中间件
```

类中间件想全局，就在 `AppModule.configure` 里 `forRoutes('*')`。

## NestJS 应用初始化时的常见全局配置（main.ts）

顺带把 `main.ts` 里常见的几件套放一起：

```ts
const app = await NestFactory.create(AppModule);

app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true })); // 全局校验管道
app.enableCors({ origin: 'https://your-frontend.com', credentials: true });   // 跨域
app.setGlobalPrefix('api'); // 所有路由加 /api 前缀
await app.listen(3000);
```

下一篇进入实战最常用的一环：[管道与数据校验](./pipes-validation)。
