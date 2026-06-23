import { mergeSqlFiles } from "@/lib/merge-sql-files";
import type { SqlDialect, SqlFileEntry } from "@/lib/types/diagram";

const DIALECT_DETECTION_SAMPLE_BYTES = 32_768;

export function detectDialect(sql: string): SqlDialect {
  const sample =
    sql.length > DIALECT_DETECTION_SAMPLE_BYTES
      ? sql.slice(0, DIALECT_DETECTION_SAMPLE_BYTES)
      : sql;

  // BigQuery: backtick project.dataset.table identifiers or STRUCT<>/ARRAY<> types
  if (
    /`[^`]+\.[^`]+\.[^`]+`/.test(sample) ||
    /\bSTRUCT\s*</i.test(sample) ||
    /\bARRAY\s*</i.test(sample)
  ) {
    return "bigquery";
  }

  // MySQL/MariaDB: backtick identifiers, ENGINE=, AUTO_INCREMENT (not SQLite's AUTOINCREMENT)
  if (/`/.test(sample) || /\bENGINE\s*=/i.test(sample) || /\bAUTO_INCREMENT\b/i.test(sample)) {
    return "mysql";
  }

  // MSSQL: bracket identifiers, IDENTITY(1,1) style, GO batch separator, or NVARCHAR
  // Exclude PostgreSQL "GENERATED ... AS IDENTITY" which also contains IDENTITY(
  if (
    /\[[A-Za-z_]\w*\]/.test(sample) ||
    /\bIDENTITY\s*\(\s*\d+/i.test(sample) ||
    /^GO\s*$/im.test(sample) ||
    /\bNVARCHAR\b/i.test(sample)
  ) {
    return "mssql";
  }

  // SQLite: AUTOINCREMENT (distinct from MySQL AUTO_INCREMENT), WITHOUT ROWID
  if (/\bAUTOINCREMENT\b/i.test(sample) || /\bWITHOUT\s+ROWID\b/i.test(sample)) {
    return "sqlite";
  }

  return "postgresql";
}

export function sqlForDialectDetection(sql: string, files: SqlFileEntry[]): string {
  if (files.length > 0) {
    return mergeSqlFiles(files);
  }
  return sql;
}

export function detectDialectFromInput(sql: string, files: SqlFileEntry[]): SqlDialect {
  return detectDialect(sqlForDialectDetection(sql, files));
}

export type DialectSource = "auto" | "manual";

export const DIALECT_LABELS: Record<SqlDialect, string> = {
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  mariadb: "MariaDB",
  sqlite: "SQLite",
  mssql: "SQL Server",
  bigquery: "BigQuery",
};
