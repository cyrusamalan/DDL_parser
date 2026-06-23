import { splitSqlStatements, type SanitizeDdlResult } from "./sanitize-postgres-ddl";
import {
  ensureTerminator,
  isAlterTableFkStatement,
  isCreateTableStatement,
  stripAfterColumnList,
  stripLeadingComments,
} from "./sanitize-dialect-helpers";

function convertDb2ToPg(statement: string): string {
  let r = statement;
  r = r.replace(
    /\s+GENERATED\s+ALWAYS\s+AS\s+IDENTITY\s*\(\s*START\s+WITH\s+\d+\s+INCREMENT\s+BY\s+\d+\s*\)/gi,
    "",
  );
  r = r.replace(/\bDEFAULT\s+CURRENT\s+TIMESTAMP\b/gi, "DEFAULT CURRENT_TIMESTAMP");
  r = r.replace(/\s+ON\s+DELETE\s+(?:CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION)\b/gi, "");
  r = r.replace(/\s+ON\s+UPDATE\s+(?:CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION)\b/gi, "");
  r = r.replace(/\)\s*IN\s+\w+/gi, ")");
  r = r.replace(/\)\s*ORGANIZE\s+BY\s+ROW\b/gi, ")");
  return r;
}

export function sanitizeDb2Ddl(input: string): SanitizeDdlResult {
  const statements = splitSqlStatements(input.trim());
  const kept: string[] = [];
  let removedCount = 0;
  let convertedCount = 0;

  for (const statement of statements) {
    const normalized = stripLeadingComments(statement);

    if (isCreateTableStatement(normalized)) {
      let sql = convertDb2ToPg(statement);
      sql = stripAfterColumnList(sql);
      if (sql !== statement) convertedCount++;
      kept.push(ensureTerminator(sql));
      continue;
    }

    if (isAlterTableFkStatement(normalized)) {
      kept.push(ensureTerminator(convertDb2ToPg(statement)));
      continue;
    }

    removedCount++;
  }

  const notes: string[] = [];
  if (convertedCount > 0) {
    notes.push(
      `Converted ${convertedCount} Db2 statement${convertedCount === 1 ? "" : "s"} (IDENTITY, tablespace, ORGANIZE BY ROW, FK actions).`,
    );
  }
  if (removedCount > 0) {
    notes.push(`Removed ${removedCount} non-table statement${removedCount === 1 ? "" : "s"} (views, indexes, etc.).`);
  }

  return { sql: kept.join("\n\n"), notes };
}
