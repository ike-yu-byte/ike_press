# MySQL Deep Dive

> A top-3 interview topic (alongside HashMap and thread pools). This chapter focuses on InnoDB: indexes, transactions, locks, tuning — which is also what "familiar with MySQL" actually means in a JD. Based on MySQL 8.0/8.4.

## 1. Architecture: the Journey of One SQL

```
client → connector(auth/acl) → [query cache removed in 8.0] → parser(lex/parse) → optimizer(index & join order)
       → executor(re-check acl / call engine API) → InnoDB(buffer pool + disk: pages/undo/redo)
```

- **Server layer**: connector, parser, optimizer, executor, binlog — shared by all engines.
- **Engine layer**: InnoDB (default: transactions, row locks, crash recovery) and a few others. **MyISAM is deprecated** — for interviews just know the differences: no transactions, table locks, crash-fragile, cached row count.
- **Buffer Pool**: default 128M; production typically 50-70% of RAM. Reads/writes go through cached pages first — that's why hot data is fast.

## 2. Indexes: the B+ Tree and Its Rules

### Why a B+ tree

| Structure | Problem |
| --- | --- |
| Hash | O(1) equality but **no range/order support**; degrades to lists on collisions |
| BST / red-black tree | Too tall: disk IOs = tree height; 20+ levels for tens of millions of rows is unacceptable |
| Binary B-tree | Non-leaf nodes store data → fewer keys per page → even taller |
| **B+ tree** | Non-leaves store keys+pointers only (a page holds ~1000s of keys; 3 levels ≈ 20M rows); leaf doubly-linked list makes range scans natural |

### Clustered vs secondary index (where "lookback" comes from)

- **Clustered index**: leaves hold the **whole row**; an InnoDB table *is* the clustered B+ tree (PK → first unique NOT NULL → hidden GTID). Physical order follows the PK, so **PKs should be short and increasing** (UUIDs cause page splits and fragmentation; use snowflake IDs).
- **Secondary index**: leaves hold **index columns + PK value**. Fetching full rows via a secondary index = take the PK and search the clustered tree again = a **table lookback**.

```sql
-- index on name only
SELECT * FROM article WHERE name = 'java';        -- idx_name → lookback
SELECT id, name FROM article WHERE name = 'java'; -- covering index: no lookback!
```

**Eight index-killing scenarios** (the standard interview set — explain the *why* for each):

1. Function/expression/implicit cast on the column (`WHERE DATE(t)=...`, numeric literal vs VARCHAR column).
2. `LIKE '%xx'` — leading wildcard can't exploit ordering (`'xx%'` is fine).
3. Violating the **leftmost prefix**: with `(a,b,c)`, `WHERE b=2` uses nothing; `WHERE a=1 AND c=3` uses only a; a range breaks the chain (`a>1 AND b=2` — b unused).
4. `OR` involving a non-indexed column.
5. Statistics: the optimizer prefers a full scan when the distribution says so (a 3-value `status` column queried for its most common value) — **low-cardinality columns make poor standalone indexes**.
6. Column order mismatch in composite conditions against the index definition.
7. Negative queries (`NOT IN`, `<>`) tend to be abandoned by the optimizer.
8. Computed predicates: `WHERE id + 1 = 10`.

### EXPLAIN in Practice

```sql
EXPLAIN SELECT ...;            -- step one of every tuning session
```

| Field | What to look for |
| --- | --- |
| `type` | best→worst: `system > const > eq_ref > ref > range > index > ALL`; ALL on a big table = incident |
| `key` | index actually used; differs from `possible_keys` → optimizer declined |
| `rows` | estimated scan rows |
| `Extra` | `Using index`=covering✅; `Using where`=filtered after lookback; `Using filesort`=extra sort⚠️; `Using temporary`=temp table⚠️ |
| `filtered` | result/scan ratio; low → bad index choice |

Slow-query triage: enable `slow_query_log` (`long_query_time=1`) → aggregate with `mysqldumpslow`/`pt-query-digest` → EXPLAIN one by one.

## 3. Transactions & Isolation

### What implements ACID (the backbone of the follow-up chain)

| Property | Mechanism |
| --- | --- |
| Atomicity | **undo log** (reverse operations for rollback) |
| Durability | **redo log** (WAL: log before page; `innodb_flush_log_at_trx_commit=1` fsyncs per commit — the "double-1" safest config) |
| Isolation | **locks + MVCC** |
| Consistency | the above three + business constraints |

**Two-phase commit**: on update — redo prepare → write binlog → redo commit. Crash recovery trusts binlog completeness to keep replicas consistent.

### Anomalies & isolation levels

| Level | Dirty read | Non-repeatable | Phantom | Notes |
| --- | --- | --- | --- | --- |
| READ UNCOMMITTED | ✅ | ✅ | ✅ | nobody uses it |
| READ COMMITTED (RC) | ❌ | ✅ | ✅ | Oracle/PG default |
| **REPEATABLE READ (RR)** | ❌ | ❌ | mostly solved | **MySQL default** |
| SERIALIZABLE | ❌ | ❌ | ❌ | reads lock too; slow |

- Dirty = reading uncommitted data; non-repeatable = same row read twice differs (committed UPDATE); phantom = **row count** differs (committed INSERT).
- **How RR handles phantoms**: snapshot reads via MVCC (pick the version visible to your ReadView); current reads via **Next-Key locks (record + gap)** that make concurrent INSERTs queue. Contrived interleavings (snapshot then current read) can still "phantom", but business code never notices.

### MVCC details (the follow-up)

- Hidden per-row columns: `trx_id` (last modifying transaction) + `roll_pointer` (undo-log version chain).
- Snapshot reads build a **ReadView** listing active transaction ids. Visibility: trx_id < min active → visible; ≥ your own id → invisible; in the active list → invisible; otherwise walk the version chain to the oldest visible version.
- **RC builds a fresh ReadView per SELECT; RR builds one at the transaction's first SELECT and reuses it** — one sentence that explains both levels. Interview killer line.

## 4. Locks

- Granularity: global (`FTWRL` for backups), table, **row (InnoDB only)**.
- Row flavors: `Record Lock` single row; `Gap Lock` the space between (blocks inserts); `Next-Key` = both.
- **RR locking rules**: unique index equality hit → record lock; miss → gap lock; non-unique equality → matching records + adjacent gaps; range → lock everything scanned.
- Deadlock: A holds 1 waits 2, B holds 2 waits 1. InnoDB detects and rolls back the cheaper victim (`innodb_deadlock_detect`). **Prevention: always update multiple rows in the same order (e.g. ascending PK)**.
- Optimistic vs pessimistic: `SELECT ... FOR UPDATE` (pessimistic, current-read lock) vs version CAS `UPDATE ... SET stock=stock-1, ver=ver+1 WHERE id=? AND ver=?` (optimistic, better when hot rows contend). Oversell-proof decrement in the next section.

## 5. Battle-Tested Topics

### Counting & pagination

```sql
SELECT COUNT(*) FROM t;   -- no stored total; optimizer scans the smallest secondary index
-- semantics: COUNT(col) skips NULL rows; COUNT(*) ≈ COUNT(pk) in practice
-- deep pagination: LIMIT 1000000, 10 still fetches-and-discards a million rows → cliff
SELECT * FROM orders ORDER BY id LIMIT 10;                          -- page 1
SELECT * FROM orders WHERE id < :lastSeenId ORDER BY id DESC LIMIT 10;  -- cursor/keyset (infinite scroll)
SELECT o.* FROM orders o JOIN (SELECT id FROM orders ORDER BY create_time LIMIT 1000000,10) t
  ON o.id = t.id;                                                   -- deferred join: subquery stays covering
```

### Race-proof stock decrement

```sql
-- one statement: row lock gives atomicity, the predicate prevents overselling
UPDATE sku SET stock = stock - #{qty} WHERE id = #{skuId} AND stock >= #{qty};
-- affectedRows = 0 → insufficient stock; roll back / prompt in the service layer
```

### Online DDL on big tables

- 8.0: `ALGORITHM=INPLACE, LOCK=NONE`; appending a column is INSTANT (seconds).
- Production practice: gh-ost / pt-online-schema-change, off-peak, rehearse on a staging copy.

### Replication & read/write splitting

- Flow: binlog dump → replica IO thread writes relay log → SQL thread replays. Async → **replica lag** → "order placed but not found".
- Mitigations: pin read-your-writes to primary (in-txn / short window after write), parallel replication (group commit in 8.0), lag monitoring.
- Sharding: consider only past ~20M rows per table with continued growth; middleware ShardingSphere; **finish index tuning / caching / archiving first** — interviewers reward restraint.

## 6. The SQL-Tuning Checklist (ties the chapters together)

1. `SHOW PROCESSLIST` for running slow SQL / lock waits.
2. Enable the slow log; collect the top offenders.
3. EXPLAIN: type, key, rows, Extra.
4. Prescribe: (re)build composite indexes (high-cardinality column first + cover the SELECT list), rewrite predicates (push functions off columns → ranges), avoid fat lookbacks.
5. Structural fixes: counter tables, cache hotspots, read replicas, archive history.
6. Verify: EXPLAIN again + load test, keep the before/after numbers (résumé gold).

## 7. Chapter interview checklist

1. Why B+ tree? Clustered vs secondary? Lookback and covering indexes?
2. Leftmost prefix; index-killers (name at least 5).
3. redo/undo/binlog roles; two-phase commit.
4. How RR works; MVCC ReadView visibility rules.
5. Phantom origins; which gaps Next-Key locks cover.
6. Why COUNT(*) is slow; deep-pagination fixes.
7. Handling replica lag; when sharding is actually justified (restraint test).
