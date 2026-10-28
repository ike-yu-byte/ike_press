# 分布式核心专题

> 微服务把系统拆散之后，一致性问题全来了——本章就是招聘 JD 里"熟悉分布式锁、分布式事务、消息队列、缓存一致性"的展开。这些专题同时也是中高级面试的压轴题池。

## 一、CAP 与 BASE：一切讨论的地基

- **C**onsistency 一致性 / **A**vailability 可用性 / **P**artition tolerance 分区容错：网络分区必然存在，所以 P 必选，实际是在 **CP 与 AP 之间二选一**。
  - CP 派：Zookeeper、etcd、Nacos 持久实例——分区时宁可拒绝服务也不给旧数据。
  - AP 派：Eureka、Nacos 临时实例、Cassandra——先保可用，数据短暂不一致可接受。
- **BASE**：Basically Available（基本可用）+ Soft State（软状态）+ Eventually Consistent（最终一致）——对 ACID 强一致的让步：允许中间不一致，靠补偿/重试/对账收敛到一致。
- 面试金句："电商下单就是典型 BASE：库存扣减、积分、通知不可能一个事务搞定，用户能感知的是'订单提交成功，积分稍后到账'。"

## 二、分布式锁

### 演进式掌握（面试就按这个"为什么一步步改"讲）

```java
// v1: SETNX —— 有原子性，但没过期锁死了；加了过期又可能"业务没执行完锁先过期"
Boolean ok = redisTemplate.opsForValue()
        .setIfAbsent("lock:order:" + orderId, requestId, 30, TimeUnit.SECONDS);
if (Boolean.TRUE.equals(ok)) {
    try {
        doBusiness();                       // 风险1：锁 30s 到期但业务还在跑 → 并发进入
    } finally {
        redisTemplate.delete("lock:order:" + orderId);  // 风险2：删了别人的锁！
    }
}
// 修补：value 存唯一 requestId + Lua 脚本"比对再删"原子化 + 看门狗续期
```

```java
// v2: Redisson —— 以上三坑全部内置解决
RLock lock = redissonClient.getLock("lock:order:" + orderId);
if (lock.tryLock(500, -1, TimeUnit.MILLISECONDS)) {   // 等 500ms；leaseTime=-1 开启看门狗
    try {
        doBusiness();
    } finally {
        lock.unlock();                                 // 可重入：同线程计数
    }
} else {
    throw new BizException(40009, "操作处理中，请勿重复提交");
}
```

- **Redisson 关键点**：看门狗每 10s 给未指定 leaseTime 的锁续期（默认 30s 一档）；hash 结构记录重入次数；解锁 Lua 校验线程标识。
- **Redis 锁的理论缺陷**：主从异步复制下，master 加锁成功未同步就宕机，新 master 无锁 → 两个客户端同时持锁。**强一致场景用 Zookeeper/etcd**（临时顺序节点 + watch，CP）；或 RedLock（争议大，Martin Kleppmann 与 antirez 的论战值得读，面试说出"RedLock 在时钟漂移与 GC 暂停下仍不严谨"是顶级加分）。
- **兜底认知**：分布式锁只能"降低碰撞概率"，正确性最终靠**业务幂等 + 数据库约束**（如库存条件更新），别把锁当一切问题的答案。

## 三、接口幂等设计（支付/下单必考）

幂等 = 同一请求执行一次与执行 N 次结果相同。按场景选方案：

| 场景 | 方案 | 要点 |
| --- | --- | --- |
| 查询/删除 | 天然幂等 | — |
| 创建类（下单、支付） | **唯一业务号 + 数据库唯一索引** | 请求带幂等号（订单号/流水号），`INSERT` 撞唯一键即视为重复，返回首次结果 |
| 前端重复点击 | **Token 机制** | 进页面先领 token，提交携带并原子消费（Redis `DEL` 返回值判断），一次有效 |
| 状态驱动更新 | **状态机 + 乐观锁** | `UPDATE ... SET status=2 WHERE id=? AND status=1`，affectedRows=0 即重复/非法跃迁 |
| 消费端 | 消息去重表 | 消费前查 `msg_id` 是否处理过（本地事务内插入去重表） |

**万能组合拳（面试标准答案）**：网关/前置做 token 防重 → 服务层状态机校验 → 数据层唯一索引兜底。三层任一失守仍有下一层。

## 四、分布式事务

### 方案谱系（按一致性从强到弱）

| 方案 | 一致性 | 成本 | 适用 |
| --- | --- | --- | --- |
| 单机事务拆分避免 | 强 | 零 | **首选：能不分库就不分布式**（服务内多表一个 @Transactional） |
| Seata AT | 最终（对业务近乎透明） | 中：部署 TC + undo_log 表 | 中小团队多库 CRUD，国内主流 |
| TCC | 最终（业务侵入） | 高：Try/Confirm/Cancel 三接口 | 资金等强一致要求场景 |
| 可靠消息最终一致 | 最终 | 中 | 异步链路（下单→积分/通知），**最常用** |
| 最大努力通知 | 弱 | 低 | 对账类（支付回调、开放平台） |

### Seata AT 模式原理（一句话+一条链）

TM 发起全局事务 → RM 执行本地 SQL 前后各拍一次快照（before/after image 写 `undo_log`）→ 提交时上报 TC 并**持有全局锁** → 任一分支失败则 TC 指挥反向 `undo_log` 补偿回滚。代价：全局锁拖 TPS、隔离性默认读未提交语义（需 `@GlobalLock` + 强制刷新解决脏读）。

### 可靠消息最终一致（RocketMQ 事务消息）

```
Half 消息（对消费者不可见）→ 执行本地事务 → Commit/Rollback
└─ 超时未确认：MQ 回查本地事务状态（查订单表是否存在）→ 补提交
消费端：幂等消费 + 失败重试 16 次 → 仍失败进死信队列 → 人工/对账兜底
```

## 五、消息队列（RocketMQ / Kafka）

### 三大用途与选型

- **异步**（发积分短信不拖慢下单）、**解耦**（上游只管发事件，订阅方自由增减）、**削峰**（秒杀流量先进队列，消费端按能力拉取）。
- 选型口径：**RocketMQ**：业务消息首选——事务消息、延迟级别、消息轨迹、顺序队列，国内生态成熟；**Kafka**：吞吐之王，日志/大数据管道，事务与延迟消息弱；RabbitMQ：路由灵活但吞吐与云原生生态逊一筹；Redis Stream：轻量场景凑合用。

### 必考四问

1. **如何不丢消息**（全链路三段防守）：生产端 confirm/事务消息 + 失败重试；Broker 端持久化 + 主从同步/多副本；消费端**手动 ACK**（处理成功再确认）。
2. **如何不重复**：MQ 只保证 at-least-once，**幂等消费是消费端的责任**（见第三节去重表/唯一索引）。
3. **顺序消息**：生产端按业务键（订单号）hash 选队列 + 队列内单线程发；消费端同一队列单线程 + 本地再按 key 分桶。**全局顺序没有意义，只有业务键局部有序**。
4. **消息积压**：先扩消费者实例 ≤ 队列数 → 不够则临时"搬运工"把消息转发到更多队列扩容消费 → 排查慢消费根因（通常是下游 DB/第三方接口）。

### Spring Boot 集成（RocketMQ 示例）

```java
// 生产者：下单成功后发事件
rocketMQTemplate.asyncSend("order-topic:CREATE",
        new OrderCreatedEvent(orderId, uid, amount), new SendCallback() {
    @Override public void onSuccess(SendResult r) { log.info("事件发送成功 {}", r.getMsgId()); }
    @Override public void onException(Throwable e) {
        localFailRecorder.save(event);          // 发送失败落本地表，定时任务补偿重发
    }
});

// 消费者：幂等 + 手动重试语义
@RocketMQMessageListener(topic = "order-topic", selectorExpression = "CREATE",
        consumerGroup = "point-service", consumeMode = ConsumeMode.ORDERLY)
public class PointListener implements RocketMQListener<OrderCreatedEvent> {
    @Override
    public void onMessage(OrderCreatedEvent e) {
        pointService.addWithDedup(e);           // 去重表本地事务，重复消息直接跳过
    }
}
```

## 六、缓存与数据库一致性（Redis 高频压轴）

```
读：先查 Redis → miss 查 DB → 回填缓存（Cache-Aside，默认用这个）
写：更新 DB → 删除缓存（而不是更新缓存）
```

- **为什么删不改**：并发写时"更新缓存"会旧值覆盖新值；删除让下次读自然回源。
- **先删缓存再更新 DB 的问题**：删完瞬间有并发读把旧值回填 → 脏数据。所以**先更新 DB 再删缓存**（延迟双删可补刀：删→更新→sleep(数百 ms)→再删）。
- **删除失败怎么办**：本地失败重试表 + 定时补偿；要求更严用 **canal 订阅 binlog** 异步失效缓存（把一致性从业务代码里剥离）。
- 极端一致要求：给缓存 key 加版本号/直接放弃一致性（库存扣减走 DB 原子 UPDATE，缓存只做展示）。
- 配套三件套仍要背：**穿透**（空值缓存/布隆过滤器）、**击穿**（热点 key 互斥重建/逻辑过期）、**雪崩**（过期时间加随机抖动/多级缓存）。

## 七、分库分表与全局 ID

- **垂直**拆业务（每个微服务自己的库，见微服务章）；**水平**拆数据：单表行数（经验值 2000 万/字符多则 500 万）与 QPS 双维度评估，先分区表/读写分离，再谈分表（考克制）。
- 中间件 **ShardingSphere-JDBC**（客户端模式，国内主流）：分片键选择是命门——**90% 查询必须带分片键**（订单按 user_id 分，"按商户查订单"就得异构一份商户维度表/走 ES）。
- 跨分片难题：join 退化（内存归并）、分布式事务（各分片本地事务+补偿）、分页深翻、聚合函数——**能路由则路由，不能则异构到 ES/ClickHouse**。
- **全局 ID 方案对比**：UUID（无序，InnoDB 页分裂❌）/ Redis incr（依赖可用性）/ 号段模式（美团 Leaf：批量取段+双 buffer）/ **雪花算法**（64 位：时间戳 41 + 机器 10 + 序列 12；坑在时钟回拨——等待或借位，WorkerId 由注册中心分配）。

## 八、分布式会话与认证

- 会话复制 ❌（内存翻倍且扩容不均）；IP Hash 粘性会话 ❌（扩缩容即失效）。
- **JWT 无状态**：登录签发 `header.payload.signature`，网关统一验签，服务从 `X-User-Id` 头取身份（微服务章已见）。缺点：无法主动吊销 → 短有效期 access token + Redis 管理 refresh token/黑名单。
- **Redis 集中式 Session**（Spring Session）：传统单体迁移期用；与 JWT 组合常见：JWT 过网关、Redis 存会话态支持踢人。
- 完整方案是 **OAuth2.1 / OIDC + Spring Authorization Server**：四种授权里生产主推**授权码模式（+PKCE）**，面试说出"密码模式已被 OAuth 2.1 废弃"就是信息新鲜度信号。

## 九、本章面试高频清单

1. CAP 里为什么 P 必选？注册中心选 AP 还是 CP？
2. 分布式锁演进：SETNX 有哪些坑，Redisson 各怎么解？Redis 锁什么时候不够用？
3. 幂等方案按场景选择；三层防重组合拳。
4. 分布式事务方案谱系与选型；Seata AT 的 undo_log 与全局锁。
5. RocketMQ 如何保证不丢/不重/有序/积压处理四连问。
6. Cache-Aside 为什么"更新 DB 后删缓存"；延迟双删删不干净怎么办（binlog 订阅）。
7. 分片键怎么选；跨分片查询与分页怎么办。
8. 雪花算法结构与时钟回拨处理。
9. JWT 怎么做登出/吊销？
10. 秒杀系统怎么设计（本章全考点的综合应用卷：限流→削峰→预扣库存→幂等→最终一致）。
