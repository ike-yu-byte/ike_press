# 快速开始：第一个项目

## 环境准备

- Node.js ≥ 18（建议 20+）
- 包管理器 npm 或 pnpm

安装 NestJS CLI：

```bash
npm i -g @nestjs/cli
```

## 创建项目

```bash
nest new my-first-api
cd my-first-api
npm run start:dev
```

看到 `Nest application successfully started`，浏览器访问 `http://localhost:3000`，出现 `Hello World!` 就成了。

`start:dev` 是**监听模式**，改代码自动重启，相当于前端的 `vite dev`。

## 目录结构长这样

```
my-first-api
├── src
│   ├── app.controller.ts      # 控制器：处理 "/" 路由
│   ├── app.controller.spec.ts # 控制器的测试
│   ├── app.module.ts          # 根模块：整个应用的"总装车间"
│   ├── app.service.ts         # 服务：业务逻辑
│   └── main.ts                # 入口：创建并启动应用
├── test                       # E2E 测试
├── nest-cli.json              # NestJS CLI 配置
├── package.json
└── tsconfig.json              # 注意装饰器相关配置
```

## 三个关键文件

### main.ts —— 应用的"电源开关"

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule); // 1. 基于根模块创建应用（此时完成依赖组装）
  await app.listen(3000);                          // 2. 监听端口
}
bootstrap();
```

全局配置（CORS、全局前缀、全局管道等）大多在这个文件里加。

### app.module.ts —— 总装车间

```ts
@Module({
  imports: [],      // 引入其他模块
  controllers: [AppController], // 本模块的控制器
  providers: [AppService],      // 本模块的服务
})
export class AppModule {}
```

### app.controller.ts / app.service.ts —— 一对搭档

```ts
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello(); // 控制器只负责转发，逻辑在服务里
  }
}

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
```

注意 `constructor(private readonly appService: AppService)`——上一章讲的依赖注入，这里一行就完成了。

## 快速体验：加一个自己的接口

1. 修改 `app.service.ts`：

```ts
getProfile() {
  return { name: 'ike_yu', role: 'frontend learning backend' };
}
```

2. 修改 `app.controller.ts`：

```ts
@Get('profile')
getProfile() {
  return this.appService.getProfile();
}
```

3. 访问 `http://localhost:3000/profile`，返回 JSON。热更新已自动生效。

## 常用 CLI 命令（生成器）

NestJS CLI 可以一键生成带模板的文件：

```bash
nest g resource users
# 交互选择 REST API + 是否生成 CRUD
```

一条命令生成：`users.module.ts`、`users.controller.ts`、`users.service.ts`、DTO、Entity、测试文件，并自动注册到 `AppModule`。这是日常开发用得最多的命令。

其他常用的：

```bash
nest g module posts     # 只生成模块
nest g service posts    # 只生成服务
nest g controller posts # 只生成控制器
```

## tsconfig 里的两个关键项

```json
{
  "experimentalDecorators": true,   // 允许装饰器语法
  "emitDecoratorMetadata": true     // 编译时输出类型元数据（依赖注入靠它）
}
```

如果是往已有 TS 项目里集成 NestJS，这两项缺一不可。

## 下一步

- [控制器与路由](./controllers)：把 `@Get('profile')` 这类语法彻底讲透。
