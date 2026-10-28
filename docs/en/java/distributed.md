# Distributed Systems Core Topics

> Once microservices scatter the system, every consistency problem shows up at once. This chapter unpacks the JD line "familiar with distributed locks, distributed transactions, message queues, cache consistency" — and it doubles as the senior-interview question pool.

## 1. CAP & BASE: the Ground Under Everything

- **C**onsistency / **A**vailability / **P**artition tolerance: network partitions are inevitable, so P is forced — the real choice is **CP vs AP**.
  - CP camp: ZooKeeper, etcd, Nacos persistent instances — refuse service rather than serve stale data during a partition.
  - AP camp: Eureka, Nacos ephemeral instances, Cassandra — stay available, tolerate brief inconsistency.
- **BASE**: Basically Available + Soft State + Eventually Consistent — the concession from ACID: allow inconsistent intermediates, converge via compensation/retry/reconciliation.
- Interview money line: "An e-commerce order *is* BASE — stock, points and notification can't share one transaction; what the user sees is 'order submitted, points arriving shortly'."

## 2. Distributed Locks

### Learn it as an evolution (tell it exactly this way)

```java
// v1: SETNX — atomic, but no expiry = deadlock; add expiry and you get "lock dies mid-business"
Boolean ok = redisTemplate.opsForValue()
        .setIfAbsent("lock:order:" + orderId, requestId, 30, TimeUnit.SECONDS);
if (Boolean.TRUE.equals(ok)) {
    try {
        doBusiness();                       // risk 1: 30s elapses, business still running → overlap
    } finally {
        redisTemplate.delete("lock:order:" + orderId);  // risk 2: deletes someone ELSE's lock!
    }
}
// patches: store a unique requestId as value + compare-and-delete via Lua + watchdog renewal
```

```java
// v2: Redisson — all three holes plugged out of the box
RLock lock = redissonClient.getLock("lock:order:" + orderId);
if (lock.tryLock(500, -1, TimeUnit.MILLISECONDS)) {   // wait 500ms; leaseTime=-1 enables the watchdog
    try {
        doBusiness();
    } finally {
        lock.unlock();                                 // reentrant: per-thread counter
    }
} else {
    throw new BizException(40009, "Operation in progress, do not resubmit");
}
```

- **Redisson essentials**: watchdog renews (default 30s lease, checked every 10s) when no leaseTime was given; a hash structure counts reentrant holds; unlock validates thread identity via Lua.
- **Redis's theoretical hole**: async master-replica — master grants the lock then dies before replication, new master has no lock → two holders. **Strong-consistency cases use ZooKeeper/etcd** (ephemeral sequential nodes + watch, CP); RedLock exists but is contested (read the Kleppmann–antirez debate; noting "RedLock still isn't airtight under clock drift and GC pauses" is a top-tier signal).
- **The grounding truth**: a distributed lock only lowers collision probability; correctness ultimately rests on **idempotent business logic + database constraints** (e.g. conditional stock UPDATE). Don't reach for it as the answer to everything.

## 3. Idempotent API Design (payments and orders, guaranteed)

Idempotent = one execution equals N executions for the same request. Pick by scenario:

| Scenario | Scheme | Key point |
| --- | --- | --- |
| Read / delete | naturally idempotent | — |
| Creates (order, payment) | **unique business id + DB unique index** | request carries an idempotency key; `INSERT` colliding the index = duplicate, return first result |
| Double-clicked buttons | **token scheme** | page load issues a token; submit consumes it atomically (Redis `DEL` return value), one-shot |
| Status-driven updates | **state machine + optimistic lock** | `UPDATE ... SET status=2 WHERE id=? AND status=1`; affectedRows=0 means duplicate/illegal transition |
| MQ consumers | dedup table | check `msg_id` before handling (insert into dedup table within the same local transaction) |

**The standard combo answer**: front-layer token dedup → service-layer state-machine check → data-layer unique index as backstop. Any layer failing, the next still holds.

## 4. Distributed Transactions

### The option spectrum (strongest → weakest consistency)

| Option | Consistency | Cost | Where it fits |
| --- | --- | --- | --- |
| Avoid it — redesign to single-DB | strong | zero | **First choice: don't distribute what you can keep local** |
| Seata AT | eventual (near-transparent) | medium: TC server + undo_log tables | multi-DB CRUD for small/mid teams; mainstream in China |
| TCC | eventual (invasive) | high: Try/Confirm/Cancel per operation | money-grade requirements |
| Reliable-message eventual consistency | eventual | medium | async chains (order → points/notify); **most used** |
| Best-effort notification | weak | low | reconciliation-flavored (payment callbacks, open platforms) |

### Seata AT in a sentence

TM starts a global transaction → each RM snapshots rows before/after its SQL (images into `undo_log`) → branch commit reports to TC while holding a **global lock** → on any failure TC drives reverse `undo_log` compensation. Costs: the global lock taxes TPS, and default isolation is read-uncommitted-ish (fix dirty reads with `@GlobalLock` + force update).

### Reliable messages (RocketMQ transactional messages)

```
half message (invisible to consumers) → run local transaction → Commit/Rollback
└─ on timeout: MQ checks back (query the order table) → completes or rolls back
consumer side: idempotent handling + up to 16 retries → dead-letter queue → manual/reconciliation backstop
```

## 5. Message Queues (RocketMQ / Kafka)

### Three uses and the selection call

- **Async** (points/SMS off the order hot path), **decoupling** (publish events; subscribers come and go), **peak shaving** (seckill traffic queues up; consumers pull at capacity).
- Selection phrasing: **RocketMQ** — the business-message default: transactional messages, delay levels, trace, ordered queues, mature domestic ecosystem; **Kafka** — throughput king for logs/data pipelines, weaker transaction/delay story; RabbitMQ — flexible routing, lower throughput and cloud-native momentum; Redis Stream — fine for toy scales.

### The four guaranteed questions

1. **Never lose a message** (defend all three segments): producer confirms/transactional messages + retries; broker persistence + synced replicas; consumer **manual ACK after success**.
2. **Never duplicate**: brokers only promise at-least-once — **dedup is the consumer's job** (section 3's dedup table / unique index).
3. **Ordering**: producer hashes business key → one queue, single-threaded send; consumer single-thread per queue + local per-key buckets. **Global order is meaningless; only per-key order exists.**
4. **Backlog**: scale consumers up to queue count → if still behind, a temporary "shuttle" republishes onto more queues → fix the slow consumer (usually a downstream DB/third-party call).

### Spring Boot integration (RocketMQ)

```java
// producer: publish after the order commits
rocketMQTemplate.asyncSend("order-topic:CREATE",
        new OrderCreatedEvent(orderId, uid, amount), new SendCallback() {
    @Override public void onSuccess(SendResult r) { log.info("event sent {}", r.getMsgId()); }
    @Override public void onException(Throwable e) {
        localFailRecorder.save(event);          // persist locally; a sweeper job resends
    }
});

// consumer: idempotent + ordered semantics
@RocketMQMessageListener(topic = "order-topic", selectorExpression = "CREATE",
        consumerGroup = "point-service", consumeMode = ConsumeMode.ORDERLY)
public class PointListener implements RocketMQListener<OrderCreatedEvent> {
    @Override
    public void onMessage(OrderCreatedEvent e) {
        pointService.addWithDedup(e);           // dedup table in one local transaction
    }
}
```

## 6. Cache–Database Consistency (Redis's capstone question)

```
read: check Redis → miss → read DB → backfill (Cache-Aside; the default)
write: update DB → DELETE the cache (not update it)
```

- **Delete, don't update**: concurrent writers "updating" the cache can interleave old-over-new; deleting lets the next read repopulate naturally.
- **Why not delete-then-write**: a concurrent read between the delete and the DB write refills stale data. Hence **write DB first, then delete**; delayed double-delete (delete → write → sleep(hundreds of ms) → delete again) patches the race.
- **When the delete fails**: local retry table + scheduled compensation; stricter cases subscribe **binlog via canal** and invalidate asynchronously (consistency out of business code).
- Extreme consistency: version-stamp keys or give up on caching the value (stock decrements run as atomic DB UPDATEs; cache only display data).
- The companion trio still gets asked: **penetration** (null caching / bloom filter), **breakdown** (hot-key mutex rebuild / logical expiry), **avalanche** (jittered TTLs / multi-level cache).

## 7. Sharding & Global IDs

- **Vertical** split by business (each microservice owns its schema — see the microservices chapter); **horizontal** split by rows: weigh row counts (rule of thumb 20M; ~5M for wide rows) *and* QPS; exhaust partitioning/read-replicas before sharding (restraint is graded).
- **ShardingSphere-JDBC** (client-side, mainstream domestically): the shard key is destiny — **~90% of queries must carry it** (orders sharded by user_id means "query by merchant" needs a materialized merchant-dimension table or ES).
- Cross-shard pain: joins degrade (in-memory merge), transactions fragment (per-shard local + compensation), deep pagination, aggregates — **route when possible, materialize into ES/ClickHouse when not**.
- **Global ID options**: UUID (unordered → InnoDB page splits ❌) / Redis INCR (availability dependency) / segment mode (Meituan Leaf: batch leases + double buffer) / **snowflake** (64-bit: 41 timestamp + 10 worker + 12 sequence; the trap is clock rollback — wait or borrow bits; WorkerId assigned by the registry).

## 8. Distributed Sessions & Authentication

- Session replication ❌ (doubles memory, skews on scale-out); IP-hash stickiness ❌ (breaks on every rescale).
- **Stateless JWT**: login issues `header.payload.signature`, the gateway verifies, services read `X-User-Id` (seen in the microservices chapter). Weakness: no revocation → short-lived access tokens + Redis-managed refresh tokens/deny lists.
- **Centralized sessions in Redis** (Spring Session): the pragmatic path for migrating monoliths; a common blend: JWT at the edge, Redis session state for kick-out support.
- The full story is **OAuth 2.1 / OIDC with Spring Authorization Server**: of the grants, production favors **authorization code (+PKCE)** — noting "the password grant is removed in OAuth 2.1" is a freshness signal.

## 9. Chapter interview checklist

1. Why is P forced in CAP? AP or CP for a registry?
2. The lock evolution story: SETNX's holes, how Redisson plugs each; when Redis locks aren't enough.
3. Idempotency by scenario; the three-layer dedup combo.
4. The transaction option spectrum and selection; Seata AT's undo_log and global lock.
5. RocketMQ's four-part drill: loss / duplicates / ordering / backlog.
6. Why Cache-Aside deletes after writing; what delayed double-delete can't fix (→ binlog subscription).
7. Choosing a shard key; cross-shard queries and pagination.
8. Snowflake layout and clock-rollback handling.
9. JWT logout/revocation strategy?
10. Design a seckill system (the chapter's final boss: rate limit → peak shave → pre-deduct stock → idempotency → eventual consistency).
