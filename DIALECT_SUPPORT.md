# SQL Dialect Support

This app parses DDL (CREATE TABLE / ALTER TABLE FOREIGN KEY) to generate ERDs.
Support is provided by [`node-sql-parser`](https://github.com/taozhi8833998/node-sql-parser) plus per-dialect sanitizers in `src/lib/ddl/`.

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully supported — paste and go |
| ⚠️ | Partial — works with caveats noted |
| ❌ | Not supported — parser rejects it |

---

## Supported Dialects

| Database | Dialect | Status | Notes |
|----------|---------|--------|-------|
| PostgreSQL | PostgreSQL SQL | ✅ | Default. Handles `SERIAL`, `TIMESTAMPTZ`, `JSONB`, `UUID`, `ENUM` (rewritten to TEXT), dollar-quote strings, `ALTER TABLE ... FOREIGN KEY`. |
| MySQL | MySQL SQL | ✅ | Backtick identifiers handled natively. Table options (`ENGINE=`, `AUTO_INCREMENT=`, etc.) stripped automatically. |
| MariaDB | MariaDB SQL | ✅ | Treated identically to MySQL. |
| SQLite | SQLite SQL | ✅ | `WITHOUT ROWID` and `STRICT` clauses stripped. Inline FK declarations only. |
| Google BigQuery | GoogleSQL | ✅ | Converted to PostgreSQL-compatible syntax before parsing. |
| Microsoft SQL Server | T-SQL | ⚠️ | Sanitizer strips `IDENTITY`, brackets, etc.; parsed as PostgreSQL-compatible SQL. |
| Snowflake | Snowflake SQL | ✅ | `NUMBER`, `VARIANT`, `CLUSTER BY`, sequences/views stripped. `ALTER TABLE` FKs parsed via PG fallback. |
| Amazon Redshift | Redshift SQL | ✅ | `ENCODE`, `DISTSTYLE`, `DISTKEY`, `SORTKEY` stripped. FK declarations kept (informational). |
| IBM Db2 | Db2 SQL | ✅ | `GENERATED ALWAYS AS IDENTITY`, `IN USERSPACE`, `ORGANIZE BY ROW` stripped/rewritten. |
| Trino | Trino SQL | ✅ | `catalog.schema.table` unqualified, `WITH (format=…)` stripped. **No native FK constraints** — relationships inferred from column naming (`*_id`, `owner_id`, etc.). |
| Apache Hive | HiveQL | ✅ | `STORED AS`, `PARTITIONED BY`, `TBLPROPERTIES`, `DISABLE NOVALIDATE` stripped. |
| Apache Flink | FlinkSQL | ✅ | `WATERMARK`, computed columns, `WITH ('connector'=…)`, `NOT ENFORCED` stripped. |

### BigQuery — What Gets Handled

The BigQuery sanitizer converts GoogleSQL DDL to PostgreSQL-compatible syntax, then parses it with the PostgreSQL parser.

| Feature | Handling |
|---------|---------|
| `INT64`, `FLOAT64`, `BOOL` | Converted to `BIGINT`, `FLOAT8`, `BOOLEAN` |
| `STRING` / `STRING(n)` | Converted to `TEXT` / `VARCHAR(n)` |
| `` `project.dataset.table` `` | Resolved to unqualified `"table"` name |
| `STRUCT<>`, `ARRAY<>` | Simplified for parsing |
| `NOT ENFORCED` on PK/FK | Stripped — constraints detected |

### Trino — Implicit Foreign Keys

Trino does not enforce `FOREIGN KEY` constraints in DDL. After parsing tables, the app infers likely FK edges when:

- A column ends with `_id` and matches a referenced table's primary key column (`group_id` → `groups.group_id`)
- Common reference columns (`owner_id`, `created_by`, `manager_id`, etc.) match `users` or `accounts`
- Self-referential `parent_id` / `parent_*_id` columns reference the same table's PK

Ambiguous matches (multiple candidate targets) are skipped.

---

## Unsupported Dialects

| Database | Dialect | Status | Workaround |
|----------|---------|--------|------------|
| Oracle Database | PL/SQL | ❌ | Not in the library. |
| DuckDB | DuckDB SQL | ❌ | Try *PostgreSQL* for simple schemas. |
| Apache Spark SQL | Spark SQL | ❌ | Explicitly rejected by the library. |
| Databricks SQL | Databricks SQL | ❌ | Same engine as Spark. |
| ClickHouse | ClickHouse SQL | ❌ | Not in the library. |

---

## Dialect Dropdown

The selector groups dialects as **Common** and **Warehouse & analytics**:

| Group | Dialects |
|-------|----------|
| Common | PostgreSQL, MySQL, MariaDB, SQLite, SQL Server, BigQuery |
| Warehouse & analytics | Snowflake, Amazon Redshift, IBM Db2, Trino, Apache Hive, Apache Flink |

Internal values map to `node-sql-parser` modes (`Snowflake`, `Redshift`, `DB2`, `Trino`, `Hive`, `FlinkSQL`) with PostgreSQL fallback when native parse fails or when `ALTER TABLE … FOREIGN KEY` is present.

---

## How Auto-Detection Works

When you paste SQL or upload files, markers are checked in priority order:

| Marker | Detected As |
|--------|------------|
| `` `a.b.c` ``, `STRUCT<`, `ARRAY<` | BigQuery |
| `TIMESTAMP_NTZ`, `VARIANT`, `CLUSTER BY`, `NUMBER` + `AUTOINCREMENT` | Snowflake |
| `ENCODE`, `DISTSTYLE`, `DISTKEY`, `COMPOUND SORTKEY` | Redshift |
| `WATERMARK FOR`, `PROCTIME()`, `TIMESTAMP_LTZ`, `'connector' = 'kafka'`, `NOT ENFORCED` | Flink |
| `DISABLE NOVALIDATE`, `STORED AS ORC/PARQUET`, `CLUSTERED BY`, `MAP<STRING`, `PARTITIONED BY` | Hive |
| `CREATE SCHEMA`, `WITH (format =`, `TIMESTAMP(6) WITH TIME ZONE`, `hive.` catalog prefix | Trino |
| `ORGANIZE BY ROW`, `GENERATED ALWAYS AS IDENTITY (START WITH`, `IN USERSPACE`, `DEFAULT CURRENT TIMESTAMP` | Db2 |
| Backticks, `ENGINE=`, `AUTO_INCREMENT` | MySQL |
| `[brackets]`, `IDENTITY(`, `GO`, `NVARCHAR` | SQL Server |
| `INTEGER` + `AUTOINCREMENT`, `WITHOUT ROWID` | SQLite |
| None of the above | PostgreSQL (default) |

Auto-detection pre-selects the dialect and shows an **Auto-detected** badge. Manual selection switches to **Custom**; use **Detect automatically** to re-run from current SQL.

---

## Tests

```bash
npm run test:dialects    # all 12 dialects × 3 fixtures
node scripts/smoke-detect-dialect.cjs
```
