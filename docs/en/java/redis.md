# Redis Cache

> "Familiar with Redis" is standard on every mid/senior Java JD and a top-3 interview topic. This chapter runs "data types → use cases → the three cache problems → persistence → high availability → production pitfalls"; the distributed-lock and cache-consistency derivations live in [Distributed Topics](./distributed) — no wheel reinvented here, the focus is **data structures, internals, and engineering usage**.

## 1. Why so fast (the 60-second answer)

1. **Pure in-memory** operations — microsecond latency;
2. **Single-threaded command execution** — no lock contention, no context switches (the multithreading added in 6.0 covers **network IO only**; commands still run on one thread, so atomicity comes free);
3. **I/O multiplexing** (epoll) — one thread serves tens of thousands of connections;
4. Efficient data structures (SDS, skip list, listpack, hash table).

Follow-up "then why multithread in 6.0?" — the bottleneck was network IO encoding, not command execution.

## 2. The five core types and what they're actually for

| Type | Typical encoding | High-frequency uses |
| --- | --- | --- |
| String | SDS dynamic string | JSON object cache, INCR counters, `SET NX` locks, sessions |
| Hash | field→value map (listpack while small) | partial updates (stock hash: change one field without re-serializing everything) |
| List | quicklist (linked list of listpacks) | simple queues, latest-N feeds (LPUSH + LTRIM bounded) |
| Set | intset / hash table | common friends (SINTER), dedupe in lotteries (SADD), tags |
| ZSet | listpack / **skip list + hash** | leaderboards, delayed queues (score = fire timestamp), sliding-window rate limits |

Three extended types, one line each:

- **Bitmap**: check-ins / activity flags (100M users × 1 day = 12MB); `SETBIT`/`BITCOUNT`.
- **HyperLogLog**: cardinality, 0.81% error, fixed 12KB — the standard UV answer.
- **GEO**: a ZSet wrapper — "people nearby".

**Why skip list, not red-black tree, for ZSet**: range queries (ZRANGEBYSCORE) just walk the linked level lists — simpler code, friendlier intervals, easier score updates. "Find the start by score, scan along next pointers" is enough for an interview.

## 3. Spring Boot integration: RedisTemplate and @Cacheable

```java
// The canonical RedisTemplate wiring: String keys, JSON values (with type info)
@Bean
public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
    RedisTemplate<String, Object> template = new RedisTemplate<>();
    template.setConnectionFactory(factory);
    template.setKeySerializer(new StringRedisSerializer());
    template.setValueSerializer(new GenericJackson2JsonRedisSerializer());   // the JDK default stores unreadable binary — newbie trap #1
    template.setHashKeySerializer(new StringRedisSerializer());
    template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
    return template;
}
```

```java
@Service
public class ProductService {
    private final StringRedisTemplate redis;          // use it directly when values are plain strings
    private final ProductMapper mapper;

    public Product get(Long id) {
        String key = "product:" + id;
        String cached = redis.opsForValue().get(key);
        if (cached != null) return JsonUtils.parse(cached, Product.class);
        Product p = mapper.selectById(id);
        if (p != null) {
            redis.opsForValue().set(key, JsonUtils.toJson(p),        // value + TTL in one call
                    Duration.ofMinutes(30));
        }
        return p;
    }
}
```

Annotation-driven caching (Spring Cache abstraction, least boilerplate):

```java
@Cacheable(cacheNames = "product", key = "#id", unless = "#result == null")
public Product getById(Long id) { return mapper.selectById(id); }

@CacheEvict(cacheNames = "product", key = "#p.id")
public void update(Product p) { mapper.updateById(p); }
```

- The default cache manager is `ConcurrentMapCacheManager` (local memory) — annotations "seem to work" without ever touching Redis; check `spring.cache.type=redis`.
- Self-invocation inside the same class bypasses the proxy and kills `@Cacheable` — same AOP-proxy mechanism as the `@Transactional` failure list in [Spring Core](./spring-core).
- TTL command triad: `EXPIRE` relative seconds, `PEXPIRE` milliseconds, `SET key val EX 30` write-and-expire atomically (**never SET then EXPIRE — a crash in between leaves a key that lives forever**).

## 4. The three cache problems (guaranteed exam; complements [Distributed Topics](./distributed))

| Problem | What it is | Fixes |
| --- | --- | --- |
| **Penetration** | queries for data that **doesn't exist at all** (id=-1) — cache never hits, DB takes everything | ① cache null results (short TTL); ② **bloom filter** in front; ③ parameter validation rejects bogus ids |
| **Breakdown** | a **hot key expires** and concurrent requests stampede the DB | ① mutex rebuild (lock holder queries and refills, others wait); ② logical expiry (expiry stored in the value, refresh asynchronously); ③ never-expire hot keys + background refresh |
| **Avalanche** | **mass keys expiring together** (or Redis itself goes down) | ① TTL jitter `expire = base + rand(0, 5min)`; ② multi-level cache (Caffeine + Redis); ③ rate-limit/degrade fallbacks; ④ HA architecture (next section) |

Bloom filter in one line: k hashes map elements into a bit array — **"exists" may be a false positive, "absent" is always exact**, which is exactly what blocks nonexistent-key penetration. Mentioning the fp-rate vs bits/elements trade-off earns points.

## 5. Persistence: RDB vs AOF

| | RDB | AOF |
| --- | --- | --- |
| What | point-in-time binary memory snapshot | appended write-command log |
| Trigger | `SAVE` (blocking — don't) / `BGSAVE` (fork a child) | `appendfsync everysec` (default; the speed/safety compromise) |
| Recovery | fast | slow (replays commands) |
| Data loss | everything after the last snapshot | ≤ 1 second with everysec |
| Key mechanism | **fork + copy-on-write**: child shares pages; parent's writes copy pages | **AOF rewrite**: child regenerates the minimal command set to shrink the file |

- Mixed persistence since 4.0 (`aof-use-rdb-preamble yes`): rewrite writes an RDB preamble plus incremental AOF — fast recovery, little loss; the production default stance.
- Interview traps: forking a huge instance stalls the parent briefly (page-table copy); everysec beats always by an order of magnitude under write load.

## 6. High availability: replication → Sentinel → Cluster

```
Replication: redundancy + read scaling. Asynchronous (propagates after replying to the client)
             → the last few writes can be lost on master failure.
             Full sync (first contact: RDB + replication buffer) / partial sync (reconnect via repl_backlog).
Sentinel:    monitors masters, performs failover, serves discovery. Quorum vote picks the new master.
             Answers "who detects failure" — but each instance still has one-thread/one-memory ceilings.
Cluster:     16384 hash slots sharded by CRC16(key) % 16384, one master + replicas per shard.
             Adds capacity and write scaling; clients follow MOVED/ASK; multi-key ops across slots are
             unsupported (use {hash tags} to co-locate keys).
```

- Selection: data fits one instance and you need read scaling → replication + Sentinel; beyond that → Cluster.
- **Distributed locks are unreliable over async replication** (the lock can vanish with the master) and the RedLock controversy → the [Distributed Topics](./distributed) lock section; volunteering this sentence scores.
- Cache–DB consistency (Cache-Aside delete-after-write, delayed double delete, canal on binlog) is also there — this chapter only underlines: **Redis being fast doesn't make it the system of record; money and stock live in the DB**.

## 7. Production pitfall checklist

1. **Big keys**: scan with `redis-cli --bigkeys`; split beyond ~10KB values / 5000 set members. Delete with `UNLINK` (async), never `DEL` (blocks the single thread).
2. **Hot keys**: one key saturating the NIC — front with a local Caffeine cache or replicate across shards.
3. **O(N) commands**: `KEYS *` banned in production (use SCAN cursors), `HGETALL` on big hashes, `SMEMBERS` on big sets — one slow command blocks every client.
4. **maxmemory & eviction**: unset maxmemory risks OS OOM; caches use `allkeys-lru`, must-not-lose data uses `noeviction` (writes error out — forcing you to monitor). Redis LRU is **approximate** (samples 5 keys, evicts the oldest) — saying so proves you've read the docs.
5. **Fragmentation**: `mem_fragmentation_ratio > 1.5` → enable `activedefrag yes` or restart-and-migrate.
6. **Pipelining**: 1000 looped `GET`s = 1000 round-trips — batch with `MGET`/pipeline; but pipelines aren't atomic — for atomicity use Lua (`EVAL` runs single-threaded and atomic server-side — the standard rate-limiter implementation).

```java
// Redisson: the "power client" — locks, rate limiters, bloom filters out of the box (derivation in Distributed Topics)
RLock lock = redisson.getLock("order:" + orderId);
lock.lock(10, TimeUnit.SECONDS);          // explicit lease vs watchdog auto-renewal — pick deliberately
try {
    // deduct stock, create order
} finally {
    lock.unlock();
}
```

## 8. Version & ecosystem snapshot (2026)

- Production mainstream: Redis 7.x — **7.4 (2024) added per-field TTL on hashes** (the age-old "expire fields independently" need, now native); Redis 8 (2025) merged the Stack modules (query/vector/document) and returned to AGPL.
- **Valkey**: the license-forced (BSL) community fork under the Linux Foundation in 2024, championed by AWS/GCP — mentioning it shows you follow the community.
- Java client stance: **Lettuce** (Spring Boot default; thread-safe, async/reactive) / **Redisson** (the Swiss army knife of distributed objects and locks) / Jedis (legacy pool-per-thread model).
- Spring Data Redis 3.x ships with Boot 3; Boot 4 pairings in [Spring Boot 3 vs 4](./spring-boot3-vs4).

## 9. Chapter interview checklist

1. Why is Redis fast? What exactly did 6.0's multithreading change?
2. String vs Hash: when should an object NOT be serialized whole into a String?
3. Draw the ZSet skip list; why not a red-black tree?
4. Two fixes each for penetration/breakdown/avalanche; bloom filter's asymmetry?
5. RDB vs AOF, why fork is dangerous, what is mixed persistence?
6. Full vs partial replication — what triggers each?
7. Sentinel vs Cluster — and why exactly 16384 slots?
8. Why is `KEYS` dangerous? What happens when you `DEL` a huge key?
9. Approximate vs true LRU?
10. How does the Redisson watchdog work? (deep dive → [Distributed Topics](./distributed))
