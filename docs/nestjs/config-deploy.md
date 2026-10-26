# 配置、环境变量与 CORS

## 环境变量：.env 文件

原则：**代码里不出现任何环境相关配置**（数据库地址、密钥、端口），全部走环境变量。

### 安装与使用

```bash
npm i @nestjs/config
```

```ts
// app.module.ts
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })], // 全局可用
})
export class AppModule {}
```

```bash
# .env（不进 Git，.gitignore 里加一行）
DATABASE_URL=mysql://user:pass@localhost:3306/app
JWT_SECRET=super-secret
PORT=3000
```

### 在代码里读取

```ts
@Injectable()
export class SomeService {
  constructor(private config: ConfigService) {}

  getDbUrl() {
    return this.config.get<string>('DATABASE_URL');
  }
}
```

### 用 schema 校验环境变量（推荐）

环境变量缺了等到运行时才炸，不如启动时就报错。用 `class-validator` 做启动校验：

```ts
// env.validation.ts
export function validate(config: Record<string, unknown>) {
  const schema = plainToClass(EnvironmentVariables, config, { enableImplicitConversion: true });
  const errors = syncValidate(schema);
  if (errors.length) throw new Error(errors.toString());
  return config;
}

// ConfigModule.forRoot({ validate })
```

多环境文件：`ConfigModule.forRoot({ envFilePath: ['.env.local', '.env'] })`，前面的优先。

## CORS 跨域

前端调后端 API，八成会遇到跨域。NestJS 内置支持：

```ts
// main.ts
app.enableCors({
  origin: ['https://your-frontend.com', 'http://localhost:5173'], // 允许的来源
  credentials: true,               // 允许带 cookie
  methods: 'GET,POST,PUT,PATCH,DELETE',
});
```

开发环境图省事可以 `origin: true`（反射请求来源），生产务必收敛白名单。

## 静态资源

后端顺便托管图片等静态文件：

```ts
// 需要先 npm i @nestjs/serve-static
ServeStaticModule.forRoot({
  rootPath: join(__dirname, '..', 'uploads'),
  serveRoot: '/static',
}),
```

## 上传文件

```ts
// 需要 npm i multer @types/multer
@Post('upload')
@UseInterceptors(
  FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 限 5MB
  }),
)
upload(@UploadedFile() file: Express.Multer.File) {
  return { url: `/static/${file.filename}` };
}
```

## 打包与部署

### 构建

```bash
npm run build   # 产物在 dist/
node dist/main.js
```

### 部署方式选择

| 方式 | 适合 |
| --- | --- |
| Docker + 云服务器 | 完全控制，最通用 |
| PM2 + 服务器 | 传统 Node 部署，简单直接 |
| Serverless（阿里云函数计算 / Vercel） | 低流量、省钱，需适配层 |

### Docker 部署示例

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### PM2 部署

```bash
npm i -g pm2
pm2 start dist/main.js --name my-api
pm2 startup && pm2 save  # 开机自启
```

### 生产检查清单

- [ ] `NODE_ENV=production`，关闭详细堆栈输出
- [ ] 环境变量通过部署平台注入，`.env` 不进仓库
- [ ] 数据库 `synchronize` 关闭，走迁移
- [ ] 配好 HTTPS（Nginx 反代或平台自带）
- [ ] 日志收集（Winster / Pino），异常告警
- [ ] 健康检查接口 `/health` 供负载均衡探活

## Swagger 文档（顺手就有）

后端接口给前端/客户端用，自动生成 API 文档：

```bash
npm i @nestjs/swagger
```

```ts
// main.ts
const config = new DocumentBuilder()
  .setTitle('My API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('docs', app, document); // 访问 /docs 查看接口文档
```

DTO 上的 `class-validator` 装饰器会被自动读取为字段说明，配合 `@ApiProperty()` 更完整。前端从此告别手写接口文档。

下一篇：[单元测试与 E2E 测试](./testing)。
