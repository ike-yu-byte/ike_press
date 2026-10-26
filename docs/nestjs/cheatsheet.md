# 速查表与学习路线

## 装饰器速查

### 类与结构

```ts
@Module({...})       // 模块
@Controller('users') // 控制器 + 前缀
@Injectable()        // 可注入（Service/守卫/管道/拦截器/过滤器通用）
@Global()            // 全局模块
```

### 路由

```ts
@Get() @Post() @Put() @Patch() @Delete() @All()
@HttpCode(204) @Header('x-a', 'b') @Redirect('/new', 301)
```

### 参数

```ts
@Body() @Body('name') @Query() @Query('page') @Param() @Param('id')
@Headers() @Headers('authorization') @Req() @Res({ passthrough: true })
@Session() @Ip() @UploadedFile() @Next()
```

### 组合使用

```ts
@UseGuards(JwtAuthGuard)      // 守卫
@UseInterceptors(LogInterceptor) // 拦截器
@UsePipes(ValidationPipe)     // 管道
@UseFilters(HttpExceptionFilter) // 过滤器
@SetMetadata('roles', ['admin']) // 打元数据标
```

## Provider 三种定义

```ts
providers: [
  UsersService,                                        // useClass 简写
  { provide: 'TOKEN', useValue: xxx },                 // 现成值
  { provide: 'X', useFactory: (a) => build(a), inject: [AService] }, // 工厂
  { provide: UsersService, useClass: MockUsersService }, // 换实现（测试利器）
]
```

## 异常速查

```ts
BadRequestException(400)   UnauthorizedException(401)
NotFoundException(404)     ForbiddenException(403)
ConflictException(409)     InternalServerErrorException(500)
// 自定义业务错误：继承 HttpException
```

## 常用 CLI

```bash
nest new app            # 新项目
nest g resource users   # 生成一整套 CRUD 资源（最常用）
nest g module/service/controller xxx
nest g guard/pipe/interceptor/filter/middleware xxx
```

## 生命周期（启动时）

```
onModuleInit → 所有模块初始化后
onApplicationBootstrap → 应用完全就绪前
// 实现对应接口（如 PrismaService 里 $connect）
```

## 学习路线图

```
第 1 周：跑通第一个项目，理解 Controller/Service/Module
         （原理篇 → 快速开始 → 控制器 → Provider → 模块）
第 2 周：掌握请求流水线，写出有校验、有统一响应的 CRUD
         （生命周期 → 中间件 → 管道与校验 → 拦截器与过滤器）
第 3 周：接数据库 + 登录认证，做出真实小项目（博客 API / 待办事项）
         （守卫与 JWT → 数据库）
第 4 周：工程化收尾
         （配置与部署 → 测试 → 回头重读原理篇，会有新体会）
```

## 实战项目建议（由易到难）

1. **Todo API**：CRUD + 校验 + 统一响应，纯内存或 SQLite。
2. **博客 API**：用户注册登录（JWT）+ 文章 CRUD + 评论关联（练数据库关系）。
3. **带角色的后台 API**：RBAC 权限（RolesGuard）+ 文件上传 + Swagger。
4. **给现有前端项目写 BFF**：把你前端项目里假的数据接口换成真后端，最有成就感。

## 常见坑备忘

- `Nest can't resolve dependencies...` → 依赖没加进 `providers`，或所属模块没被 `imports`/没 `exports`。
- DTO 校验不生效 → 忘了全局注册 `ValidationPipe`，或 DTO 写成了 interface（必须是 class）。
- 循环依赖报错 → `forwardRef()`，或重构抽公共 Service。
- `synchronize: true` 上生产 → 表结构被意外改动，务必关掉走迁移。
- Service 里存请求级状态导致数据串了 → 默认单例，请求状态走参数。
- E2E 测试连了开发库把数据清了 → 测试环境单独的数据库。

## 资源

- 官方文档：<a href="https://docs.nestjs.com" target="_blank" rel="noopener noreferrer">docs.nestjs.com</a>（英文，质量很高）
- 中文文档：<a href="https://docs.nestjs.cn" target="_blank" rel="noopener noreferrer">docs.nestjs.cn</a>（社区翻译）
- 官方示例仓库：<a href="https://github.com/nestjs/nest/tree/master/sample" target="_blank" rel="noopener noreferrer">nestjs/nest sample</a>（几十个集成示例，集成什么库先来这里抄）
- 全栈课程思路参考：NestJS 作者出品的 <a href="https://courses.nestjs.com" target="_blank" rel="noopener noreferrer">NestJS Courses</a>

到这里，你从"只会写页面"到"能独立写一个带认证、有数据库、有测试、可部署的后端 API"了。剩下的就是多写。
