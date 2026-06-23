import { splitSqlStatements, type SanitizeDdlResult } from "./sanitize-postgres-ddl.ts";

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

function normalizeBracketIdentifiers(statement: string): string {
  // Convert MSSQL/SQL-Server-style [identifier] to MySQL backtick identifiers.
  // Also strip schema prefixes like [dbo]. so `[dbo].[users]` becomes `users`.
  return statement
    .replace(/\[[^\]]*\]\.\s*/g, "")         // strip [schema]. prefixes
    .replace(/\[([^\]]+)\]/g, "`$1`");        // [name] → `name`
}

function ensureTerminator(stmt: string): string {
  const s = stmt.trim();
  return s.endsWith(";") ? s : `${s};`;
}

export function sanitizeMysqlDdl(input: string): SanitizeDdlResult {
  const statements = splitSqlStatements(input.trim());
  const kept: string[] = [];
  let removedCount = 0;
  let bracketCount = 0;

  for (const statement of statements) {
    const normalized = statement.trimStart().replace(/^--[^\n]*\n|^\/\*[\s\S]*?\*\//g, "").trimStart();

    if (isCreateTable(normalized)) {
      const stripped = stripTableOptions(statement);
      const hasBrackets = /\[/.test(stripped);
      const final = hasBrackets ? normalizeBracketIdentifiers(stripped) : stripped;
      if (hasBrackets) bracketCount++;
      kept.push(ensureTerminator(final));
      continue;
    }

    if (isAlterTableFk(normalized)) {
      const hasBrackets = /\[/.test(statement);
      const final = hasBrackets ? normalizeBracketIdentifiers(statement) : statement;
      if (hasBrackets) bracketCount++;
      kept.push(ensureTerminator(final));
      continue;
    }

    removedCount++;
  }

  const notes: string[] = [];
  if (bracketCount > 0) {
    notes.push(
      `Converted ${bracketCount} SQL Server-style [bracket] identifier${bracketCount === 1 ? "" : "s"} to MySQL backtick style.`,
    );
  }
  if (removedCount > 0) {
    notes.push(
      `Removed ${removedCount} non-table statement${removedCount === 1 ? "" : "s"} (indexes, views, procedures, etc.).`,
    );
  }

  return { sql: kept.join("\n\n"), notes };
}
