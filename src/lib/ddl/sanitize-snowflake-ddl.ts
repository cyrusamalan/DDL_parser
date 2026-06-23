import { splitSqlStatements, type SanitizeDdlResult } from "./sanitize-postgres-ddl.ts";
import {
  ensureTerminator,
  isAlterTableFkStatement,
  isCreateTableStatement,
  stripAfterColumnList,
  stripLeadingComments,
} from "./sanitize-dialect-helpers.ts";

function convertSnowflakeTypes(sql: string): string {
  let r = sql;
  r = r.replace(/\bTIMESTAMP_NTZ\b/gi, "TIMESTAMP");
  r = r.replace(/\bVARIANT\b/gi, "TEXT");
  r = r.replace(/\bARRAY\b/gi, "TEXT");
  r = r.replace(/\bNUMBER\s*\(\s*\d+\s*,\s*\d+\s*\)/gi, "NUMERIC");
  r = r.replace(/\bNUMBER\b/gi, "BIGINT");
  r = r.replace(/\s+AUTOINCREMENT\b/gi, "");
  r = r.replace(/\bDEFAULT\s+\w+\.NEXTVAL\b/gi, "");
  return r;
}

function stripSnowflakeTableClauses(sql: string): string {
  let r = stripAfterColumnList(sql);
  r = r.replace(/\)\s*CLUSTER\s+BY\s*\([^)]*\)/gi, ")");
  r = r.replace(/\)\s*DATA_RETENTION_TIME_IN_DAYS\s*=\s*\d+/gi, ")");
  r = r.replace(/\)\s*COMMENT\s*=\s*'[^']*'/gi, ")");
  return r;
}

export function sanitizeSnowflakeDdl(input: string): SanitizeDdlResult {
  const statements = splitSqlStatements(input.trim());
  const kept: string[] = [];
  let removedCount = 0;
  let convertedCount = 0;

  for (const statement of statements) {
    const normalized = stripLeadingComments(statement);

    if (isCreateTableStatement(normalized)) {
      let sql = convertSnowflakeTypes(statement);
      sql = stripSnowflakeTableClauses(sql);
      if (sql !== statement) convertedCount++;
      kept.push(ensureTerminator(sql));
      continue;
    }

    if (isAlterTableFkStatement(normalized)) {
      kept.push(ensureTerminator(convertSnowflakeTypes(statement)));
      continue;
    }

    removedCount++;
  }

  const notes: string[] = [];
  if (convertedCount > 0) {
    notes.push(
      `Converted ${convertedCount} Snowflake statement${convertedCount === 1 ? "" : "s"} (NUMBER, TIMESTAMP_NTZ, VARIANT/ARRAY, AUTOINCREMENT, CLUSTER BY, etc.).`,
    );
  }
  if (removedCount > 0) {
    notes.push(
      `Removed ${removedCount} non-table statement${removedCount === 1 ? "" : "s"} (sequences, views, streams, indexes, etc.).`,
    );
  }

  return { sql: kept.join("\n\n"), notes };
}
