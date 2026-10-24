# 数据库：TypeORM 与 Prisma

Service 不能只操作内存数组，真实项目要接数据库。NestJS 生态两大主流方案：

| | TypeORM | Prisma |
| --- | --- | --- |
| 风格 | 传统 ORM：装饰器 + 实体类 | 新一代：schema 文件 + 生成的类型安全客户端 |
| 心智 | Active Record / Data Mapper | 像"类型完美的查询构建器" |
| 适合 | 老项目、复杂关系映射、国产教程多 | 新项目、追求 TS 体验 |

> 前端同学个人觉得：**Prisma 的开发体验更像写前端**——`prisma schema` 改一下，类型自动生成，IDE 提示一步到位。两者都介绍，选一个上手即可。

## 方案一：Prisma

### 1. 安装与初始化

```bash
npm i prisma --save-dev
npx prisma init   # 生成 prisma/schema.prisma 和 .env
```

### 2. 定义模型（prisma/schema.prisma）

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"  // 或 postgresql / sqlite
  url      = env("DATABASE_URL")
}

model User {
  id       Int     @id @default(autoincrement())
  email    String  @unique
  name     String
  posts    Post[]  // 一对多
  createdAt DateTime @default(now()) @map("created_at")

  @@map("users") // 表名
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  author   User   @relation(fields: [authorId], references: [id])
  authorId Int
}
```

### 3. 同步数据库 + 生成客户端

```bash
npx prisma migrate dev --name init  # 建表（开发）
npx prisma generate                 # 生成带类型的客户端代码
```

### 4. 集成进 NestJS

```bash
npm i @nestjs/prisma
```

```ts
// prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect(); // 应用启动时连上数据库
  }
}

// users.module.ts
@Module({ providers: [PrismaService, UsersService] })
export class UsersModule {}
```

### 5. 在 Service 里用（类型全程在线）

```ts
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      include: { posts: true },        // 关联查询
      where: { name: { contains: 'yu' } },
      skip: 0, take: 20,               // 分页
    });
  }

  create(dto: CreateUserDto) {
    return this.prisma.user.create({ data: dto }); // 返回值类型自动推导
  }
}
```

## 方案二：TypeORM

### 1. 安装

```bash
npm i @nestjs/typeorm typeorm mysql2
```

### 2. 连接配置（AppModule）

```ts
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: 3306,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: true, // ⚠️ 开发用，自动同步表结构；生产必须关
    }),
    UsersModule,
  ],
})
export class AppModule {}
```

### 3. 定义实体

```ts
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

### 4. 注册 + 注入 Repository

```ts
// users.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
})
export class UsersModule {}

// users.service.ts
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.usersRepository.find({ relations: ['posts'] });
  }

  findOne(id: number): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(dto);
    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    await this.usersRepository.delete(id);
  }
}
```

## 事务（两条都一样重要）

涉及多表写入时必须用事务保证一致性：

```ts
// Prisma
await this.prisma.$transaction([
  this.prisma.account.update({ where: { id: fromId }, data: { balance: { decrement: 100 } } }),
  this.prisma.account.update({ where: { id: toId }, data: { balance: { increment: 100 } } }),
]);
```

## 实用建议

- **迁移永远别靠 `synchronize: true` 上生产**，用 `prisma migrate` / TypeORM migration 管理表结构变更。
- 敏感字段（密码）查询后手动剔除，或用 Prisma 的 `select` / 序列化拦截器过滤。
- 分页统一封装：`{ page, pageSize }` 进，`{ list, total }` 出，写一个分页管道或拦截器全站复用。
- 数据库连接信息全部走环境变量（见[配置篇](./config-deploy)）。

下一篇：[配置、环境变量与 CORS](./config-deploy)。
