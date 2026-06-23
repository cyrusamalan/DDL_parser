import { splitSqlStatements, type SanitizeDdlResult } from "./sanitize-postgres-ddl.ts";

function stripTableOptions(statement: string): string {
  // SQLite table options (WITHOUT ROWID, STRICT) follow the column list's closing ).
  const lastParen = statement.lastIndexOf(")");
  if (lastParen === -1) return statement;
  return statement.slice(0, lastParen + 1);
}

function ensureTerminator(stmt: string): string {
  const s = stmt.trim();
  return s.endsWith(";") ? s : `${s};`;
}

export function sanitizeSqliteDdl(input: string): SanitizeDdlResult {
  const statements = splitSqlStatements(input.trim());
  const kept: string[] = [];
  let removedCount = 0;

  for (const statement of statements) {
    const normalized = statement.trimStart().replace(/^--[^\n]*\n|^\/\*[\s\S]*?\*\//g, "").trimStart();

    const isCreateTable =
      /^CREATE\s+(?:TEMP(?:ORARY)?\s+)?TABLE\b/i.test(normalized) &&
      !/^CREATE\s+(?:TEMP(?:ORARY)?\s+)?TABLE\s+\S+\s+AS\s+SELECT\b/i.test(normalized);

    if (isCreateTable) {
      kept.push(ensureTerminator(stripTableOptions(statement)));
      continue;
    }

    removedCount++;
  }

  const notes: string[] = [];
  if (removedCount > 0) {
    notes.push(
      `Removed ${removedCount} non-table statement${removedCount === 1 ? "" : "s"}.`,
    );
  }

  return { sql: kept.join("\n\n"), notes };
}
