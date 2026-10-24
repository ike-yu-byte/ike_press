# 框架原理：IoC 与依赖注入

这一篇讲 NestJS 的"发动机"。理解了 IoC 和依赖注入（DI），后面所有章节都只是在给这台发动机装零件。

## 1. 没有框架时我们怎么写

假设裸写 Node 服务，代码通常长这样：

```ts
// 手动创建依赖，手动传递
const userService = new UserService(new UserRepository(dbConfig));
const orderService = new OrderService(userService, new PayService(payConfig));

app.post('/orders', (req, res) => {
  orderService.create(req.body); // 依赖关系全靠手工组装
});
```

问题：

- 每个类要什么依赖，你得自己 `new` 出来传进去，项目大了就是一场"依赖接线工程"。
- 想把 `UserRepository` 换成 Mock（测试时），得改一串代码。
- 依赖关系散落在各个文件里，看不出来谁依赖谁。

## 2. IoC：把"组装"这件事交给框架

**IoC（Inversion of Control，控制反转）**：对象的创建和组装不再由你自己控制，而是"反转"交给框架的容器（IoC Container）来做。

你只需要声明"我需要什么"，框架负责"造出来并递给你"：

```ts
@Controller()
export class OrdersController {
  // 我需要 OrderService，框架你看着办
  constructor(private readonly ordersService: OrdersService) {}
}
```

你没写 `new OrdersService(...)`，但 `ordersService` 就是可用的。这就是**依赖注入（Dependency Injection，DI）**——IoC 是思想，DI 是实现手段。

> 类比前端：Vue 的 `provide / inject`，Angular 的构造函数注入，都是同一个思想。

## 3. NestJS 怎么知道该造什么？

靠两样东西：**装饰器** + **反射（Reflection）**。

### 装饰器收集信息

`@Injectable()`、`@Controller()` 这些装饰器本质上是给类"贴标签 + 记笔记"：

```ts
@Injectable()
export class OrdersService {}
```

`@Injectable()` 标记这个类"可以被容器管理、可以注入给别人"。

### 反射读取信息

TypeScript 编译时会把构造函数的**参数类型**写进元数据（前提：`tsconfig.json` 里 `emitDecoratorMetadata: true`，NestJS CLI 创建的项目默认开启）。NestJS 启动时用 Reflect API 读出这些类型：

```ts
// NestJS 内部大致做的事（简化）
const types = Reflect.getMetadata('design:paramtypes', OrdersController);
// → [ OrdersService ]  知道了：它依赖 OrdersService

const ordersService = new OrdersService(new OrdersRepository(...));
return new OrdersController(ordersService);
```

整条链路串起来就是：

```
启动 → 扫描所有 Module → 找到所有 @Injectable 的类
     → 读每个类构造函数的参数类型（反射）
     → 递归地创建依赖，装进容器
     → 谁需要就注入谁（单例）
```

### 类型对不上的情况：@Inject()

TS 类型在**运行时会被擦除**。如果依赖是接口、抽象类或动态值，类型元数据是 `Object`，容器猜不出来，就要手动指定 token：

```ts
constructor(@Inject('CACHE_MANAGER') private cacheManager: Cache) {}
```

这也是为什么 NestJS 社区约定：**注入的依赖尽量用具体的类**（class 在运行时是真实存在的值），而不是纯 interface。

## 4. 容器里的对象是单例

默认情况下，每个 Provider 在整个应用里**只有一个实例**，所有请求共享。

- 好处：省内存、可以在 Service 里做内存缓存。
- 注意：**不要把"每个请求独有的状态"存在 Service 的实例属性里**，否则会串数据。请求级别的信息请走参数（`@Req()`、`@Body()`）。

作用域可以调：`@Injectable({ scope: Scope.REQUEST })` 变成每个请求一个新实例（有性能代价，慎用）。

## 5. 循环依赖怎么办

A 依赖 B、B 又依赖 A 时，容器没法按顺序创建。NestJS 提供 `forwardRef`：

```ts
// a.service.ts
constructor(@Inject(forwardRef(() => BService)) private bService: BService) {}

// b.service.ts
constructor(@Inject(forwardRef(() => AService)) private aService: AService) {}
```

两个文件都要加。但更好的解法通常是重构：把公共逻辑抽到第三个 Service。

## 6. 为什么 NestJS 这么设计

- **可替换**：依赖都是通过容器拿的，测试时用 `useValue` / `useFactory` 换成 Mock 即可（见[测试篇](./testing)）。
- **可发现**：`Module` 声明了显式的依赖图，看一个模块文件就知道这个功能用了什么。
- **约定大于配置**：装饰器 + 命名约定（`xxx.controller.ts`、`xxx.service.ts`），新成员看目录就懂。

## 小结

- IoC = "别自己 new，找容器要"。
- DI 的实现 = 装饰器打标 + 反射读类型 + 容器统一创建。
- 默认单例，请求状态别放 Service 属性里。
- 接口注入要 `@Inject()` 指定 token。

下一篇动手创建项目，把原理落到代码上。
