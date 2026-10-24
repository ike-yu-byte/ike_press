# 模块系统

Module 是 NestJS 的"组织单位"：应用不是一个平铺的大文件，而是一组模块拼成的树。

```
AppModule（根）
├── UsersModule      用户功能：Controller + Service + Entity
├── OrdersModule     订单功能
├── AuthModule       登录认证
└── DatabaseModule   数据库连接（全局）
```

## 基本写法

```ts
@Module({
  imports: [UsersModule],        // 引入其他模块（获得其 exports）
  controllers: [UsersController], // 本模块的控制器
  providers: [UsersService],      // 本模块的服务
  exports: [UsersService],        // 对外提供什么（不写则本模块私有）
})
export class UsersModule {}
```

每个应用至少有一个根模块 `AppModule`，`main.ts` 从它启动。

## 典型拆分方式

按**业务功能**拆，不按技术类型拆：

- ✅ `UsersModule`（该功能的 controller/service/dto/entity 都在里面）
- ❌ `AllControllersModule`、`AllServicesModule`（反模式）

功能内聚后，删除或重构一个功能就是挪一个文件夹。

## 模块之间的依赖关系

```
OrdersModule 想用 UsersService：

UsersModule:
  exports: [UsersService]        ← 我允许别人用

OrdersModule:
  imports: [UsersModule]         ← 我要用它的东西
```

不 `exports` 就是模块私有的，强行注入会报 `can't resolve dependencies` 错误——这其实是好事，逼你把模块边界想清楚。

## 全局模块

有些东西到处要用（配置、数据库连接），每个模块都 `imports` 太啰嗦：

```ts
@Global()
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
```

`@Global()` 之后在 `AppModule` `imports` 一次即可全站可用。

> 建议只把"真正的基建"设为全局（配置、数据库、日志），业务模块老老实实显式 imports，依赖图才清晰。

## 动态模块：带参数的模块

模块也能像函数一样传参。典型例子是配置模块：

```ts
// 使用方（在 AppModule 里）
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRoot({ type: 'mysql', host: process.env.DB_HOST, /* ... */ }),
  ],
})
export class AppModule {}
```

`forRoot / forFeature` 命名约定：

- `forRoot()`：配置整个模块，通常在根模块调一次（如数据库连接）。
- `forFeature()`：在业务模块里注册"本模块用到哪张表"：

```ts
@Module({
  imports: [TypeOrmModule.forFeature([User])], // 声明本模块用 User 实体
  providers: [UsersService],
})
export class UsersModule {}
```

## 共享模块的标准姿势

写一个可复用模块（比如短信发送），惯用三件套：

```ts
// 动态生成 + 全局可选
@Module({})
export class SmsModule {
  static register(options: SmsOptions): DynamicModule {
    return {
      module: SmsModule,
      providers: [{ provide: 'SMS_OPTIONS', useValue: options }, SmsService],
      exports: [SmsService],
    };
  }
}
```

## 结构心法

看一个模块文件，你就应该能回答三个问题：

1. 这个功能对外暴露了哪些路由？（`controllers`）
2. 内部有哪些可注入的服务？（`providers`）
3. 依赖/开放了哪些能力？（`imports` / `exports`）

回答不了，说明模块拆分有问题。

下一篇把所有零件串起来：[一次请求的完整生命周期](./request-lifecycle)。
