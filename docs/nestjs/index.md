# NestJS 是什么

> 给前端工程师的后端入门地图。你已经会 TypeScript、会 Vue/React，那 NestJS 对你来说几乎是"半熟悉"的——它大量借鉴了 Angular 的思想，写起来就是"用前端的方式写后端"。

## 一句话介绍

NestJS 是一个基于 **Node.js + TypeScript** 的后端框架，用来写 API 服务（就是给你前端的页面提供数据的那个东西）。

- 官网：<a href="https://nestjs.com" target="_blank" rel="noopener noreferrer">nestjs.com</a>
- 中文文档（社区翻译）：<a href="https://docs.nestjs.cn" target="_blank" rel="noopener noreferrer">docs.nestjs.cn</a>
- 官方英文文档：<a href="https://docs.nestjs.com" target="_blank" rel="noopener noreferrer">docs.nestjs.com</a>

## 为什么前端学后端建议从 NestJS 开始

| 对比项 | Express / Koa | NestJS |
| --- | --- | --- |
| 语言 | 多为 JS | 官方 TypeScript |
| 组织方式 | 文件随意堆 | 模块化，结构固定 |
| 心智模型 | "一串中间件" | 类、装饰器、依赖注入（像 Angular/Vue3 组合式） |
| 适合 | 小脚本、Demo | 中大型项目、团队协作 |

对前端来说最舒服的三点：

1. **全是 TypeScript**：类型提示、接口定义、枚举，和你写前端项目一模一样。
2. **思想眼熟**：装饰器像 Vue 里的 `@Component`（或 Angular 的组件写法），依赖注入的思想在 Angular 里是标配。
3. **结构清晰**：Controller 管"接请求"，Service 管"干活的逻辑"，Module 管"打包分组"，职责一目了然，不会像裸 Express 那样写成一锅粥。

## 核心概念速览（先混个脸熟）

```
请求 → 守卫(Guard) → 拦截器(Interceptor) → 管道(Pipe) → 控制器(Controller) → 服务(Service) → 数据库
```

- **Controller（控制器）**：定义路由，"这个 URL 进来该走哪段代码"。
- **Service（服务）**：真正的业务逻辑，比如"查用户、下单"。
- **Module（模块）**：把相关的 Controller 和 Service 打包成一个功能块。
- **Provider / DI（依赖注入）**：你在 Controller 里 `constructor(private usersService: UsersService)` 就能直接用，不用自己 `new`——这是 NestJS 的灵魂。
- **Pipe / Guard / Interceptor / Filter**：请求进来前后的"安检、门卫、加工厂、消防栓"，后面章节逐个讲。

## 这个分区怎么读

- 零基础按顺序读：[框架原理](./principles) → [第一个项目](./first-app) → [核心概念](./controllers) → [请求处理](./middleware) → [进阶实战](./database)。
- 会了想查东西：直接跳 [速查表](./cheatsheet)。

## 前置知识

- TypeScript 基础（接口、泛型、装饰器语法——不熟也没关系，遇到会顺带解释）
- 知道 HTTP 是什么（GET/POST、状态码、JSON）
- 会用命令行和 npm

不需要任何后端经验。
