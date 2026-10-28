# 数据处理三件套：NumPy / Pandas / 数据库 Python

> 第 4 站：Python 的看家本领。AI 岗的日常 70% 是和数据打交道——清洗、转换、聚合、喂给模型。本章同时补齐 Python 侧的 MySQL/Redis 姿势（SQL 语句本身见 [Java 库的 SQL/MySQL 章](../java/sql)，这里只讲驱动与工程用法）。

## 一、NumPy：向量化思维

```python
import numpy as np

a = np.array([[1, 2, 3], [4, 5, 6]])       # 同质多维数组：连续内存、单一 dtype
a.shape, a.dtype                            # (2, 3) int64 —— 维度思维是一切的基础
a[:, 1]                                     # 切片：所有行的第 1 列 → array([2, 5])

# 广播（broadcasting）：不同形状自动对齐，替代手写循环
a * 2                                        # 标量广播
a + np.array([10, 20, 30])                   # 行向量广播到每一行
col_sums = a.sum(axis=0)                     # axis=0 跨行（按列聚合）；axis=1 跨列（按行）

# 布尔索引：条件筛选的向量化写法
a[a > 3] = 0                                 # 所有大于 3 的元素置 0——无 if 循环
mask = (a > 1) & (a < 6)                     # 条件用 & | ~，不能用 and/or（元素级运算）

# 为什么快：C 连续内存 + SIMD + 免解释器逐元素调度。
# 经验值：np.sum(v) 比 sum(v) 快 30-100 倍（大数组）；看到 for 遍历数组就该警觉
```

## 二、Pandas：表格数据操作系统

```python
import pandas as pd

df = pd.read_csv("orders.csv", parse_dates=["created_at"], dtype={"user_id": "int64"})
df.head(); df.info()                 # info 看列型与缺失——拿到数据先体检
df.describe()                        # 数值列统计概览
df.shape                             # (行, 列)

# 选择：loc 按标签 / iloc 按位置
df.loc[df["amount"] > 100, ["user_id", "amount"]]     # 条件 + 选列一步到位
df.iloc[0, 0]

# 清洗三板斧
df = df.dropna(subset=["amount"])                     # 删
df["channel"] = df["channel"].fillna("unknown")       # 填
df["amount"] = df["amount"].astype(float).clip(lower=0)   # 转型 + 截断异常
df = df.drop_duplicates(subset=["order_id"])          # 去重

# 派生列：向量化，别 iterrows（慢且是新手标志）
df["month"] = df["created_at"].dt.to_period("M")      # .dt 时间属性 / .str 字符串方法
df["is_big"] = df["amount"] >= 1000
df["category"] = df["category"].astype("category")    # 低基数列转 category 省内存提速

# groupby-split-apply：SQL GROUP BY 的表形式
top = (df.groupby(["month", "channel"])["amount"]
         .agg(["sum", "mean", "count"])
         .rename(columns={"sum": "gmv"})
         .sort_values(("gmv",), ascending=False)
         .head(10))
pivot = df.pivot_table(index="month", columns="channel", values="amount",
                       aggfunc="sum", fill_value=0)   # 透视表 = Excel 数据透视

# 合并：SQL JOIN 的表形式
users = pd.read_parquet("users.parquet")              # 大表用 parquet 不用 csv（列式、带类型、快数倍）
merged = df.merge(users, on="user_id", how="left")    # how: left/inner/outer；indicator=True 可查匹配率
```

**性能心法**：能向量化不循环 → 能 `category` 不 object → 能 `chunksize` 分块不整读 → 千万行级别换 **polars**（多线程版 Pandas，API 相近）或 DuckDB（本地直接 SQL）。

## 三、可视化最小集

```python
import matplotlib
matplotlib.use("Agg")                 # 无界面环境（服务器/容器）必须——否则 import 就报错
import matplotlib.pyplot as plt

ax = df.groupby("month")["amount"].sum().plot(kind="bar", figsize=(10, 4), title="月度 GMV")
fig, axes = plt.subplots(1, 2, figsize=(12, 4))       # 多子图
df.boxplot(column="amount", by="channel", ax=axes[0]) # 箱线图看分布与离群
fig.savefig("report.png", dpi=150, bbox_inches="tight")
plt.close(fig)                        # 批处理循环里必须 close，否则内存泄漏
```

探索期用 seaborn（统计图更省事）或 plotly（交互 HTML）；报告输出 matplotlib 足够。

## 四、MySQL / Redis / MongoDB 的 Python 姿势

```python
# MySQL：SQLAlchemy（应用开发）或 PyMySQL（轻量脚本）；SQL 语句本身与 Java 章通用
from sqlalchemy import create_engine, text

engine = create_engine(
    "mysql+pymysql://user:pwd@localhost:3306/shop?charset=utf8mb4",
    pool_size=10, max_overflow=20, pool_pre_ping=True,   # 连接池三参数：防断连、控上限
)
with engine.connect() as conn:
    rows = conn.execute(
        text("SELECT id, name FROM users WHERE created_at > :since"),   # 参数化——防注入铁律
        {"since": "2026-01-01"},
    ).mappings().all()                                     # 结果为 dict 列表，列名访问

# 大结果集流式读：默认 fetchall 会把 1000 万行拉进内存
with engine.connect().execution_options(stream_results=True).connect() as conn: ...
# 实操常用：pd.read_sql(query, engine, chunksize=100_000) 分块 → 逐块处理

# Redis
import redis
r = redis.ConnectionPool.from_url("redis://:pwd@localhost:6379/0", max_connections=20)
client = redis.Redis(connection_pool=r)
client.set("hot:rank", json.dumps(data), ex=300)          # 带 TTL 缓存
client.hgetall("user:1001"); client.incr("api:quota")     # 结构同 Java 章 Redis 用法
```

- ORM/驱动选型口径：Web 服务 → SQLAlchemy 2.0（async 版配 FastAPI）；数据分析拉数 → `pd.read_sql` + 只读账号；高并发计数/缓存 → redis-py。
- 批量写入用 `executemany`/`to_sql(method="multi")`，逐条 INSERT 是新手坑（网络往返 × N）。

## 五、Excel/CSV 实战与工程习惯

```python
# Excel 报表自动化（业务岗高频需求）
with pd.ExcelWriter("out.xlsx", engine="openpyxl") as xw:
    summary.to_excel(xw, sheet_name="汇总")
    detail.to_excel(xw, sheet_name="明细", index=False)

df.to_csv("out.csv", index=False, encoding="utf-8-sig")   # utf-8-sig：Excel 打开不乱码的经典细节
```

- 文件路径一律 `pathlib.Path`；编码显式 `encoding="utf-8"`。
- 脚本参数化用 `argparse`/`typer`，别改代码里的常量。
- 定时任务：小脚本 crontab / Windows 计划任务；正经调度用 Airflow/Celery beat。
- 数据管道思维：原始层(raw) → 清洗层(clear) → 应用层(app) 分目录存放，中间结果落 parquet 可断点复跑。

## 六、本章自检清单

1. 什么是向量化？为什么 NumPy 比 for 循环快几个数量级？
2. 广播规则一句话：`(3,1)` 和 `(1,4)` 运算结果形状？
3. `loc`/`iloc` 区别？条件选列的标准写法？
4. groupby 之后 `agg` 多聚合、结果多级列名怎么整理？
5. merge 的 how 参数对应 SQL 的哪些 JOIN？怎么验证左表全保住了？
6. `iterrows` 什么时候可以忍？（答：几乎不——除非必须逐行副作用且量小）
7. 大 CSV 读进 Pandas 内存爆了，三条出路？（dtype 瘦身/category/chunksize 或换 polars/DuckDB）
8. SQLAlchemy 连接池 `pool_pre_ping` 解决什么问题？
9. 为什么 Excel 打开 UTF-8 CSV 乱码，怎么根治？

下一站 → [机器学习与深度学习](./ml-dl)：数据本事变现的第一步。
