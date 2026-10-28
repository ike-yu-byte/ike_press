# SQL 从入门到实战

> SQL 是后端工程师的"通用语"：面试笔试手写 SQL、日常提数、报表开发、排查慢查询都靠它。本章以 MySQL 8 语法为主，标准 SQL 通用于 PostgreSQL/SQL Server。

## 一、关系数据库与示例表

关系模型三要素：关系（表）、元组（行）、属性（列）。本章全程使用下面四张示例表：

```sql
-- 部门表
CREATE TABLE dept (
    id      BIGINT PRIMARY KEY AUTO_INCREMENT,
    name    VARCHAR(32) NOT NULL
);

-- 员工表
CREATE TABLE emp (
    id      BIGINT PRIMARY KEY AUTO_INCREMENT,
    name    VARCHAR(32) NOT NULL,
    age     INT,
    salary  DECIMAL(10,2),
    dept_id BIGINT,                    -- 外键指向 dept.id
    hire_date DATE
);

-- 订单表
CREATE TABLE orders (
    id        BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id   BIGINT NOT NULL,
    amount    DECIMAL(10,2) NOT NULL,
    status    TINYINT NOT NULL,        -- 0待支付 1已支付 2已发货 9已取消
    created_at DATETIME NOT NULL
);

-- 订单商品明细表
CREATE TABLE order_item (
    order_id  BIGINT,
    product_id BIGINT,
    qty       INT,
    price     DECIMAL(10,2)
);
```

## 二、DDL / DML / DCL 速查

```sql
-- DDL（结构）
CREATE TABLE / ALTER TABLE emp ADD COLUMN phone VARCHAR(20);
ALTER TABLE emp MODIFY COLUMN age SMALLINT;      -- 改类型
ALTER TABLE emp RENAME COLUMN phone TO mobile;   -- 改列名（8.0+）
CREATE INDEX idx_emp_dept ON emp(dept_id);       -- 建索引
TRUNCATE TABLE emp;      -- 清空：DDL，不逐行删除、不可回滚、重置自增
DROP TABLE emp;          -- 删表
-- DML（数据）
INSERT INTO emp(name, age, salary, dept_id, hire_date)
VALUES ('张三', 28, 15000.00, 1, CURDATE());
INSERT INTO emp VALUES ... , ... ON DUPLICATE KEY UPDATE salary = VALUES(salary); -- 幂等 upsert
UPDATE emp SET salary = salary * 1.1 WHERE dept_id = 1;   -- 永远先写 WHERE 再执行！
DELETE FROM emp WHERE id = 3;
-- DCL/TCL（权限与事务）
GRANT SELECT ON app.* TO 'reader'@'%';
START TRANSACTION; ... COMMIT; / ROLLBACK;
```

`DELETE` vs `TRUNCATE` vs `DROP` 是笔试送分题：DML 可回滚逐行删有触发器 / DDL 不可回滚速度快 / 删表连结构一起没了。

## 三、SELECT 核心：执行顺序是灵魂

书写顺序 vs **逻辑执行顺序**（面试必考，理解它才能看懂一切报错和写法）：

```
书写:  SELECT  →  FROM  →  WHERE  →  GROUP BY  →  HAVING  →  ORDER BY  →  LIMIT
执行:  FROM(含JOIN) → WHERE → GROUP BY → 聚合计算 → HAVING → SELECT列计算 → DISTINCT → ORDER BY → LIMIT
```

推论（每一条都是常见报错来源）：

- `WHERE` 里不能用 SELECT 中定义的别名（标准 SQL；MySQL 允许在 HAVING/ORDER BY 用别名）、不能用聚合函数——聚合发生在 GROUP BY 之后。
- `GROUP BY` 后，SELECT 只能出现**分组列或聚合值**（MySQL 关闭 `ONLY_FULL_GROUP_BY` 能跑但结果随机，生产必须开）。

```sql
-- 各部门平均薪资，只要平均薪资大于 10000 的，按平均薪资倒序，取前 5
SELECT dept_id, AVG(salary) AS avg_sal
FROM emp
WHERE status = 1                        -- 先过滤行
GROUP BY dept_id                        -- 再分组
HAVING AVG(salary) > 10000              -- 后过滤组
ORDER BY avg_sal DESC
LIMIT 5;
```

### 常用过滤与函数

```sql
WHERE name LIKE '张%'          -- 前缀匹配可走索引；'%张%' 全表扫
WHERE id IN (1,2,3)            -- 小列表 OK，超大列表改 JOIN 临时表
WHERE hire_date BETWEEN '2024-01-01' AND '2024-12-31'   -- 闭区间，日期用半开区间更安全：
WHERE hire_date >= '2024-01-01' AND hire_date < '2025-01-01'
WHERE dept_id IS NULL          -- NULL 永远用 IS NULL 判断，= NULL 结果恒为未知
-- 字符串：CONCAT / SUBSTRING / LENGTH / UPPER / TRIM / REPLACE
-- 日期：DATE_ADD(NOW(), INTERVAL 7 DAY)、DATEDIFF(a, b)、DATE_FORMAT(t, '%Y-%m')
-- 空值兜底：COALESCE(commission, 0)、IFNULL(bonus, 0)
-- 条件计数（面试高频技巧）：
SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END)                -- 已支付数
SUM(IF(status = 9, 1, 0))                                  -- MySQL 简写
COUNT(DISTINCT user_id)                                    -- 去重计数
```

## 四、JOIN 与自连接

| JOIN | 含义 | 记忆 |
| --- | --- | --- |
| `INNER JOIN` | 两表匹配交集 | 没配对不上就消失 |
| `LEFT JOIN` | 左表全保留，右表缺失补 NULL | "以左表为准" |
| `RIGHT JOIN` | 镜像 | 用 LEFT 交换表序可完全替代 |
| `CROSS JOIN` | 笛卡尔积 | 除生成测试数据外都是事故 |

```sql
-- 每个员工的部门名（部门可能为 NULL → 用 LEFT JOIN 保留没部门的员工）
SELECT e.name, d.name AS dept_name
FROM emp e
LEFT JOIN dept d ON e.dept_id = d.id;

-- 找没有员工的部门：反连接套路（面试高频）
SELECT d.*
FROM dept d
LEFT JOIN emp e ON e.dept_id = d.id
WHERE e.id IS NULL;
-- 等价写法：WHERE d.id NOT IN (SELECT dept_id FROM emp WHERE dept_id IS NOT NULL)
-- 或 NOT EXISTS (SELECT 1 FROM emp WHERE emp.dept_id = d.id)  ← 大数据量常最优

-- 自连接：查询薪资高于同部门同事的员工（同事对同事）
SELECT a.name, a.salary, b.name AS peer, b.salary AS peer_salary
FROM emp a JOIN emp b ON a.dept_id = b.dept_id AND a.salary > b.salary;
```

**JOIN 注意事项**：多对多 JOIN 会**放大行数**——`orders JOIN order_item` 后再 `SUM(orders.amount)` 会把主表金额按明细行数重复累加。对策：先聚合子查询再 JOIN（见下文）。

## 五、子查询与 CTE

```sql
-- 标量子查询：高于全公司平均薪的员工
SELECT name, salary FROM emp
WHERE salary > (SELECT AVG(salary) FROM emp);

-- 相关子查询：每笔订单所属用户的总消费（内层引用外层，逐行执行，注意性能）
SELECT o.id, o.amount,
       (SELECT SUM(amount) FROM orders u WHERE u.user_id = o.user_id) AS user_total
FROM orders o;

-- 派生表：先聚合再比较（避免 JOIN 放大问题的标准姿势）
SELECT d.name, s.emp_cnt
FROM (SELECT dept_id, COUNT(*) AS emp_cnt FROM emp GROUP BY dept_id) s
JOIN dept d ON d.id = s.dept_id
WHERE s.emp_cnt > 10;

-- CTE（WITH，MySQL 8+）：可读性 + 递归
WITH high_paid AS (
    SELECT * FROM emp WHERE salary > 20000
)
SELECT dept_id, COUNT(*) FROM high_paid GROUP BY dept_id;

-- 递归 CTE：组织树/菜单树查询（笔试压轴常客）
WITH RECURSIVE tree AS (
    SELECT id, name, parent_id, 1 AS level FROM menu WHERE parent_id IS NULL
    UNION ALL
    SELECT m.id, m.name, m.parent_id, t.level + 1
    FROM menu m JOIN tree t ON m.parent_id = t.id
)
SELECT * FROM tree ORDER BY level;
```

## 六、窗口函数（现代 SQL 的分水岭）

语法：`函数() OVER (PARTITION BY 分组列 ORDER BY 排序列 [窗口帧])`。与 GROUP BY 的本质区别：**不压缩行数**，每行保留并附加计算列。

```sql
-- 1) 排名三兄弟
SELECT name, dept_id, salary,
       ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rn,   -- 1,2,3 不并列
       RANK()       OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rk,   -- 1,1,3 并列跳号
       DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS drk   -- 1,1,2 并列不跳号
FROM emp;

-- 2) 经典题：每个部门薪资 Top 3（窗口 + CTE 组合拳，面试出现率极高）
WITH ranked AS (
    SELECT e.*, ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rn
    FROM emp e
)
SELECT name, dept_id, salary FROM ranked WHERE rn <= 3;

-- 3) 同比/环比：LAG / LEAD 取相邻行
SELECT month, sales,
       LAG(sales)      OVER (ORDER BY month) AS prev_month,          -- 上月
       sales - LAG(sales)   OVER (ORDER BY month) AS diff,
       ROUND(sales / LAG(sales) OVER (ORDER BY month) - 1, 4) AS mom_rate   -- 环比增长率
FROM monthly_sales;

-- 4) 累计求和（默认帧 = 从分区开头到当前行）
SELECT created_at, amount,
       SUM(amount) OVER (ORDER BY created_at) AS running_total
FROM orders;

-- 5) 去重保留最新一条（"每组 Top1" 业务万能模板）
SELECT * FROM (
    SELECT o.*, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) rn
    FROM orders o
) t WHERE rn = 1;
```

其他常用：`NTILE(4)` 分桶（四分位）、`FIRST_VALUE / LAST_VALUE`、`SUM() OVER (PARTITION BY ... ORDER BY dt ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)`（7 日滑动和）。

## 七、分页、聚合与常见笔试题型

```sql
-- 分页：LIMIT offset, size；深分页性能问题见 MySQL 章
SELECT * FROM orders ORDER BY id DESC LIMIT 10 OFFSET 20;   -- 第 3 页

-- 分组求每类最大值再关联明细（"组内最值"套路）
SELECT t.* FROM order_item t
JOIN (SELECT order_id, MAX(price) AS mp FROM order_item GROUP BY order_id) m
  ON t.order_id = m.order_id AND t.price = m.mp;
```

**必刷题型清单**（都能用示例表改写）：

1. 每个部门人数、平均薪、最高薪 —— GROUP BY + 聚合
2. 工资排名第二的员工 —— `DENSE_RANK` 或 `LIMIT 1 OFFSET 1`（注意并列语义不同）
3. 连续登录 ≥3 天的用户 —— 经典"日期减行号"分组法
4. 累计消费 Top N 用户 —— GROUP BY + ORDER + LIMIT
5. 每月订单数及环比 —— 窗口 LAG
6. 查找重复邮箱 —— GROUP BY HAVING COUNT(*) > 1

```sql
-- 题型 3 解法：连续日期 - 连续行号 = 相同差值（分组锚点）
SELECT user_id, MIN(dt) AS start, MAX(dt) AS end, COUNT(*) AS days FROM (
    SELECT user_id, dt,
           DATE_SUB(dt, INTERVAL ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY dt) DAY) AS grp
    FROM login_log
) t GROUP BY user_id, grp HAVING COUNT(*) >= 3;
```

## 八、写 SQL 的工程习惯

- **禁止 `SELECT *`**：多取列破坏覆盖索引、字段变更炸掉下游代码。
- UPDATE/DELETE 前先跑同条件 SELECT 确认行数；生产开启 SQL 审核（Yearning/Archery）与 `sql_safe_updates`。
- 隐式类型转换是索引杀手：`WHERE phone = 13800000000`（列是 VARCHAR）会全表扫——字符串必须带引号。
- 日期比较不要对列套函数：`WHERE DATE(created_at) = '2026-10-28'` 索引失效，改写成半开区间。
- 大 IN 列表（>1000）改临时表 JOIN；`OR` 连接的列若无索引会放弃索引，考虑 union 改写。
