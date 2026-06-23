import { splitSqlStatements, type SanitizeDdlResult } from "./sanitize-postgres-ddl";

function stripTableOptions(statement: string): string {
  // MSSQL table options (ON [filegroup], TEXTIMAGE_ON, etc.) follow the column list's closing ).
  const lastParen = statement.lastIndexOf(")");
  if (lastParen === -1) return statement;
  return statement.slice(0, lastParen + 1);
}

function ensureTerminator(stmt: string): string {
  const s = stmt.trim();
  return s.endsWith(";") ? s : `${s};`;
}

export function sanitizeMssqlDdl(input: string): SanitizeDdlResult {
  // Strip GO batch separators before splitting on ;
  const withoutGo = input.replace(/^GO\s*$/gim, "");

  const statements = splitSqlStatements(withoutGo.trim());
  const kept: string[] = [];
  let removedCount = 0;

  for (const statement of statements) {
    const normalized = statement.trimStart().replace(/^--[^\n]*\n|^\/\*[\s\S]*?\*\//g, "").trimStart();

    const isCreateTable = /^CREATE\s+TABLE\b/i.test(normalized);
    const isAlterTableFk = /^ALTER\s+TABLE\b/i.test(normalized) && /\bFOREIGN\s+KEY\b/i.test(normalized);

    if (isCreateTable) {
      kept.push(ensureTerminator(stripTableOptions(statement)));
      continue;
    }

    if (isAlterTableFk) {
      kept.push(ensureTerminator(statement));
      continue;
    }

    removedCount++;
  }

  const notes: string[] = [];
  if (removedCount > 0) {
    notes.push(
      `Removed ${removedCount} non-table statement${removedCount === 1 ? "" : "s"} (indexes, procedures, GO separators, etc.).`,
    );
  }

  return { sql: kept.join("\n\n"), notes };
}
