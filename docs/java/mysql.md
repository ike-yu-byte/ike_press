# MySQL 数据库

> 面试必考 Top 3（HashMap、线程池之外就是它）。本章聚焦 InnoDB：索引、事务、锁、调优——这些同时也是"MySQL 熟练"在招聘里的真实含义。版本以 MySQL 8.0/8.4 为主。

## 一、整体架构与一条 SQL 的旅程

```
客户端 → 连接器(认证/权限) → 【8.0 移除查询缓存】→ 分析器(词法/语法) → 优化器(选索引/JOIN顺序)
      → 执行器(权限再校验/调存储引擎接口) → InnoDB(缓冲池 + 磁盘: 数据页/undo/redo)
```

- **Server 层**：连接器、分析器、优化器、执行器、binlog —— 所有引擎共享。
- **引擎层**：InnoDB（默认，支持事务/行锁/崩溃恢复）与 Memory 等。**MyISAM 已废弃**，面试只需说出区别：无事务、表锁、崩溃易坏、count(*) 有缓存。
- **缓冲池（Buffer Pool）**：默认 128M，生产常配物理内存 50-70%；读写先过页缓存，这是"热数据在内存所以快"的本质。

## 二、索引：B+ 树与它的规则

### 为什么是 B+ 树

| 结构 | 问题 |
| --- | --- |
| 哈希 | 等值 O(1) 但**不支持范围查询与排序**；冲突退化链表 |
| 二叉搜索树/红黑树 | 树太高，磁盘 IO 次数 = 树高，千万行数据 20+ 层不可接受 |
| 二叉 B 树 | 非叶子节点也存数据 → 单页能放的键少 → 树更高 |
| **B+ 树** | 非叶子只存键+指针（单页放更多键，3 层约 2000 万行）；叶子双向链表天然支持范围扫描 |

### 聚簇索引与二级索引（"回表"的由来）

- **聚簇索引**：叶子节点存**整行数据**；InnoDB 表就是一棵聚簇 B+ 树（主键 → 无主键选第一个唯一非空 → 都没有则隐藏 GTID）。数据按主键物理有序，所以**主键要短、要递增**（UUID 会造成页分裂碎片化，用雪花 ID）。
- **二级索引**：叶子存的是**索引列 + 主键值**。通过二级索引找整行 → 拿到主键再回聚簇索引查一次 = **回表**。

```sql
-- name 上有单列索引，title 没有
SELECT * FROM article WHERE name = 'java';        -- 走 idx_name → 回表
SELECT id, name FROM article WHERE name = 'java'; -- 覆盖索引：查询列都在索引里，不回表！
```

**索引失效八大场景**（面试标准套餐，每条都要能解释为什么）：

1. 对索引列使用函数/表达式/隐式类型转换（`WHERE DATE(t)=...`、varchar 列 = 数字）。
2. 模糊匹配 `LIKE '%xx'`（左模糊无法利用有序性；`'xx%'` 可以）。
3. 不满足**最左前缀**：联合索引 `(a,b,c)`，`WHERE b=2` 用不上；`WHERE a=1 AND c=3` 只用到 a（范围条件 `a>1 AND b=2` 中 b 也用不上——范围之后的列断链）。
4. `OR` 两侧存在非索引列。
5. 数据分布：优化器认为全表扫更快（如 `status` 只有 3 个值且要查最常见值）——**区分度（基数/总行数）太低的列不适合单列索引**。
6. 联合索引列间顺序写反（`WHERE c=? AND b=?` 对 `(a,b,c)` 无法利用 a 缺失）。
7. 负向查询 `NOT IN / <>` 优化器倾向放弃。
8. 索引列参与计算：`WHERE id + 1 = 10`。

### EXPLAIN 实战

```sql
EXPLAIN SELECT ...;            -- 日常调优第一步
```

| 字段 | 看点 |
| --- | --- |
| `type` | 从好到差：`system > const > eq_ref > ref > range > index > ALL`；出现 ALL 且数据量大就是事故 |
| `key` | 实际用到的索引；`possible_keys` vs `key` 不同说明优化器放弃了 |
| `rows` | 预估扫描行数 |
| `Extra` | `Using index`=覆盖索引✅；`Using where`=回表后过滤；`Using filesort`=内存/磁盘排序⚠️；`Using temporary`=临时表⚠️ |
| `filtered` | 结果占扫描行比例，太低说明索引选择不好 |

慢查询定位：`slow_query_log` 打开（`long_query_time=1`）→ `mysqldumpslow`/`pt-query-digest` 聚合 → 逐条 EXPLAIN。

## 三、事务与隔离级别

### ACID 靠什么实现（面试连环问主干）

| 特性 | 机制 |
| --- | --- |
| 原子性 | **undo log**（回滚日志，记录反向操作） |
| 持久性 | **redo log**（WAL：先写日志再写盘页；`innodb_flush_log_at_trx_commit=1` 每次提交刷盘，双 1 配置最安全） |
| 隔离性 | **锁 + MVCC** |
| 一致性 | 前三者共同保证 + 业务约束 |

**两阶段提交**：更新时 redo log prepare → 写 binlog → redo commit。崩溃时以 binlog 完整性为准恢复主从一致性。

### 并发问题与隔离级别

| 级别 | 脏读 | 不可重复读 | 幻读 | 说明 |
| --- | --- | --- | --- | --- |
| READ UNCOMMITTED | ✅ | ✅ | ✅ | 没人用 |
| READ COMMITTED (RC) | ❌ | ✅ | ✅ | Oracle/PG 默认；Oracle 系出身的人偏好它 |
| **REPEATABLE READ (RR)** | ❌ | ❌ | 基本解决 | **MySQL 默认** |
| SERIALIZABLE | ❌ |  | ❌ | 读也加锁，性能差 |

- 脏读=读到未提交；不可重复读=两次读同一行值不同（别人 UPDATE 提交了）；幻读=两次读**行数**不同（别人 INSERT 了）。
- **RR 如何解决幻读**：快照读靠 MVCC（版本链上找对自己可见的版本）；当前读靠 **Next-Key Lock（临键锁 = 行锁 + 间隙锁）**锁住范围，让别人的 INSERT 排队。极端场景（先快照读再当前读交错）仍可能"幻读"，但业务上无感知。

### MVCC 细节（高频追问）

- 每行隐藏列：`trx_id`（最后修改事务号）+ `roll_pointer`（指向 undo log 版本链）。
- 每个事务快照读时生成 **ReadView**：记录活跃事务 id 列表。可见性判断：trx_id < 最小活跃 → 可见；≥ 当前事务号 → 不可见；在列表中间 → 不可见；否则沿版本链往旧找第一个可见版本。
- **RC 每条 SELECT 生成新 ReadView；RR 只在事务第一条 SELECT 生成并复用**——一句话讲清两级别差异，面试杀招。

## 四、锁

- 粒度：全局锁（备份 `FTWRL`）、表锁、**行锁（InnoDB 特有）**。
- 行锁三种：`Record Lock` 单行；`Gap Lock` 间隙（防插入）；`Next-Key` 前两者组合。
- **加锁规则（RR）**：唯一索引等值命中 → 行锁；不命中 → 间隙锁；普通索引等值 → 锁满足条件的记录 + 相邻间隙；范围 → 扫到哪锁到哪。
- 死锁：事务 A 持 1 锁等 2，B 持 2 等 1。InnoDB 有死锁检测自动回滚代价小的事务（`innodb_deadlock_detect`）。**预防姿势：多行更新按同一顺序（如按主键升序）**。
- 乐观锁 vs 悲观锁：`SELECT ... FOR UPDATE`（悲观，当前读加锁）vs 版本号 CAS `UPDATE ... SET stock=stock-1, ver=ver+1 WHERE id=? AND ver=?`（乐观，高并发抢同一行时更优）。库存超卖题标准答案见下节。

## 五、高频实战专题

### 计数与分页

```sql
SELECT COUNT(*) FROM t;   -- InnoDB 没有总数字段，但优化器选最小二级索引扫；
                          -- COUNT(*) ≈ COUNT(主键) < COUNT(二级索引列) < COUNT(常量) 语义差异：
COUNT(列) 不统计该列为 NULL 的行。
-- 深分页：LIMIT 1000000, 10 要丢弃前一百万行 → 性能断崖
SELECT * FROM orders ORDER BY id LIMIT 10;                        -- 第一页
SELECT * FROM orders WHERE id < 上次最后id ORDER BY id DESC LIMIT 10;  -- 游标法（无限滚动）
SELECT o.* FROM orders o JOIN (SELECT id FROM orders ORDER BY create_time LIMIT 1000000,10) t
  ON o.id = t.id;                                                  -- 延迟关联：子查询走覆盖索引
```

### 库存扣减防超卖

```sql
-- 一条 UPDATE 搞定：行锁保证原子，条件保证不超卖
UPDATE sku SET stock = stock - #{qty} WHERE id = #{skuId} AND stock >= #{qty};
-- affectedRows = 0 → 库存不足，业务层回滚/提示
```

### 大表加字段 / 改索引（DDL 不锁表）

- 8.0 在线 DDL：`ALGORITHM=INPLACE, LOCK=NONE`；加列（末尾）秒级（INSTANT）。
- 生产规范：gh-ost / pt-online-schema-change，低峰执行，先测试库评估。

### 主从复制与读写分离

- 流程：binlog dump → IO 线程 relay log → SQL 线程重放。异步复制 → **主从延迟**导致"刚下单查不到"。
- 对策：强制走主（事务内/写后短时）、并行复制（8.0 组提交）、延迟监控。
- 分库分表：单表 > 2000 万行且增长快再考虑；中间件 ShardingSphere；**先做完索引优化/缓存/分区表再谈分表**（面试官想听的是克制）。

## 六、SQL 调优 checklist（把前几章串起来）

1. `SHOW PROCESSLIST` 找正在跑的慢 SQL / 锁等待。
2. 开慢查询日志，抓 Top 慢语句。
3. EXPLAIN 定问题：type、key、rows、Extra。
4. 对症下药：建/改联合索引（区分度高的列在前 + 尽量覆盖查询列）、改写语句（函数下推列→范围条件）、避免回表大结果集。
5. 结构性问题：计数表、缓存热点、读写分离、归档历史数据。
6. 验证：改完再 EXPLAIN + 压测对比，留下量化数据（简历素材）。

## 七、本章面试高频清单

1. 为什么 B+ 树？聚簇和二级索引区别？什么是回表、覆盖索引？
2. 最左前缀；索引失效场景（至少说 5 个）。
3. redo log / undo log / binlog 三套日志的作用与两阶段提交。
4. RR 如何实现？MVCC 的 ReadView 可见性判断。
5. 幻读怎么产生的、Next-Key Lock 锁哪些间隙。
6. count(*) 为什么慢、深分页怎么优化。
7. 主从延迟怎么处理；什么时候该分库分表（考"克制"）。
