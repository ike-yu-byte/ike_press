# 控制器与路由

Controller 是"前台接待"：接收 HTTP 请求，调用 Service 干活，把结果返回给客户端。**只做转发和格式，不写业务逻辑**。

## 基本写法

```ts
import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users') // 这个控制器下所有路由的前缀
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()                    // GET /users
  findAll(@Query('page') page: number) {
    return this.usersService.findAll(page);
  }

  @Get(':id')               // GET /users/42
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()                   // POST /users
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}
```

## 装饰器速查

| 装饰器 | 作用 | 对应 HTTP/来源 |
| --- | --- | --- |
| `@Controller('users')` | 声明控制器 + 路由前缀 | — |
| `@Get()` `@Post()` `@Put()` `@Patch()` `@Delete()` | 动词 + 路径 | 请求方法 |
| `@Param()` | 路径参数 `/users/:id` | URL 路径 |
| `@Query()` | 查询字符串 `?page=1` | URL `?` 后面 |
| `@Body()` | 请求体（JSON） | POST/PUT 的 body |
| `@Headers()` | 请求头 | Header |
| `@Req()` / `@Res()` | 原生 request / response 对象 | Express 对象 |

前端对照：`@Param/@Query/@Body` 就是从"不同口袋"里取数据，等于你在 axios 里拼 URL、传 params、传 body 的那三样东西。

## 状态码与响应

- 默认：`POST` 成功返回 `201`，其余返回 `200`。
- 修改状态码：

```ts
@Post()
@HttpCode(HttpStatus.OK) // 例如"登录接口"习惯上用 200
login(@Body() dto: LoginDto) {}

@Delete(':id')
@HttpCode(HttpStatus.NO_CONTENT) // 204：成功且无返回体
remove(@Param('id') id: string) {}
```

- 自定义响应头：`@Header('Cache-Control', 'none')`。
- 重定向：`@Redirect('https://nestjs.com', 301)`。

## 传递机制：没有返回错误就是成功

Controller 方法直接 `return` 数据即可，NestJS 会自动序列化成 JSON：

```ts
@Get()
findAll() {
  return this.usersService.findAll(); // 不用手动 res.json(...)
}
```

这和 Express 的 `res.json()` 不同——NestJS 帮你包了一层，也正因此才能被[拦截器](./interceptors-filters)统一加工（包响应格式、记日志）。

## 路由匹配顺序

路由按**声明顺序**匹配。注意这个经典坑：

```ts
@Get(':id')   // ❌ 写在前面，"me" 会被当成 id 匹配走
@Get('me')    // ✅ 把静态路径写在动态路径前面
@Get(':id')
```

## 子资源路由（嵌套写法）

```ts
@Controller('users')
export class UsersController {
  @Get(':id/orders')      // GET /users/42/orders
  findOrders(@Param('id') id: string) {}
}
```

也可以用两个控制器配合 `@Controller('users/:userId/orders')` 拆分文件。

## 异步处理

NestJS 原生支持 Promise 和 Observable，直接 `async/await`：

```ts
@Get(':id')
async findOne(@Param('id') id: string) {
  return this.usersService.findOne(id); // Service 里 await 查数据库
}
```

## @Res() 的注意点

用 `@Res()` 拿到原生 Express 响应对象后，就**绕过了 NestJS 的响应处理**（拦截器失效、需自己处理异常），除非加 `passthrough: true`：

```ts
@Get()
findAll(@Res({ passthrough: true }) res: Response) {
  res.status(200);      // 可以手动设状态码
  return this.usersService.findAll(); // 同时还能用 return
}
```

能不用 `@Res()` 就不用，让数据走 NestJS 的标准流程。
