export type SanitizeDdlResult = {
  sql: string;
  notes: string[];
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripLeadingComments(sql: string): string {
  let rest = sql.trimStart();
  while (true) {
    if (rest.startsWith("--")) {
      const newline = rest.indexOf("\n");
      rest = newline === -1 ? "" : rest.slice(newline + 1).trimStart();
      continue;
    }
    if (rest.startsWith("/*")) {
      const end = rest.indexOf("*/");
      rest = end === -1 ? "" : rest.slice(end + 2).trimStart();
      continue;
    }
    break;
  }
  return rest;
}

export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let index = 0;
  let inSingleQuote = false;
  let dollarTag: string | null = null;

  while (index < sql.length) {
    const rest = sql.slice(index);

    if (!inSingleQuote && !dollarTag && rest.startsWith("--")) {
      const newline = rest.indexOf("\n");
      const comment = newline === -1 ? rest : rest.slice(0, newline + 1);
      current += comment;
      index += comment.length;
      continue;
    }

    if (!inSingleQuote && !dollarTag && rest.startsWith("/*")) {
      const end = rest.indexOf("*/", 2);
      const comment = end === -1 ? rest : rest.slice(0, end + 2);
      current += comment;
      index += comment.length;
      continue;
    }

    if (!inSingleQuote) {
      const dollarMatch = rest.match(/^(\$[A-Za-z0-9_]*\$)/);
      if (dollarMatch) {
        const tag = dollarMatch[1];
        if (dollarTag === null) {
          dollarTag = tag;
        } else if (dollarTag === tag) {
          dollarTag = null;
        }
        current += tag;
        index += tag.length;
        continue;
      }
    }

    const char = sql[index];
    if (!dollarTag && char === "'") {
      if (inSingleQuote && sql[index + 1] === "'") {
        current += "''";
        index += 2;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      current += char;
      index++;
      continue;
    }

    if (char === ";" && !inSingleQuote && !dollarTag) {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = "";
      index++;
      continue;
    }

    current += char;
    index++;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

function collectEnumTypeNames(statements: string[]): Set<string> {
  const enumTypes = new Set<string>();
  // Match CREATE TYPE ... AS ENUM anywhere in the statement text, not just at
  // the start: enum types are commonly wrapped in guarded `DO $$ BEGIN CREATE
  // TYPE ... EXCEPTION WHEN duplicate_object ... END $$` blocks for idempotency.
  const enumPattern =
    /\bCREATE\s+TYPE\s+(?:([\w"]+)\.)?(?:([\w"]+)|"([^"]+)")\s+AS\s+ENUM\b/gi;

  for (const statement of statements) {
    for (const match of statement.matchAll(enumPattern)) {
      const typeName = (match[3] ?? match[2] ?? "").replace(/^"|"$/g, "");
      if (typeName) enumTypes.add(typeName);
    }
  }

  return enumTypes;
}

type StatementKind = "create_table" | "alter_table_fk" | "other";

function getStatementKind(statement: string): StatementKind {
  const normalized = stripLeadingComments(statement);

  if (
    /^CREATE\s+(?:OR\s+REPLACE\s+)?(?:TEMP(?:ORARY)?\s+|UNLOGGED\s+)?TABLE\b/i.test(
      normalized,
    )
  ) {
    if (
      /^CREATE\s+(?:OR\s+REPLACE\s+)?(?:TEMP(?:ORARY)?\s+|UNLOGGED\s+)?TABLE\s+\S+\s+AS\s+SELECT\b/i.test(
        normalized,
      )
    ) {
      return "other";
    }
    return "create_table";
  }

  if (/^ALTER\s+TABLE\b/i.test(normalized) && /\bFOREIGN\s+KEY\b/i.test(normalized)) {
    return "alter_table_fk";
  }

  return "other";
}

function ensureStatementTerminator(statement: string): string {
  const trimmed = statement.trim();
  if (!trimmed) return trimmed;
  return trimmed.endsWith(";") ? trimmed : `${trimmed};`;
}

// Identifiers that node-sql-parser treats as keywords when used as schema-qualified tables.
const RESERVED_TABLE_IDENTIFIERS = new Set([
  "order",
  "group",
  "end",
  "select",
  "table",
  "where",
  "from",
  "join",
  "union",
  "having",
  "limit",
  "offset",
  "insert",
  "update",
  "delete",
  "with",
  "window",
  "partition",
  "inner",
  "outer",
  "left",
  "right",
  "full",
  "using",
  "case",
  "when",
  "then",
  "else",
]);

function quoteReservedTableIdentifiers(sql: string): { sql: string; quotedCount: number } {
  let quotedCount = 0;

  let result = sql.replace(
    /\bCREATE\s+TABLE\s+([\w]+)\.([\w]+)\b/gi,
    (match, schema: string, table: string) => {
      if (!RESERVED_TABLE_IDENTIFIERS.has(table.toLowerCase())) return match;
      quotedCount++;
      return `CREATE TABLE ${schema}."${table}"`;
    },
  );

  result = result.replace(
    /\bREFERENCES\s+([\w]+)\.([\w]+)(?=\s*\()/gi,
    (match, schema: string, table: string) => {
      if (!RESERVED_TABLE_IDENTIFIERS.has(table.toLowerCase())) return match;
      quotedCount++;
      return `REFERENCES ${schema}."${table}"`;
    },
  );

  result = result.replace(/\bCREATE\s+TABLE\s+([\w]+)(?=\s*\()/gi, (match, table: string) => {
    if (!RESERVED_TABLE_IDENTIFIERS.has(table.toLowerCase())) return match;
    quotedCount++;
    return `CREATE TABLE "${table}"`;
  });

  return { sql: result, quotedCount };
}

function sanitizeCreateTableStatement(
  statement: string,
  enumTypes: Set<string>,
): {
  sql: string;
  enumReplacements: number;
  uniqueNullsFixes: number;
  enumCastFixes: number;
  unsupportedArrayFixes: number;
  identityAlwaysFixes: number;
  reservedTableQuotes: number;
} {
  let sql = statement;
  const uniqueMatches = sql.match(/\bUNIQUE\s+NULLS\s+NOT\s+DISTINCT\b/gi) ?? [];
  const uniqueNullsFixes = uniqueMatches.length;
  sql = sql.replace(/\bUNIQUE\s+NULLS\s+NOT\s+DISTINCT\b/gi, "UNIQUE");

  // node-sql-parser accepts GENERATED BY DEFAULT AS IDENTITY but not
  // GENERATED ALWAYS AS IDENTITY. The distinction is irrelevant to the ERD, so
  // normalize ALWAYS to BY DEFAULT to keep the column parseable.
  const identityMatches = sql.match(/\bGENERATED\s+ALWAYS\s+AS\s+IDENTITY\b/gi) ?? [];
  const identityAlwaysFixes = identityMatches.length;
  sql = sql.replace(/\bGENERATED\s+ALWAYS\s+AS\s+IDENTITY\b/gi, "GENERATED BY DEFAULT AS IDENTITY");

  let enumReplacements = 0;
  let enumCastFixes = 0;

  for (const enumName of enumTypes) {
    const escaped = escapeRegExp(enumName);

    const castPattern = new RegExp(`::\\s*(?:[\\w]+\\.)?${escaped}\\b`, "gi");
    const castMatches = sql.match(castPattern) ?? [];
    enumCastFixes += castMatches.length;
    sql = sql.replace(castPattern, "");

    const arrayPattern = new RegExp(
      `(^|[,(\\n]\\s*)(\\w+)\\s+(?:[\\w]+\\.)?(${escaped})(\\[\\])`,
      "gim",
    );
    sql = sql.replace(arrayPattern, (_match, prefix: string, column: string) => {
      enumReplacements++;
      return `${prefix}${column} TEXT[]`;
    });

    const columnPattern = new RegExp(
      `(^|[,(\\n]\\s*)(\\w+)\\s+(?:[\\w]+\\.)?(${escaped})(?=\\s*(?:NOT\\s+NULL|NULL|DEFAULT|PRIMARY|UNIQUE|REFERENCES|CHECK|,|\\)|$))`,
      "gim",
    );
    sql = sql.replace(columnPattern, (_match, prefix: string, column: string) => {
      enumReplacements++;
      return `${prefix}${column} TEXT`;
    });
  }

  const unsupportedArrayPattern = /\b(UUID|JSONB)\s*\[\]/gi;
  const unsupportedArrayFixes = (sql.match(unsupportedArrayPattern) ?? []).length;
  sql = sql.replace(unsupportedArrayPattern, "TEXT");

  const { sql: quotedSql, quotedCount: reservedTableQuotes } = quoteReservedTableIdentifiers(sql);
  sql = quotedSql;

  return {
    sql,
    enumReplacements,
    uniqueNullsFixes,
    enumCastFixes,
    unsupportedArrayFixes,
    identityAlwaysFixes,
    reservedTableQuotes,
  };
}

export function sanitizePostgresDdl(input: string): SanitizeDdlResult {
  const statements = splitSqlStatements(input.trim());
  if (statements.length === 0) {
    return { sql: "", notes: [] };
  }

  const enumTypes = collectEnumTypeNames(statements);
  const kept: string[] = [];
  let removedCount = 0;
  let enumReplacements = 0;
  let uniqueNullsFixes = 0;
  let enumCastFixes = 0;
  let unsupportedArrayFixes = 0;
  let identityAlwaysFixes = 0;
  let reservedTableQuotes = 0;

  for (const statement of statements) {
    const kind = getStatementKind(statement);

    if (kind === "create_table") {
      const sanitized = sanitizeCreateTableStatement(statement, enumTypes);
      kept.push(ensureStatementTerminator(sanitized.sql));
      enumReplacements += sanitized.enumReplacements;
      uniqueNullsFixes += sanitized.uniqueNullsFixes;
      enumCastFixes += sanitized.enumCastFixes;
      unsupportedArrayFixes += sanitized.unsupportedArrayFixes;
      identityAlwaysFixes += sanitized.identityAlwaysFixes;
      reservedTableQuotes += sanitized.reservedTableQuotes;
      continue;
    }

    if (kind === "alter_table_fk") {
      const { sql: quotedSql, quotedCount } = quoteReservedTableIdentifiers(statement);
      reservedTableQuotes += quotedCount;
      kept.push(ensureStatementTerminator(quotedSql));
      continue;
    }

    removedCount++;
  }

  const notes: string[] = [];
  if (removedCount > 0) {
    notes.push(
      `Removed ${removedCount} non-table statement${removedCount === 1 ? "" : "s"} (DROP, indexes, functions, types, etc.).`,
    );
  }
  if (enumReplacements > 0) {
    notes.push(
      `Replaced ${enumReplacements} custom enum column${enumReplacements === 1 ? "" : "s"} with TEXT.`,
    );
  }
  if (enumCastFixes > 0) {
    notes.push(`Stripped ${enumCastFixes} enum type cast${enumCastFixes === 1 ? "" : "s"}.`);
  }
  if (uniqueNullsFixes > 0) {
    notes.push(
      `Normalized ${uniqueNullsFixes} UNIQUE NULLS NOT DISTINCT constraint${uniqueNullsFixes === 1 ? "" : "s"}.`,
    );
  }
  if (unsupportedArrayFixes > 0) {
    notes.push(
      `Replaced ${unsupportedArrayFixes} unsupported array column${unsupportedArrayFixes === 1 ? "" : "s"} (UUID[], JSONB[]) with TEXT.`,
    );
  }
  if (identityAlwaysFixes > 0) {
    notes.push(
      `Rewrote ${identityAlwaysFixes} GENERATED ALWAYS AS IDENTITY column${identityAlwaysFixes === 1 ? "" : "s"} to BY DEFAULT for parsing.`,
    );
  }
  if (reservedTableQuotes > 0) {
    notes.push(
      `Quoted ${reservedTableQuotes} reserved SQL table name${reservedTableQuotes === 1 ? "" : "s"} (e.g. order, group) for parsing.`,
    );
  }

  return {
    sql: kept.join("\n\n"),
    notes,
  };
}
