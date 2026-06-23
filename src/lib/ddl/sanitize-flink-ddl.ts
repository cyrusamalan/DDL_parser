import { splitSqlStatements, type SanitizeDdlResult } from "./sanitize-postgres-ddl.ts";
import {
  ensureTerminator,
  isAlterTableFkStatement,
  isCreateTableStatement,
  stripAfterColumnList,
  stripLeadingComments,
  stripParenClause,
} from "./sanitize-dialect-helpers.ts";

function convertFlinkTypes(sql: string): string {
  let r = sql;
  r = r.replace(/\bSTRING\b/gi, "VARCHAR");
  r = r.replace(/\bTIMESTAMP_LTZ\s*\(\s*\d+\s*\)/gi, "TIMESTAMP");
  r = r.replace(/\bTIMESTAMP\s*\(\s*\d+\s*\)/gi, "TIMESTAMP");
  r = r.replace(/\bARRAY\s*<[^>]+>/gi, "TEXT");
  r = r.replace(/\bNOT\s+ENFORCED\b/gi, "");
  return r;
}

function stripFlinkComputedColumns(sql: string): string {
  let r = sql;
  r = r.replace(/,\s*\w+\s+AS\s+CAST\s*\([^)]*\)\s*,?\s*WATERMARK\s+FOR\s+\w+\s+AS\s+[^,)]+/gi, "");
  r = r.replace(/,\s*\w+\s+AS\s+PROCTIME\s*\(\s*\)/gi, "");
  r = r.replace(/,\s*WATERMARK\s+FOR\s+\w+\s+AS\s+[^,)]+/gi, "");
  r = r.replace(/^\s*\w+\s+AS\s+[^,]+,\s*/gim, "");
  return r;
}

export function sanitizeFlinkDdl(input: string): SanitizeDdlResult {
  const statements = splitSqlStatements(input.trim());
  const kept: string[] = [];
  let removedCount = 0;
  let convertedCount = 0;

  for (const statement of statements) {
    const normalized = stripLeadingComments(statement);

    if (isCreateTableStatement(normalized)) {
      let sql = stripFlinkComputedColumns(statement);
      sql = convertFlinkTypes(sql);
      sql = stripParenClause(sql, /\bWITH\s*\(/i);
      sql = stripAfterColumnList(sql);
      if (sql !== statement) convertedCount++;
      kept.push(ensureTerminator(sql));
      continue;
    }

    if (isAlterTableFkStatement(normalized)) {
      kept.push(ensureTerminator(convertFlinkTypes(statement)));
      continue;
    }

    removedCount++;
  }

  const notes: string[] = [];
  if (convertedCount > 0) {
    notes.push(
      `Converted ${convertedCount} Flink statement${convertedCount === 1 ? "" : "s"} (WATERMARK, computed columns, WITH connector, NOT ENFORCED).`,
    );
  }
  if (removedCount > 0) {
    notes.push(`Removed ${removedCount} non-table statement${removedCount === 1 ? "" : "s"} (views, etc.).`);
  }

  return { sql: kept.join("\n\n"), notes };
}
