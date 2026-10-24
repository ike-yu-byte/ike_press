# 管道与数据校验

Pipe 的职责：在参数到达 Controller 之前，做**转换（transformation）**和**校验（validation）**。脏数据在这里被挡下并返回 400。

前端对照：相当于 form 表单校验，但发生在服务端——**永远不要相信客户端传来的数据**。

## 内置管道

```ts
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {}
// 'abc' → 400；'42' → number 42

@Get()
findByPage(@Query('page', new ParseIntPipe({ errorHttpStatusCode: 422 })) page: number) {}

@Get(':uuid')
findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {} // 校验 UUID 格式

@Post()
create(@Body('name', ParseArrayPipe) names: string[]) {}
```

## 自定义管道

实现 `PipeTransform`：

```ts
@Injectable()
export class TrimPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    // metadata: { type: 'body' | 'query' | 'param'..., metatype, data }
    return typeof value === 'string' ? value.trim() : value;
  }
}

// 用法
@Post()
create(@Body(new TrimPipe()) dto: CreateUserDto) {}
```

## 重头戏：DTO + ValidationPipe（日常开发标配）

DTO（Data Transfer Object）是描述"这个接口接收什么数据"的类。

### 安装

```bash
npm i class-validator class-transformer
```

### 定义 DTO

```ts
// dto/create-user.dto.ts
import { IsString, IsEmail, IsInt, Min, Max, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  name: string;

  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @IsOptional()          // 可选字段
  @IsInt()
  @Min(0)
  @Max(150)
  age?: number;
}
```

### 启用全局校验（main.ts）

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,  // 删掉 DTO 未声明的多余字段（防恶意注入）
    transform: true,  // 按 DTO 类型自动转换（query 里的 '1' 变成 number）
    forbidNonWhitelisted: true, // 传了未声明字段直接报错，而不是静默删除
  }),
);
```

### 效果

```ts
@Post()
create(@Body() dto: CreateUserDto) {
  // dto 已经过校验：字段齐全、类型正确、多余字段被处理
  return this.usersService.create(dto);
}
```

客户端传了非法数据时，自动返回：

```json
{
  "statusCode": 400,
  "message": ["邮箱格式不正确"],
  "error": "Bad Request"
}
```

## 常用校验装饰器速查

| 装饰器 | 说明 |
| --- | --- |
| `@IsString()` `@IsInt()` `@IsBoolean()` | 类型 |
| `@IsEmail()` `@IsUrl()` `@IsUUID()` | 格式 |
| `@IsNotEmpty()` `@IsDefined()` | 非空 |
| `@IsOptional()` | 可选（允许 undefined） |
| `@Min()` `@Max()` `@Length()` `@IsIn(['a','b'])` | 范围/枚举 |
| `@ValidateNested()` | 嵌套对象校验（配合 `@Type(() => XxxDto)`） |

### 嵌套对象示例

```ts
import { Type } from 'class-transformer';

export class OrderDto {
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
```

## 更进阶的方案

- **zod**：前端同学的老朋友，NestJS 也有 `nestjs-zod` 集成，写法和 `z.object({...})` 一样。团队前端味浓可以选它。
- **NestJS 官方 Schema 校验**：基于 JSON Schema 的 `class-validator` 替代方案。

校验库不重要，"**在管道层统一校验，Controller 只接收干净数据**"这个原则才重要。

## 小结

- Pipe = 参数的"安检机"，内置的够用，校验业务靠 `class-validator` + `ValidationPipe`。
- DTO 必须是 class（不是 interface），因为校验装饰器要贴在类上、运行时还要做类型转换。
- 全局开启 `whitelist + transform` 是最佳实践，写一次全站受益。

下一篇解决"谁能访问这个接口"的问题：[守卫与 JWT 认证](./guards-auth)。
