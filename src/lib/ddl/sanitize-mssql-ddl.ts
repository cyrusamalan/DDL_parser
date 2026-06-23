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

function convertMssqlToPg(statement: string): string {
  let r = statement;
  // Schema-qualified bracket identifiers: [schema].[name] → "name"
  r = r.replace(/\[[^\]]+\]\.\s*\[([^\]]+)\]/g, '"$1"');
  // Remaining bracket identifiers: [name] → "name"
  r = r.replace(/\[([^\]]+)\]/g, '"$1"');
  // Remove IDENTITY(n,n) — PostgreSQL uses SERIAL/GENERATED ALWAYS, but for parsing we just drop it
  r = r.replace(/\s+IDENTITY\s*\(\s*\d+\s*,\s*\d+\s*\)/gi, "");
  // MSSQL string types → PostgreSQL equivalents
  r = r.replace(/\bNVARCHAR\s*\(\s*MAX\s*\)/gi, "TEXT");
  r = r.replace(/\bVARCHAR\s*\(\s*MAX\s*\)/gi, "TEXT");
  r = r.replace(/\bNVARCHAR\b/gi, "VARCHAR");
  r = r.replace(/\bNTEXT\b/gi, "TEXT");
  // MSSQL date/time types → PostgreSQL
  r = r.replace(/\bDATETIMEOFFSET\b/gi, "TIMESTAMPTZ");
  r = r.replace(/\bDATETIME2\b/gi, "TIMESTAMP");
  r = r.replace(/\bDATETIME\b/gi, "TIMESTAMP");
  r = r.replace(/\bSMALLDATETIME\b/gi, "TIMESTAMP");
  // MSSQL functions → PostgreSQL equivalents
  r = r.replace(/\bGETDATE\s*\(\s*\)/gi, "CURRENT_TIMESTAMP");
  r = r.replace(/\bGETUTCDATE\s*\(\s*\)/gi, "CURRENT_TIMESTAMP");
  r = r.replace(/\bSYSDATETIME\s*\(\s*\)/gi, "CURRENT_TIMESTAMP");
  // Remove CLUSTERED / NONCLUSTERED from PRIMARY KEY and UNIQUE constraints
  r = r.replace(/\b(PRIMARY\s+KEY|UNIQUE)\s+(?:NON)?CLUSTERED\b/gi, "$1");
  // Strip ASC/DESC ordering hints inside constraint column lists (before ) or ,)
  r = r.replace(/\s+(?:ASC|DESC)\s*(?=[,)])/gi, "");
  return r;
}

export function sanitizeMssqlDdl(input: string): SanitizeDdlResult {
  // Strip GO batch separators before splitting on ;
  const withoutGo = input.replace(/^GO\s*$/gim, "");

  const statements = splitSqlStatements(withoutGo.trim());
  const kept: string[] = [];
  let removedCount = 0;
  let convertedCount = 0;

  for (const statement of statements) {
    const normalized = statement.trimStart().replace(/^--[^\n]*\n|^\/\*[\s\S]*?\*\//g, "").trimStart();

    const isCreateTable = /^CREATE\s+TABLE\b/i.test(normalized);
    const isAlterTableFk = /^ALTER\s+TABLE\b/i.test(normalized) && /\bFOREIGN\s+KEY\b/i.test(normalized);

    if (isCreateTable) {
      const stripped = stripTableOptions(statement);
      const converted = convertMssqlToPg(stripped);
      if (converted !== stripped) convertedCount++;
      kept.push(ensureTerminator(converted));
      continue;
    }

    if (isAlterTableFk) {
      const converted = convertMssqlToPg(statement);
      if (converted !== statement) convertedCount++;
      kept.push(ensureTerminator(converted));
      continue;
    }

    removedCount++;
  }

  const notes: string[] = [];
  if (convertedCount > 0) {
    notes.push(
      `Converted ${convertedCount} SQL Server statement${convertedCount === 1 ? "" : "s"} to PostgreSQL-compatible syntax ([brackets] → "quotes", NVARCHAR → VARCHAR, IDENTITY removed, etc.).`,
    );
  }
  if (removedCount > 0) {
    notes.push(
      `Removed ${removedCount} non-table statement${removedCount === 1 ? "" : "s"} (indexes, procedures, GO separators, etc.).`,
    );
  }

  return { sql: kept.join("\n\n"), notes };
}
