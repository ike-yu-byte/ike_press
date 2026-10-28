# Redis 缓存

> "熟悉 Redis"是 Java 中高级岗 JD 的标配要求，也是面试必考 Top 3 之一。本章按"数据类型 → 应用场景 → 三大问题 → 持久化 → 高可用 → 生产踩坑"组织；分布式锁与缓存一致性的深入推导在 [分布式专题](./distributed)，本章不重复造轮子，重点补**数据结构、原理与工程用法**。

## 一、为什么快（60 秒答法）

1. **纯内存**操作，微秒级响应；
2. **单线程执行命令**——没有锁竞争和上下文切换（6.0 引入的多线程只用于**网络 IO**，命令执行仍是单线程，所以原子性天然保证）；
3. **I/O 多路复用**（epoll）一个线程扛上万连接；
4. 高效数据结构（SDS、跳表、压缩列表、哈希表）。

面试追问"单线程为什么还快"就答这四点；追问"那为什么 6.0 要多线程"——瓶颈在网络 IO 编解码而不是命令执行。

## 二、五大数据类型与真实用途

| 类型 | 典型结构 | 高频用途 |
| --- | --- | --- |
| String | SDS 动态字符串 | 缓存对象 JSON、计数器 INCR、分布式锁 SET NX、session |
| Hash | 字段-值映射（小数据 ziplist/listpack） | 对象属性局部更新（商品库存 hash，改一个字段不用整个反序列化） |
| List | quicklist（双向链表+listpack） | 简单消息队列、最新动态列表（LPUSH+LTRIM 定长） |
| Set | 整数集合/哈希表 | 共同好友（SINTER）、抽奖去重（SADD）、标签 |
| ZSet | listpack / **跳表+哈希表** | 排行榜、延迟队列（score=执行时间戳）、滑动窗口限流 |

三个扩展结构一句话各一个：

- **Bitmap**：签到/活跃标记（1 亿用户 1 天 = 12MB）；`SETBIT`/`BITCOUNT`。
- **HyperLogLog**：基数统计，误差 0.81%、固定 12KB——UV 统计标准答案。
- **GEO**：ZSet 包装，附近的人。

**ZSet 为什么用跳表不用红黑树**：范围查询（ZRANGEBYSCORE）沿链表走即可，实现简单、区间操作友好；且并发调整 score 更容易。能讲出"按 score 找起点 + 沿 next 指针扫"就够。

## 三、Spring Boot 整合：RedisTemplate 与 @Cacheable

```java
// RedisTemplate 的标准配置：key 用 String 序列化，value 用 JSON（带类型信息）
@Bean
public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
    RedisTemplate<String, Object> template = new RedisTemplate<>();
    template.setConnectionFactory(factory);
    template.setKeySerializer(new StringRedisSerializer());
    template.setValueSerializer(new GenericJackson2JsonRedisSerializer());   // 默认 JdkSerialization 存出乱码二进制——新手第一大坑
    template.setHashKeySerializer(new StringRedisSerializer());
    template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
    return template;
}
```

```java
@Service
public class ProductService {
    private final StringRedisTemplate redis;          // 只存字符串的场景直接用它
    private final ProductMapper mapper;

    public Product get(Long id) {
        String key = "product:" + id;
        String cached = redis.opsForValue().get(key);
        if (cached != null) return JsonUtils.parse(cached, Product.class);
        Product p = mapper.selectById(id);
        if (p != null) {
            redis.opsForValue().set(key, JsonUtils.toJson(p),        // 缓存 + TTL 一步写
                    Duration.ofMinutes(30));
        }
        return p;
    }
}
```

注解式缓存（Spring Cache 抽象，样板代码最少）：

```java
@Cacheable(cacheNames = "product", key = "#id", unless = "#result == null")
public Product getById(Long id) { return mapper.selectById(id); }

@CacheEvict(cacheNames = "product", key = "#p.id")
public void update(Product p) { mapper.updateById(p); }
```

- 默认缓存实现是 `ConcurrentMapCacheManager`（本地内存）——没配 Redis 时注解"看起来生效其实没进 Redis"，检查 `spring.cache.type=redis`。
- `@Cacheable` 同类内自调用不走代理失效——与 [Spring 核心](./spring-core) `@Transactional` 失效同一原理（AOP 代理）。
- TTL 三命令辨析：`EXPIRE` 设相对时间、`PEXPIRE` 毫秒、`SET key val EX 30` 写入+过期原子完成（**别 SET 完再 EXPIRE，中间断电就留了永不过期的 key**）。

## 四、缓存三大问题（面试必考，与[分布式专题](./distributed)互补）

| 问题 | 是什么 | 解法 |
| --- | --- | --- |
| **穿透** | 查**根本不存在**的数据（id=-1），缓存永远不命中，全打到 DB | ① 空值缓存（短 TTL）；② **布隆过滤器**前置拦截；③ 参数校验挡掉非法 id |
| **击穿** | **热点 key 过期瞬间**，并发请求同时打 DB | ① 互斥重建（拿到分布式锁的线程查库回填，其余等待）；② 逻辑过期（value 里存过期时间，过期后异步刷新）；③ 极热点永不过期+后台更新 |
| **雪崩** | **大量 key 同时过期**（或 Redis 整体宕机） | ① TTL 加随机抖动 `expire = base + rand(0, 5min)`；② 多级缓存（本地 Caffeine + Redis）；③ 限流降级兜底；④ 高可用架构（见下节） |

布隆过滤器原理一句话：k 个哈希函数把元素映射到位数组，**判"存在"可能误判、判"不存在"一定准确**——所以适合挡"不存在"。能说出误判率与位数组大小/元素数的权衡即加分。

## 五、持久化：RDB 与 AOF

| | RDB | AOF |
| --- | --- | --- |
| 是什么 | 某时刻全量内存快照（二进制） | 追加写命令日志 |
| 触发 | `SAVE`（阻塞，别用）/ `BGSAVE`（fork 子进程） | 每秒 `appendfsync everysec`（默认，性能与安全的折中） |
| 恢复速度 | 快 | 慢（重放命令） |
| 数据安全 | 可能丢最后一次快照后的数据 | everysec 最多丢 1 秒 |
| 关键机制 | **fork + 写时复制（COW）**：子进程共享内存页，父进程被修改的页才复制 | **AOF 重写**：压缩文件体积，由子进程按当前数据生成最小命令集 |

- 4.0+ 混合持久化（`aof-use-rdb-preamble yes`）：AOF 重写时前半段存 RDB 二进制、增量存 AOF 命令——恢复快 + 丢得少，生产默认姿势。
- 面试坑：`fork` 大内存实例会瞬间卡顿（页表复制）；写密集场景 everysec 比 always 快一个量级。

## 六、高可用三件套：主从 → 哨兵 → 集群

```
主从复制：数据冗余 + 读写分离。异步复制（主返回客户端后才传播）→ 主宕机可能丢最后几条写。
          全量同步（首次，RDB+复制缓冲区）/ 部分同步（断线重连，靠 repl_backlog）。
哨兵 Sentinel：监控主节点 + 自动故障转移 + 客户端发现。哨兵多数派投票选新主。
              解决了"谁来发现故障"，但每个实例仍是单线程内存上限。
Cluster 集群：16384 个哈希槽分片（CRC16(key) % 16384），每分片一主一从起步。
              解决容量与写扩展；客户端按MOVED/ASK重定向；跨槽多key操作不支持（用 {} hash tag 归槽）。
```

- 生产选型：数据量 < 单实例内存且要读写分离 → 主从+哨兵；更大 → Cluster。
- **主从下分布式锁不可靠**（异步复制丢锁）与 RedLock 的争议 → 详见[分布式专题](./distributed)锁一节，面试主动提这句是加分项。
- 缓存与 DB 一致性（Cache-Aside 先写库再删缓存、延迟双删、canal 订阅 binlog）同样在[分布式专题](./distributed)——本章只强调：**Redis 快 ≠ 可以当唯一可信存储，钱和库存永远以 DB 为准**。

## 七、生产高频踩坑清单

1. **大 key**：`redis-cli --bigkeys` 扫；单 value > 10KB、集合元素 > 5000 就该拆。大 key 删除用 `UNLINK`（异步）不用 `DEL`（阻塞单线程）。
2. **热 key**：单 key QPS 打满网卡——本地缓存（Caffeine）扛一层，或多副本打散。
3. **O(N) 命令**：`KEYS *` 生产禁用（用 SCAN 游标）、`HGETALL` 大 hash、`SMEMBERS` 大集合——单线程一条慢命令阻塞所有请求。
4. **maxmemory 与淘汰**：不设 maxmemory 可能 OOM；缓存场景 `allkeys-lru`，不能丢的数据 `noeviction`（写满直接报错，逼你监控）。Redis 的 LRU 是**近似 LRU**（随机采样 5 个挑最久未用），说出这点显读过源码。
5. **内存碎片**：`mem_fragmentation_ratio > 1.5` 时开 `activedefrag yes` 或重启迁移。
6. **pipeline 与批量**：循环 1000 次 `GET` 是 1000 个网络往返——`MGET`/pipeline 合并；但 pipeline 非原子，要原子性用 Lua 脚本（`EVAL` 在服务端单线程原子执行，限流器标准实现）。

```java
// Redisson：Redis 的"高级客户端"，分布式锁/限流器/布隆过滤器开箱即用（锁的推导见分布式专题）
RLock lock = redisson.getLock("order:" + orderId);
lock.lock(10, TimeUnit.SECONDS);          // 看门狗自动续期 vs 显式租期，二选一
try {
    // 扣库存、创建订单
} finally {
    lock.unlock();
}
```

## 八、版本与生态速览（2026）

- 生产主流 Redis 7.x：**7.4（2024）补上 hash 字段级过期 TTL**（老需求"整个 hash 过期但字段各过各的"终于原生支持）；Redis 8（2025）合并 Stack 模块（查询/向量/文档）并重回 AGPL 开源协议。
- **Valkey**：2024 年因 Redis 许可证变更（BSL）由 Linux 基金会发起的兼容分叉，AWS/GCP 主推——面试提一句"知道这次分叉"显示你在跟社区。
- Java 客户端口径：**Lettuce**（Spring Boot 默认，线程安全、支持异步/响应式）/ **Redisson**（分布式对象与锁的瑞士军刀）/ Jedis（老项目，连接池模型）。
- Spring Data Redis 3.x 随 Boot 3；Boot 4 对应版本见 [Spring Boot 3 vs 4](./spring-boot3-vs4)。

## 九、本章面试高频清单

1. Redis 为什么快？6.0 多线程改的是哪一段？
2. String / Hash 选型：什么时候对象不该整个序列化成 String？
3. ZSet 跳表结构讲一遍，为什么不用红黑树？
4. 穿透/击穿/雪崩各给两个方案，布隆过滤器的误判特性？
5. RDB 和 AOF 的区别、fork 为什么要小心、混合持久化是什么？
6. 主从全量同步和部分同步的触发条件？
7. 哨兵和 Cluster 各解决什么？Cluster 为什么是 16384 槽？
8. `KEYS` 为什么危险？DEL 大 key 会发生什么？
9. 近似 LRU 和真正 LRU 差别在哪？
10. Redisson 看门狗机制？（深入 → [分布式专题](./distributed)）
