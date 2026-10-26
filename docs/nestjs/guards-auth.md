# 守卫与 JWT 认证实战

Guard（守卫）实现 `CanActivate` 接口，返回 `true` 放行、`false` 拒绝（403）。它执行在中间件之后、拦截器之前，**是做鉴权最合适的位置**——因为它能拿到路由的元数据。

## 最小示例

```ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class SimpleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    return Boolean(request.headers.authorization); // 有 Authorization 头就放行
  }
}

// 绑定方式一：装饰器（推荐）
@UseGuards(SimpleGuard)
@Get('admin/data')
getAdminData() {}

// 绑定方式二：全局
// main.ts
app.useGlobalGuards(new SimpleGuard());
```

## 基于 Roles 元数据精细控制

先自定义装饰器打标：

```ts
// roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

守卫用 `Reflector` 读取：

```ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true; // 没打标的路由不限制

    const { user } = context.switchToHttp().getRequest();
    return required.some((role) => user.roles?.includes(role));
  }
}
```

控制器上使用：

```ts
@UseGuards(RolesGuard)
@Roles('admin')
@Delete(':id')
remove(@Param('id') id: string) {}
```

## 实战：JWT 登录认证

完整流程：

```
1. 用户 POST /auth/login {账号, 密码}
2. AuthController → AuthService 校验密码 → 签发 JWT
3. 前端存下 token，之后每次请求带 Authorization: Bearer <token>
4. JwtAuthGuard 验证 token → 通过则把用户信息挂到 request.user
```

### 安装

```bash
npm i @nestjs/jwt passport passport-jwt bcrypt
npm i -D @types/passport-jwt
```

### 1. 登录并签发 token

```ts
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('账号或密码错误');
    }
    const payload = { sub: user.id, email: user.email }; // sub = 用户唯一标识
    return {
      access_token: this.jwtService.sign(payload), // 默认 HS256，有效期可配
    };
  }
}
```

```ts
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
```

### 2. 验证 token 的守卫

```ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new UnauthorizedException('缺少 token');

    try {
      request.user = this.jwtService.verify(token); // 验证通过，挂到 request
      return true;
    } catch {
      throw new UnauthorizedException('token 无效或已过期');
    }
  }
}
```

### 3. 注册与使用

```ts
// auth.module.ts
@Module({
  imports: [JwtModule.register({ secret: '你的密钥', signOptions: { expiresIn: '7d' } })],
  providers: [AuthService, JwtAuthGuard],
})
export class AuthModule {}

// 业务控制器
@UseGuards(JwtAuthGuard)
@Get('me')
me(@Req() req) {
  return req.user; // 守卫里挂上去的用户信息
}
```

### 4. 注册进模块

```ts
@Module({
  imports: [JwtModule.register({...})],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
```

## 生产实践要点

- **密钥放环境变量**：`JwtModule.registerAsync({ useFactory: (config) => ({ secret: config.get('JWT_SECRET') }) })`，绝不能硬编码进代码仓库。
- **token 过期策略**：access token 短命（15 分钟~2 小时）+ refresh token 长命（7 天）双 token 机制。
- **密码必须 bcrypt 加盐哈希**存库，永远不存明文。
- 公开路由（登录、注册、健康检查）配合 `@Public()` 装饰器 + 全局 JwtAuthGuard 排除，避免每个 Controller 都写 `@UseGuards`。

## 小结

- Guard = 门卫，`CanActivate` 返回布尔决定生死，能读路由元数据做精细控制。
- JWT 认证三步：登录签发 → 守卫验证 → `request.user` 使用。
- 鉴权逻辑集中在 Guard，业务 Controller 不掺和权限判断。

下一篇：[拦截器与异常过滤器](./interceptors-filters)。
