# SQL Dialect Support

This app parses DDL (CREATE TABLE / ALTER TABLE FOREIGN KEY) to generate ERDs.
Support is provided by [`node-sql-parser`](https://github.com/taozhi8833998/node-sql-parser).

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
| MySQL | MySQL SQL | ✅ | Backtick identifiers handled natively. Table options (`ENGINE=`, `AUTO_INCREMENT=`, `DEFAULT CHARSET=`, etc.) are stripped automatically. |
| MariaDB | MariaDB SQL | ✅ | Treated identically to MySQL. Same sanitizer and parser mode. |
| SQLite | SQLite SQL | ✅ | `WITHOUT ROWID` and `STRICT` clauses stripped. No `ALTER TABLE ADD FOREIGN KEY` — inline FK declarations only. |
| Google BigQuery | GoogleSQL | ✅ | DDL is converted to PostgreSQL-compatible syntax before parsing. See details below. |
| Snowflake | Snowflake SQL | ✅ | Standard types (`NUMBER`, `VARCHAR`, `TIMESTAMP_NTZ`, etc.) parse correctly. Select *Snowflake* in the dialect dropdown. |
| Amazon Redshift | Redshift SQL | ✅ | PostgreSQL-based syntax. Most Redshift DDL parses without modification. Select *Redshift* in the dialect dropdown. |
| IBM Db2 | Db2 SQL | ✅ | Standard SQL types work. Select *Db2* in the dialect dropdown. |
| Trino | Trino SQL | ✅ | Standard SQL syntax. Select *Trino* in the dialect dropdown. |
| Apache Hive | HiveQL | ✅ | Uses `STRING`, `INT`, `BIGINT`. `PARTITIONED BY` and storage clauses are stripped (non-table statements). |
| Apache Flink | FlinkSQL | ✅ | Similar to Hive syntax. Select *FlinkSQL* in the dialect dropdown. |

### BigQuery — What Gets Handled

The BigQuery sanitizer converts GoogleSQL DDL to PostgreSQL-compatible syntax, then parses it with the PostgreSQL parser. This enables full FK detection and constraint support.

| Feature | Handling |
|---------|---------|
| `INT64`, `FLOAT64`, `BOOL` | Converted to `BIGINT`, `FLOAT8`, `BOOLEAN` |
| `STRING` / `STRING(n)` | Converted to `TEXT` / `VARCHAR(n)` |
| `BYTES` / `BYTES(n)` | Converted to `BYTEA` |
| `DATETIME` | Converted to `TIMESTAMP` |
| `GEOGRAPHY`, `JSON` | Converted to `TEXT`, `JSONB` |
| `BIGNUMERIC` / `BIGNUMERIC(p,s)` | Converted to `NUMERIC` (precision dropped — out of PG range) |
| `NUMERIC(p,s)` | Preserved as-is (PostgreSQL handles it) |
| `DATE`, `TIME`, `TIMESTAMP`, `INTERVAL` | Unchanged — same in both dialects |
| `STRUCT<...>` | Simplified to `TEXT` (iterative, handles nesting) |
| `ARRAY<T>` | Converted to `T[]` (e.g. `ARRAY<INT64>` → `BIGINT[]`) |
| `ARRAY<STRUCT<...>>` | Converted to `TEXT[]` |
| `` `project.dataset.table` `` | Resolved to unqualified `"table"` name |
| `PRIMARY KEY (col) NOT ENFORCED` | `NOT ENFORCED` stripped — PK detected |
| `FOREIGN KEY ... NOT ENFORCED` | `NOT ENFORCED` stripped — **FK edges work** |
| Column-level `OPTIONS (...)` | Stripped |
| `PARTITION BY`, `CLUSTER BY`, table `OPTIONS` | Stripped (uses parenthesis depth tracking, not fragile `lastIndexOf`) |
| `IF NOT EXISTS` | Handled natively |

---

## Unsupported Dialects

These are not supported by `node-sql-parser` and will fail to parse.

| Database | Dialect | Status | Workaround |
|----------|---------|--------|------------|
| Microsoft SQL Server | T-SQL | ❌ | The library explicitly rejects MSSQL mode. Try selecting *PostgreSQL* — standard `CREATE TABLE` with `[bracket]` identifiers removed manually may parse for simple schemas. |
| Oracle Database | PL/SQL | ❌ | Not in the library. `NUMBER`, `VARCHAR2`, `SEQUENCE` etc. are not recognised. |
| DuckDB | DuckDB SQL | ❌ | Not supported by the library. DuckDB syntax is close to PostgreSQL — try selecting *PostgreSQL* for simple schemas. |
| Apache Spark SQL | Spark SQL | ❌ | Explicitly rejected by the library. |
| Databricks SQL | Databricks SQL | ❌ | Explicitly rejected (same engine as Spark). |
| ClickHouse | ClickHouse SQL | ❌ | Not in the library. ClickHouse-specific types (`UInt32`, `String`, etc.) are not recognised. |
| Teradata | Teradata SQL | ❌ | Not in the library. |
| SAP HANA | SAP HANA SQL | ❌ | Not in the library. |

---

## Dialect Dropdown Options

The app currently exposes these options in the dialect selector:

| Dropdown Label | Internal Value | Parser Mode |
|----------------|---------------|-------------|
| PostgreSQL | `postgresql` | `Postgresql` |
| MySQL | `mysql` | `MySQL` |
| MariaDB | `mariadb` | `MariaDB` |
| SQLite | `sqlite` | `SQLite` |
| SQL Server | `mssql` | *(sanitize only — `node-sql-parser` does not support MSSQL mode)* |
| BigQuery | `bigquery` | `Postgresql` *(DDL converted to PG syntax by sanitizer)* |

> **Note:** Snowflake, Redshift, Db2, Trino, Hive, and FlinkSQL are supported by the underlying parser but not yet exposed in the UI dropdown. They can be added to `DIALECT_LABELS` in `src/lib/ddl/detect-dialect.ts` and `SqlDialect` in `src/lib/types/diagram.ts`.

---

## How Auto-Detection Works

When you paste SQL or upload a file, the app inspects the content for dialect-specific markers:

| Marker | Detected As |
|--------|------------|
| Backtick `` `project.dataset.table` `` names, `STRUCT<>`, `ARRAY<>` | BigQuery |
| Backtick identifiers, `ENGINE=`, `AUTO_INCREMENT` | MySQL |
| `[bracket]` identifiers, `IDENTITY(`, `GO`, `NVARCHAR` | SQL Server |
| `AUTOINCREMENT`, `WITHOUT ROWID` | SQLite |
| None of the above | PostgreSQL (default) |

Auto-detection pre-selects the dialect dropdown and shows an **Auto-detected** badge. Choosing a dialect manually switches to **Custom** and persists `dialectUserOverride: true` on save so re-opened projects keep your choice. Use **Detect automatically** to re-run detection from the current SQL or uploaded files.
