import { splitSqlStatements, type SanitizeDdlResult } from "./sanitize-postgres-ddl.ts";

// Resolve `project.dataset.table` or `table` backtick names to double-quoted identifiers.
// BigQuery requires backticks for multi-part names; we extract just the table portion.
function resolveBacktickNames(sql: string): { sql: string; resolved: number } {
  let resolved = 0;
  const result = sql.replace(/`([^`]+)`/g, (_, inner: string) => {
    const parts = inner.split(".");
    const name = parts[parts.length - 1];
    if (parts.length > 1) resolved++;
    return `"${name}"`;
  });
  return { sql: result, resolved };
}

// Iteratively simplify STRUCT<...> → TEXT and ARRAY<T> → T[] from the inside out.
function simplifyComplexTypes(sql: string): { sql: string; count: number } {
  let result = sql;
  let count = 0;

  // Collapse STRUCT<...> → TEXT, iterating until stable (handles nesting)
  let prev = "";
  while (prev !== result) {
    prev = result;
    result = result.replace(/\bSTRUCT\s*<[^<>]*>/gi, () => { count++; return "TEXT"; });
  }

  // ARRAY<T> → T[] (T is now a simple type after STRUCT collapse)
  result = result.replace(/\bARRAY\s*<([^<>]+)>/gi, (_, inner: string) => {
    count++;
    return `${inner.trim()}[]`;
  });

  return { sql: result, count };
}

// Convert BigQuery-specific types to PostgreSQL equivalents so the PG parser can process them.
function convertTypes(sql: string): { sql: string; converted: boolean } {
  const original = sql;
  let result = sql;

  // BIGNUMERIC (handle before NUMERIC to avoid prefix issues); strip precision — PG NUMERIC handles it
  result = result.replace(/\bBIGNUMERIC\s*\(\s*\d+(?:\s*,\s*\d+)?\s*\)/gi, "NUMERIC");
  result = result.replace(/\bBIGNUMERIC\b/gi, "NUMERIC");

  result = result.replace(/\bINT64\b/g, "BIGINT");
  result = result.replace(/\bFLOAT64\b/g, "FLOAT8");
  result = result.replace(/\bBOOL\b/g, "BOOLEAN");

  // STRING(n) → VARCHAR(n), STRING → TEXT
  result = result.replace(/\bSTRING\s*\(([^)]+)\)/gi, (_, n) => `VARCHAR(${n})`);
  result = result.replace(/\bSTRING\b/gi, "TEXT");

  // BYTES(n) → BYTEA (PG BYTEA has no length param)
  result = result.replace(/\bBYTES\s*\([^)]*\)/gi, "BYTEA");
  result = result.replace(/\bBYTES\b/gi, "BYTEA");

  // DATETIME → TIMESTAMP (BigQuery DATETIME has no timezone, same as PG TIMESTAMP)
  result = result.replace(/\bDATETIME\b/gi, "TIMESTAMP");

  result = result.replace(/\bGEOGRAPHY\b/gi, "TEXT");
  result = result.replace(/\bJSON\b/gi, "JSONB");

  // DATE, TIME, TIMESTAMP, NUMERIC, INTERVAL stay the same as in PostgreSQL

  return { sql: result, converted: result !== original };
}

// Strip column-level OPTIONS (...) which the PG parser doesn't understand.
function stripColumnOptions(sql: string): string {
  // OPTIONS values are simple key=value pairs with no nested parens in practice
  return sql.replace(/\bOPTIONS\s*\([^)]*\)/gi, "");
}

// Strip NOT ENFORCED from PRIMARY KEY / FOREIGN KEY constraints.
function stripNotEnforced(sql: string): string {
  return sql.replace(/\bNOT\s+ENFORCED\b/gi, "");
}

// Use parenthesis depth to find the index of the column list's closing ).
// This is needed because BigQuery adds clauses after the column list that contain parens
// (e.g., PARTITION BY DATE(created_at)) which break the simpler lastIndexOf(")") approach.
function findColumnListEnd(sql: string): number {
  const match = sql.match(
    /^CREATE\s+(?:OR\s+REPLACE\s+)?(?:TEMP(?:ORARY)?\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`[^`]*`|"[^"]*"|\S+)\s*\(/i,
  );
  if (!match) return -1;

  let depth = 1;
  let i = match[0].length;
  while (i < sql.length) {
    if (sql[i] === "(") depth++;
    else if (sql[i] === ")") {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

// Strip PARTITION BY, CLUSTER BY, OPTIONS, and any other clauses that follow the column list.
function stripTableLevelClauses(sql: string): string {
  const end = findColumnListEnd(sql);
  if (end === -1) return sql;
  return sql.slice(0, end + 1);
}

function ensureTerminator(stmt: string): string {
  const s = stmt.trim();
  return s.endsWith(";") ? s : `${s};`;
}

export function sanitizeBigQueryDdl(input: string): SanitizeDdlResult {
  const statements = splitSqlStatements(input.trim());
  const kept: string[] = [];
  let removedCount = 0;
  let totalResolved = 0;
  let totalComplexTypes = 0;
  let anyTypeConverted = false;

  for (const statement of statements) {
    const normalized = statement
      .trimStart()
      .replace(/^--[^\n]*\n|^\/\*[\s\S]*?\*\//g, "")
      .trimStart();

    const isCreateTable =
      /^CREATE\s+(?:OR\s+REPLACE\s+)?(?:TEMP(?:ORARY)?\s+)?TABLE\b/i.test(normalized) &&
      !/\bAS\s+SELECT\b/i.test(normalized);

    const isAlterTableFk =
      /^ALTER\s+TABLE\b/i.test(normalized) && /\bFOREIGN\s+KEY\b/i.test(normalized);

    if (!isCreateTable && !isAlterTableFk) {
      removedCount++;
      continue;
    }

    let sql = statement;

    const { sql: sql1, resolved } = resolveBacktickNames(sql);
    sql = sql1;
    totalResolved += resolved;

    sql = stripNotEnforced(sql);

    const { sql: sql2, count: complexCount } = simplifyComplexTypes(sql);
    sql = sql2;
    totalComplexTypes += complexCount;

    const { sql: sql3, converted } = convertTypes(sql);
    sql = sql3;
    if (converted) anyTypeConverted = true;

    sql = stripColumnOptions(sql);

    if (isCreateTable) {
      sql = stripTableLevelClauses(sql);
    }

    kept.push(ensureTerminator(sql));
  }

  const notes: string[] = [];
  if (removedCount > 0) {
    notes.push(
      `Removed ${removedCount} non-table statement${removedCount === 1 ? "" : "s"}.`,
    );
  }
  if (totalResolved > 0) {
    notes.push(
      `Resolved ${totalResolved} multi-part table name${totalResolved === 1 ? "" : "s"} (e.g. project.dataset.table) to unqualified names.`,
    );
  }
  if (totalComplexTypes > 0) {
    notes.push(
      `Simplified ${totalComplexTypes} STRUCT/ARRAY type${totalComplexTypes === 1 ? "" : "s"} to TEXT equivalents.`,
    );
  }
  if (anyTypeConverted) {
    notes.push("Converted BigQuery-specific types to PostgreSQL equivalents for parsing.");
  }

  return { sql: kept.join("\n\n"), notes };
}
