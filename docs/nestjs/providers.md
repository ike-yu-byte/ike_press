# Provider 与 Service

## 什么是 Provider

Provider 是 NestJS 里最基础的概念：**能被 IoC 容器创建、管理并注入给别人的东西**。最常见的 Provider 就是 `@Injectable()` 标记的 Service。

```
Controller（接待） → Service（干活） → Repository / 外部服务（真正摸数据）
```

## 一个标准的 Service

```ts
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable() // 声明：我可被容器管理、可被注入
export class UsersService {
  private readonly users: User[] = []; // 示例用内存存，实际接数据库

  findAll(): User[] {
    return this.users;
  }

  findOne(id: string): User {
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      // 抛异常，交给全局异常过滤器统一处理（返回 404 JSON）
      throw new NotFoundException(`用户 #${id} 不存在`);
    }
    return user;
  }

  create(dto: CreateUserDto): User {
    const user = { id: Date.now().toString(), ...dto };
    this.users.push(user);
    return user;
  }
}
```

要点：

- **Service 不认识 Controller**：只提供方法，谁来调都行，所以可以复用（比如定时任务也能调它）。
- **抛 `HttpException` 子类**而不是 `return 错误对象`，错误处理交给框架统一做。

## 注册进模块

Service 必须在某个 Module 的 `providers` 里声明，才能被注入：

```ts
@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

忘写这一行，报错会是经典三连：`Nest can't resolve dependencies of the UsersController`。

## 自定义 Provider：同一个 token，不同实现

Provider 的本质是 **token（标识） → 实现** 的映射，所以可以灵活替换：

```ts
@Module({
  providers: [
    // 1. 标准写法（简写形式，等价于下面的完整写法）
    UsersService,

    // 2. 完整写法
    { provide: UsersService, useClass: UsersService },

    // 3. useValue：直接给现成的值（配置对象、Mock）
    { provide: 'API_URL', useValue: 'https://api.example.com' },

    // 4. useFactory：需要复杂初始化逻辑时（异步也支持）
    {
      provide: 'DB_CONNECTION',
      useFactory: (config: ConfigService) => createConnection(config.get('DB_URL')),
      inject: [ConfigService],
    },
  ],
})
export class CoreModule {}
```

使用时用 `@Inject()` 按 token 取：

```ts
constructor(@Inject('API_URL') private readonly apiUrl: string) {}
```

这个"可替换"能力是 NestJS 可测试性的根基——[测试篇](./testing)里会把 `UsersService` 整个换成 Mock。

## 从别模块借 Service

Service 默认只在本模块内可注入。想跨模块使用，两步：

```ts
// 1. 提供方模块导出
@Module({ providers: [UsersService], exports: [UsersService] })
export class UsersModule {}

// 2. 使用方模块导入
@Module({ imports: [UsersModule] })
export class OrdersModule {}
```

之后 `OrdersService` 里就能 `constructor(private usersService: UsersService)` 了。

## 作用域

```ts
@Injectable({ scope: Scope.REQUEST })  // 每个请求新实例
@Injectable({ scope: Scope.TRANSIENT }) // 每次注入都是新实例
```

默认 SINGLETON（单例）。**绝大多数情况保持默认**，请求级状态请通过方法参数传递。

## 可选注入

依赖不一定存在时，加 `@Optional()`：

```ts
constructor(@Optional() private readonly cache?: CacheService) {}
```

## 小结

- `@Injectable()` = "我可以被容器管理"。
- Provider 本质是 token → 实现的映射，`useClass/useValue/useFactory` 三种玩法。
- 跨模块共享要 `exports` + `imports`。
- 默认单例，别在 Service 实例属性里存请求级状态。
