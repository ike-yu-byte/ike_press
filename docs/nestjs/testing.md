# 单元测试与 E2E 测试

NestJS 开箱自带 Jest 测试环境。`nest g` 生成的每个文件都配了 `.spec.ts`，测试文化是刻在框架里的。

前面讲的依赖注入在这里兑现红利：**因为依赖都是容器注入的，测试时能轻松换成 Mock。**

## 单元测试：测 Service

```ts
// users.service.spec.ts
describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        // 手动构造，不连数据库
        { provide: UsersRepository, useValue: { find: () => [{ id: 1 }] } },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should find all users', () => {
    expect(service.findAll()).toEqual([{ id: 1 }]);
  });

  it('should throw when user not found', () => {
    expect(() => service.findOne('404')).toThrow(NotFoundException);
  });
});
```

关键点：`Test.createTestingModule` 就是"迷你版 AppModule"，用 `useValue` 把真实依赖换成 Mock——这正是 [Provider 可替换性](./providers)的用武之地。

## 单元测试：测 Controller

```ts
describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        // 把 Service 换成 Mock 对象
        { provide: UsersService, useValue: { findOne: () => ({ id: '1', name: 'yu' }) } },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('returns user by id', () => {
    expect(controller.findOne('1')).toEqual({ id: '1', name: 'yu' });
  });
});
```

## E2E 测试：测整个应用

E2E 测试启动一个真实的应用实例，发真正的 HTTP 请求，验证整条流水线（守卫、管道、拦截器全在）：

```ts
// test/app.e2e-spec.ts
describe('UsersController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule], // 注意：真实 AppModule，记得用测试数据库
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET /users/1', () =>
    request(app.getHttpServer())
      .get('/users/1')
      .expect(200)
      .expect((res) => {
        expect(res.body.name).toBe('yu');
      }));

  it('POST /users 参数不合法 → 400', () =>
    request(app.getHttpServer())
      .post('/users')
      .send({ email: 'not-an-email' })
      .expect(400));

  afterAll(async () => {
    await app.close();
  });
});
```

## 常用命令

```bash
npm run test       # 跑所有单元测试
npm run test:watch # 监听模式
npm run test:cov   # 覆盖率报告
npm run test:e2e   # 跑 E2E
```

## 测试策略建议

| 层 | 测什么 | 值不值得 |
| --- | --- | --- |
| Service | 业务逻辑分支、异常路径 | 必测，收益最高 |
| Controller | 一般不单独测（逻辑薄） | E2E 覆盖即可 |
| Guard/Pipe | 复杂鉴权规则值得测 | 按需 |
| E2E | 核心链路：登录→下单 | 必测 |

个人经验：先保证核心业务的 Service 单测 + 关键链路的 E2E，别追求覆盖率数字。

## supertest 之外

需要更接近真实的 E2E 时，可以配 Playwright 直接发 HTTP 或者干脆测前端 + 后端联调场景；契约测试（OpenAPI 驱动）可基于 [Swagger 文档](./config-deploy)生成。

下一篇是收官：[速查表与学习路线](./cheatsheet)。
