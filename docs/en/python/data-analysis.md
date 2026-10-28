# Data Processing Trio: NumPy / Pandas / Databases in Python

> Stop 4: Python's home turf. Roughly 70% of an AI practitioner's daily work is data — cleaning, transforming, aggregating, feeding models. This chapter also covers the Python side of MySQL/Redis (the SQL itself lives in the [Java section's SQL/MySQL chapters](../java/sql); here it's drivers and engineering usage).

## 1. NumPy: vectorized thinking

```python
import numpy as np

a = np.array([[1, 2, 3], [4, 5, 6]])       # homogeneous n-d array: contiguous memory, one dtype
a.shape, a.dtype                            # (2, 3) int64 — dimension thinking underlies everything
a[:, 1]                                     # slice: column 1 of every row → array([2, 5])

# broadcasting: mismatched shapes align automatically, loops die
a * 2                                        # scalar broadcast
a + np.array([10, 20, 30])                   # row vector broadcast across rows
col_sums = a.sum(axis=0)                     # axis=0 collapses rows (per-column); axis=1 per-row

# boolean indexing: vectorized filtering
a[a > 3] = 0                                 # zero every element > 3 — no if-loop
mask = (a > 1) & (a < 6)                     # elementwise ops need & | ~, never and/or

# why it's fast: C-contiguous memory + SIMD + no per-element interpreter dispatch.
# rule of thumb: np.sum(v) beats sum(v) 30-100× on big arrays; a for-loop over arrays is a smell
```

## 2. Pandas: the tabular operating system

```python
import pandas as pd

df = pd.read_csv("orders.csv", parse_dates=["created_at"], dtype={"user_id": "int64"})
df.head(); df.info()                 # info shows dtypes + missing — health-check first
df.describe()                        # numeric summary
df.shape                             # (rows, cols)

# selection: loc by label / iloc by position
df.loc[df["amount"] > 100, ["user_id", "amount"]]     # condition + column pick in one move
df.iloc[0, 0]

# the cleaning trio
df = df.dropna(subset=["amount"])                     # drop
df["channel"] = df["channel"].fillna("unknown")       # fill
df["amount"] = df["amount"].astype(float).clip(lower=0)   # cast + clamp outliers
df = df.drop_duplicates(subset=["order_id"])          # dedupe

# derived columns: vectorize; iterrows marks the newbie
df["month"] = df["created_at"].dt.to_period("M")      # .dt time accessors / .str string methods
df["is_big"] = df["amount"] >= 1000
df["category"] = df["category"].astype("category")    # low-cardinality → category saves RAM, speeds up

# groupby-split-apply: GROUP BY in table form
top = (df.groupby(["month", "channel"])["amount"]
         .agg(["sum", "mean", "count"])
         .rename(columns={"sum": "gmv"})
         .sort_values(("gmv",), ascending=False)
         .head(10))
pivot = df.pivot_table(index="month", columns="channel", values="amount",
                       aggfunc="sum", fill_value=0)   # pivot == Excel's pivot table

# joining: SQL JOINs in table form
users = pd.read_parquet("users.parquet")              # parquet over csv for big tables (columnar, typed, faster)
merged = df.merge(users, on="user_id", how="left")    # how: left/inner/outer; indicator=True audits match rate
```

**Performance mantra**: vectorize before loop → category before object → chunksize before full read → at tens of millions of rows switch to **polars** (multithreaded Pandas-alike) or DuckDB (local SQL).

## 3. The minimal visualization kit

```python
import matplotlib
matplotlib.use("Agg")                 # mandatory on headless servers/containers — import otherwise explodes
import matplotlib.pyplot as plt

ax = df.groupby("month")["amount"].sum().plot(kind="bar", figsize=(10, 4), title="Monthly GMV")
fig, axes = plt.subplots(1, 2, figsize=(12, 4))       # subplots
df.boxplot(column="amount", by="channel", ax=axes[0]) # boxplots expose outliers
fig.savefig("report.png", dpi=150, bbox_inches="tight")
plt.close(fig)                        # inside batch loops: close or leak memory
```

Exploration: seaborn (statistical shortcuts) or plotly (interactive HTML); matplotlib suffices for report output.

## 4. MySQL / Redis / MongoDB the Python way

```python
# MySQL: SQLAlchemy for apps, PyMySQL for light scripts; the SQL itself is chapter-shared with Java
from sqlalchemy import create_engine, text

engine = create_engine(
    "mysql+pymysql://user:pwd@localhost:3306/shop?charset=utf8mb4",
    pool_size=10, max_overflow=20, pool_pre_ping=True,   # pooling trio: cap + revive dead connections
)
with engine.connect() as conn:
    rows = conn.execute(
        text("SELECT id, name FROM users WHERE created_at > :since"),   # parameterized — injection law #1
        {"since": "2026-01-01"},
    ).mappings().all()                                     # rows as dicts

# big results stream: default fetchall drags 10M rows into RAM
with engine.connect().execution_options(stream_results=True) as conn: ...
# analyst shortcut: pd.read_sql(query, engine, chunksize=100_000) → process block by block

# Redis
import redis
pool = redis.ConnectionPool.from_url("redis://:pwd@localhost:6379/0", max_connections=20)
client = redis.Redis(connection_pool=pool)
client.set("hot:rank", json.dumps(data), ex=300)          # cached with TTL
client.hgetall("user:1001"); client.incr("api:quota")     # same structures as the Java chapter
```

- Driver choice: web services → SQLAlchemy 2.0 (async flavor with FastAPI); analytics pulls → `pd.read_sql` + a read-only account; high-frequency counters/cache → redis-py.
- Batch writes via `executemany` / `to_sql(method="multi")` — row-by-row INSERT pays N network round-trips.

## 5. Excel/CSV fieldcraft and habits

```python
# Excel report automation (a business-side favorite)
with pd.ExcelWriter("out.xlsx", engine="openpyxl") as xw:
    summary.to_excel(xw, sheet_name="Summary")
    detail.to_excel(xw, sheet_name="Detail", index=False)

df.to_csv("out.csv", index=False, encoding="utf-8-sig")   # utf-8-sig: the classic Excel-no-garble fix
```

- Paths always via `pathlib.Path`; encoding always explicit.
- Parameterize scripts with `argparse`/`typer` — not by editing constants.
- Scheduling: crontab / Task Scheduler for small jobs; Airflow / Celery beat for real pipelines.
- Layered thinking: raw → clear → app directories; intermediate parquet outputs enable resume-on-failure reruns.

## 6. Self-check

1. What is vectorization? Why is NumPy orders of magnitude faster than a for-loop?
2. Broadcasting in one sentence: result shape of `(3,1)` op `(1,4)`?
3. `loc` vs `iloc`? The canonical condition-select-columns idiom?
4. After a multi-agg groupby, how do you tame the MultiIndex columns?
5. Which SQL JOINs do merge's `how` values map to? How do you verify no left rows were lost?
6. When is `iterrows` tolerable? (Answer: almost never — tiny frames with unavoidable per-row side effects.)
7. A huge CSV OOMs Pandas — three escapes? (dtype diet / category / chunksize, or polars/DuckDB)
8. What does SQLAlchemy's `pool_pre_ping` fix?
9. Why does Excel garble UTF-8 CSVs and what's the root fix?

Next stop → [Machine & Deep Learning](./ml-dl): cashing in your data skills.
