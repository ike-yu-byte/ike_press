# SQL from Basics to Practice

> SQL is the backend's lingua franca: hand-written queries in interviews, ad-hoc data pulls, reports, and slow-query triage in daily work. MySQL 8 syntax leads here; standard SQL carries over to PostgreSQL/SQL Server.

## 1. The Relational Model & Sample Tables

Three elements: relation (table), tuple (row), attribute (column). All examples use:

```sql
-- department
CREATE TABLE dept (
    id      BIGINT PRIMARY KEY AUTO_INCREMENT,
    name    VARCHAR(32) NOT NULL
);

-- employee
CREATE TABLE emp (
    id        BIGINT PRIMARY KEY AUTO_INCREMENT,
    name      VARCHAR(32) NOT NULL,
    age       INT,
    salary    DECIMAL(10,2),
    dept_id   BIGINT,                    -- FK to dept.id
    hire_date DATE
);

-- orders
CREATE TABLE orders (
    id         BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id    BIGINT NOT NULL,
    amount     DECIMAL(10,2) NOT NULL,
    status     TINYINT NOT NULL,        -- 0 pending, 1 paid, 2 shipped, 9 cancelled
    created_at DATETIME NOT NULL
);

-- order line items
CREATE TABLE order_item (
    order_id   BIGINT,
    product_id BIGINT,
    qty        INT,
    price      DECIMAL(10,2)
);
```

## 2. DDL / DML / DCL Quick Reference

```sql
-- DDL (structure)
CREATE TABLE / ALTER TABLE emp ADD COLUMN phone VARCHAR(20);
ALTER TABLE emp MODIFY COLUMN age SMALLINT;      -- change type
ALTER TABLE emp RENAME COLUMN phone TO mobile;   -- rename (8.0+)
CREATE INDEX idx_emp_dept ON emp(dept_id);       -- add index
TRUNCATE TABLE emp;      -- DDL: no row-by-row delete, not rollback-able, resets auto-increment
DROP TABLE emp;          -- remove the table entirely
-- DML (data)
INSERT INTO emp(name, age, salary, dept_id, hire_date)
VALUES ('Alice', 28, 15000.00, 1, CURDATE());
INSERT INTO emp VALUES ... , ... ON DUPLICATE KEY UPDATE salary = VALUES(salary); -- idempotent upsert
UPDATE emp SET salary = salary * 1.1 WHERE dept_id = 1;   -- write the WHERE before hitting enter!
DELETE FROM emp WHERE id = 3;
-- DCL/TCL
GRANT SELECT ON app.* TO 'reader'@'%';
START TRANSACTION; ... COMMIT; / ROLLBACK;
```

DELETE vs TRUNCATE vs DROP is a freebie: DML row-by-row rollback-able with triggers / DDL fast, no rollback / DROP takes the schema with it.

## 3. SELECT: the Execution Order is Everything

Written vs **logical execution** order (interview staple; understanding it explains every error you've ever hit):

```
written:  SELECT  →  FROM  →  WHERE  →  GROUP BY  →  HAVING  →  ORDER BY  →  LIMIT
executed: FROM(+JOIN) → WHERE → GROUP BY → aggregation → HAVING → SELECT expressions → DISTINCT → ORDER BY → LIMIT
```

Consequences (each a classic error source):

- `WHERE` cannot use SELECT aliases (standard SQL; MySQL allows them in HAVING/ORDER BY) and cannot use aggregates — aggregation happens after GROUP BY.
- After `GROUP BY`, SELECT may only contain **grouping columns or aggregates** (results are random if you disable `ONLY_FULL_GROUP_BY`; keep it on in production).

```sql
-- Per-department average salary, only groups above 10000, top 5 by average desc
SELECT dept_id, AVG(salary) AS avg_sal
FROM emp
WHERE status = 1                        -- filter rows first
GROUP BY dept_id                        -- then group
HAVING AVG(salary) > 10000              -- then filter groups
ORDER BY avg_sal DESC
LIMIT 5;
```

### Everyday predicates & functions

```sql
WHERE name LIKE 'A%'           -- prefix can use an index; '%A%' cannot
WHERE id IN (1,2,3)            -- fine for small lists; huge lists → join a temp table
WHERE hire_date BETWEEN '2024-01-01' AND '2024-12-31'   -- closed interval; half-open is safer:
WHERE hire_date >= '2024-01-01' AND hire_date < '2025-01-01'
WHERE dept_id IS NULL          -- NULL only ever with IS NULL; = NULL is always "unknown"
-- strings: CONCAT / SUBSTRING / LENGTH / UPPER / TRIM / REPLACE
-- dates: DATE_ADD(NOW(), INTERVAL 7 DAY), DATEDIFF(a, b), DATE_FORMAT(t, '%Y-%m')
-- null fallback: COALESCE(commission, 0), IFNULL(bonus, 0)
-- conditional counting (high-frequency trick):
SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END)                -- paid count
SUM(IF(status = 9, 1, 0))                                  -- MySQL shorthand
COUNT(DISTINCT user_id)                                    -- distinct count
```

## 4. JOINs & Self-JOINs

| JOIN | Meaning | Mnemonic |
| --- | --- | --- |
| `INNER JOIN` | matched pairs only | unmatched rows vanish |
| `LEFT JOIN` | keep all left rows, NULL-fill right | "left table is the master" |
| `RIGHT JOIN` | mirror image | fully replaceable by swapping tables + LEFT |
| `CROSS JOIN` | cartesian product | test-data generation only; otherwise an incident |

```sql
-- Employee with department name (some have none → LEFT JOIN keeps them)
SELECT e.name, d.name AS dept_name
FROM emp e
LEFT JOIN dept d ON e.dept_id = d.id;

-- Departments with no employees: the anti-join pattern (very frequent)
SELECT d.*
FROM dept d
LEFT JOIN emp e ON e.dept_id = d.id
WHERE e.id IS NULL;
-- equivalents: WHERE d.id NOT IN (SELECT dept_id FROM emp WHERE dept_id IS NOT NULL)
-- or NOT EXISTS (SELECT 1 FROM emp WHERE emp.dept_id = d.id)  ← often best at scale

-- Self join: employees paid more than a colleague in the same dept
SELECT a.name, a.salary, b.name AS peer, b.salary AS peer_salary
FROM emp a JOIN emp b ON a.dept_id = b.dept_id AND a.salary > b.salary;
```

**JOIN caveat**: many-to-many joins **multiply rows** — `orders JOIN order_item` then `SUM(orders.amount)` double-counts the header per line item. Fix: aggregate in a subquery first (see below).

## 5. Subqueries & CTEs

```sql
-- Scalar subquery: employees above company average
SELECT name, salary FROM emp
WHERE salary > (SELECT AVG(salary) FROM emp);

-- Correlated subquery: per-order user lifetime spend (executes per row — watch performance)
SELECT o.id, o.amount,
       (SELECT SUM(amount) FROM orders u WHERE u.user_id = o.user_id) AS user_total
FROM orders o;

-- Derived table: aggregate first, then join (the standard fix for join fan-out)
SELECT d.name, s.emp_cnt
FROM (SELECT dept_id, COUNT(*) AS emp_cnt FROM emp GROUP BY dept_id) s
JOIN dept d ON d.id = s.dept_id
WHERE s.emp_cnt > 10;

-- CTE (WITH, MySQL 8+): readability + recursion
WITH high_paid AS (
    SELECT * FROM emp WHERE salary > 20000
)
SELECT dept_id, COUNT(*) FROM high_paid GROUP BY dept_id;

-- Recursive CTE: org/menu trees (the usual exam finale)
WITH RECURSIVE tree AS (
    SELECT id, name, parent_id, 1 AS level FROM menu WHERE parent_id IS NULL
    UNION ALL
    SELECT m.id, m.name, m.parent_id, t.level + 1
    FROM menu m JOIN tree t ON m.parent_id = t.id
)
SELECT * FROM tree ORDER BY level;
```

## 6. Window Functions (the modern-SQL watershed)

Syntax: `func() OVER (PARTITION BY grouping ORDER BY sorting [frame])`. Versus GROUP BY: **row count is preserved** — a computed column is appended per row.

```sql
-- 1) The ranking trio
SELECT name, dept_id, salary,
       ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rn,   -- 1,2,3 never tie
       RANK()       OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rk,   -- 1,1,3 ties skip numbers
       DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS drk   -- 1,1,2 ties don't skip
FROM emp;

-- 2) The classic: top-3 salaries per department (window + CTE combo — very frequent)
WITH ranked AS (
    SELECT e.*, ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rn
    FROM emp e
)
SELECT name, dept_id, salary FROM ranked WHERE rn <= 3;

-- 3) Period-over-period: LAG / LEAD reach into neighboring rows
SELECT month, sales,
       LAG(sales)  OVER (ORDER BY month) AS prev_month,
       sales - LAG(sales) OVER (ORDER BY month) AS diff,
       ROUND(sales / LAG(sales) OVER (ORDER BY month) - 1, 4) AS mom_rate   -- growth rate
FROM monthly_sales;

-- 4) Running total (default frame: partition start → current row)
SELECT created_at, amount,
       SUM(amount) OVER (ORDER BY created_at) AS running_total
FROM orders;

-- 5) Keep the latest row per group (the universal "top-1 per group" template)
SELECT * FROM (
    SELECT o.*, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) rn
    FROM orders o
) t WHERE rn = 1;
```

Also handy: `NTILE(4)` bucketing, `FIRST_VALUE / LAST_VALUE`, `SUM() OVER (PARTITION BY ... ORDER BY dt ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` (7-day moving sum).

## 7. Pagination, Aggregation & Exam Classics

```sql
-- Paging: LIMIT offset, size; deep-offset performance covered in the MySQL chapter
SELECT * FROM orders ORDER BY id DESC LIMIT 10 OFFSET 20;   -- page 3

-- Max-per-group then fetch details (the "greatest-n-per-group" pattern)
SELECT t.* FROM order_item t
JOIN (SELECT order_id, MAX(price) AS mp FROM order_item GROUP BY order_id) m
  ON t.order_id = m.order_id AND t.price = m.mp;
```

**Must-drill question types** (all answerable on the sample tables):

1. Headcount / avg / max salary per department — GROUP BY + aggregates
2. Second-highest salary — `DENSE_RANK` vs `LIMIT 1 OFFSET 1` (tie semantics differ!)
3. Users with ≥3 consecutive login days — the date-minus-row_number grouping trick
4. Top-N spenders — GROUP BY + ORDER + LIMIT
5. Monthly orders with MoM growth — window LAG
6. Find duplicate emails — GROUP BY HAVING COUNT(*) > 1

```sql
-- Answer to #3: consecutive dates minus consecutive row numbers share a constant group anchor
SELECT user_id, MIN(dt) AS start, MAX(dt) AS end, COUNT(*) AS days FROM (
    SELECT user_id, dt,
           DATE_SUB(dt, INTERVAL ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY dt) DAY) AS grp
    FROM login_log
) t GROUP BY user_id, grp HAVING COUNT(*) >= 3;
```

## 8. Engineering Habits for Writing SQL

- **No `SELECT *`**: extra columns defeat covering indexes; schema changes break downstream code.
- Run the same WHERE as a SELECT before any UPDATE/DELETE; in production use SQL review tooling (Yearning/Archery) and `sql_safe_updates`.
- Implicit casts kill indexes: `WHERE phone = 13800000000` on a VARCHAR column scans the whole table — quote string literals.
- Never wrap a column in a function for comparisons: `WHERE DATE(created_at) = '2026-10-28'` → rewrite as a half-open range.
- Huge IN lists (>1000) → temp table join; `OR` across non-indexed columns abandons indexes → consider UNION rewrite.
