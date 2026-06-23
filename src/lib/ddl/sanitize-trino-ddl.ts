import { splitSqlStatements, type SanitizeDdlResult } from "./sanitize-postgres-ddl";
import {
  ensureTerminator,
  isCreateTableStatement,
  simplifyAngleBracketTypes,
  stripAfterColumnList,
  stripLeadingComments,
  stripParenClause,
  unqualifyDottedTableNames,
} from "./sanitize-dialect-helpers";

function convertTrinoTypes(sql: string): string {
  let r = sql;
  r = r.replace(/\bTIMESTAMP\s*\(\s*6\s*\)\s+WITH\s+TIME\s+ZONE\b/gi, "TIMESTAMPTZ");
  r = r.replace(/\bTIMESTAMP\s*\(\s*\d+\s*\)\s+WITH\s+TIME\s+ZONE\b/gi, "TIMESTAMPTZ");
  const { sql: simplified, count } = simplifyAngleBracketTypes(r);
  r = simplified;
  if (count > 0) {
    r = r.replace(/\bARRAY\s*\(/gi, "TEXT(");
    r = r.replace(/\bMAP\s*\(/gi, "TEXT(");
    r = r.replace(/\bROW\s*\(/gi, "TEXT(");
  }
  return r;
}

export function sanitizeTrinoDdl(input: string): SanitizeDdlResult {
  const statements = splitSqlStatements(input.trim());
  const kept: string[] = [];
  let removedCount = 0;
  let totalResolved = 0;
  let convertedCount = 0;

  for (const statement of statements) {
    const normalized = stripLeadingComments(statement);

    if (!isCreateTableStatement(normalized)) {
      removedCount++;
      continue;
    }

    let sql = statement;
    const { sql: sql1, resolved } = unqualifyDottedTableNames(sql);
    sql = sql1;
    totalResolved += resolved;

    sql = convertTrinoTypes(sql);
    sql = stripParenClause(sql, /\bWITH\s*\(/i);
    sql = stripAfterColumnList(sql);
    if (sql !== statement) convertedCount++;

    kept.push(ensureTerminator(sql));
  }

  const notes: string[] = [];
  if (removedCount > 0) {
    notes.push(`Removed ${removedCount} non-table statement${removedCount === 1 ? "" : "s"} (schemas, views, etc.).`);
  }
  if (totalResolved > 0) {
    notes.push(
      `Resolved ${totalResolved} catalog.schema.table name${totalResolved === 1 ? "" : "s"} to unqualified table names.`,
    );
  }
  if (convertedCount > 0) {
    notes.push("Converted Trino types (ARRAY/MAP/ROW, TIMESTAMP WITH TIME ZONE) for parsing.");
  }

  return { sql: kept.join("\n\n"), notes };
}
