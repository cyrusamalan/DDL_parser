import { splitSqlStatements, type SanitizeDdlResult } from "./sanitize-postgres-ddl";

function isCreateTable(stmt: string): boolean {
  return (
    /^CREATE\s+(?:OR\s+REPLACE\s+)?(?:TEMPORARY\s+)?TABLE\b/i.test(stmt) &&
    !/^CREATE\s+(?:OR\s+REPLACE\s+)?(?:TEMPORARY\s+)?TABLE\s+\S+\s+AS\s+SELECT\b/i.test(stmt)
  );
}

function isAlterTableFk(stmt: string): boolean {
  return /^ALTER\s+TABLE\b/i.test(stmt) && /\bFOREIGN\s+KEY\b/i.test(stmt);
}

function stripTableOptions(statement: string): string {
  // MySQL table options (ENGINE=, CHARSET=, etc.) follow the column list's closing ).
  // The last ) in the statement is always the column list's closer.
  const lastParen = statement.lastIndexOf(")");
  if (lastParen === -1) return statement;
  return statement.slice(0, lastParen + 1);
}

function ensureTerminator(stmt: string): string {
  const s = stmt.trim();
  return s.endsWith(";") ? s : `${s};`;
}

export function sanitizeMysqlDdl(input: string): SanitizeDdlResult {
  const statements = splitSqlStatements(input.trim());
  const kept: string[] = [];
  let removedCount = 0;

  for (const statement of statements) {
    const normalized = statement.trimStart().replace(/^--[^\n]*\n|^\/\*[\s\S]*?\*\//g, "").trimStart();

    if (isCreateTable(normalized)) {
      kept.push(ensureTerminator(stripTableOptions(statement)));
      continue;
    }

    if (isAlterTableFk(normalized)) {
      kept.push(ensureTerminator(statement));
      continue;
    }

    removedCount++;
  }

  const notes: string[] = [];
  if (removedCount > 0) {
    notes.push(
      `Removed ${removedCount} non-table statement${removedCount === 1 ? "" : "s"} (indexes, views, procedures, etc.).`,
    );
  }

  return { sql: kept.join("\n\n"), notes };
}
