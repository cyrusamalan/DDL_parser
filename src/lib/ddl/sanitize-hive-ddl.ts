import { splitSqlStatements, type SanitizeDdlResult } from "./sanitize-postgres-ddl";
import {
  ensureTerminator,
  isAlterTableFkStatement,
  isCreateTableStatement,
  simplifyAngleBracketTypes,
  stripAfterColumnList,
  stripLeadingComments,
} from "./sanitize-dialect-helpers";

function convertHiveTypes(sql: string): string {
  let r = sql;
  r = r.replace(/\bSTRING\b/gi, "TEXT");
  const { sql: simplified } = simplifyAngleBracketTypes(r);
  r = simplified;
  r = r.replace(/\bDISABLE\s+NOVALIDATE(?:\s+RELY)?\b/gi, "");
  return r;
}

function stripHiveTableClauses(sql: string): string {
  let r = stripAfterColumnList(sql);
  r = r.replace(/\)\s*COMMENT\s+'[^']*'/gi, ")");
  r = r.replace(/\)\s*PARTITIONED\s+BY\s*\([^)]*\)/gi, ")");
  r = r.replace(/\)\s*CLUSTERED\s+BY\s*\([^)]*\)\s+INTO\s+\d+\s+BUCKETS/gi, ")");
  r = r.replace(/\)\s*STORED\s+AS\s+(?:ORC|PARQUET|AVRO|TEXTFILE)\b/gi, ")");
  r = r.replace(/\)\s*TBLPROPERTIES\s*\([^)]*\)/gi, ")");
  return r;
}

export function sanitizeHiveDdl(input: string): SanitizeDdlResult {
  const statements = splitSqlStatements(input.trim());
  const kept: string[] = [];
  let removedCount = 0;
  let convertedCount = 0;

  for (const statement of statements) {
    const normalized = stripLeadingComments(statement);

    if (isCreateTableStatement(normalized)) {
      let sql = convertHiveTypes(statement);
      sql = stripHiveTableClauses(sql);
      if (sql !== statement) convertedCount++;
      kept.push(ensureTerminator(sql));
      continue;
    }

    if (isAlterTableFkStatement(normalized)) {
      kept.push(ensureTerminator(convertHiveTypes(statement)));
      continue;
    }

    removedCount++;
  }

  const notes: string[] = [];
  if (convertedCount > 0) {
    notes.push(
      `Converted ${convertedCount} Hive statement${convertedCount === 1 ? "" : "s"} (STRING, ARRAY/MAP/STRUCT, storage clauses, DISABLE NOVALIDATE).`,
    );
  }
  if (removedCount > 0) {
    notes.push(`Removed ${removedCount} non-table statement${removedCount === 1 ? "" : "s"} (views, indexes, etc.).`);
  }

  return { sql: kept.join("\n\n"), notes };
}
