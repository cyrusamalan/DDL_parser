export function ensureTerminator(stmt: string): string {
  const s = stmt.trim();
  return s.endsWith(";") ? s : `${s};`;
}

export function stripLeadingComments(normalized: string): string {
  let s = normalized.trimStart();
  for (;;) {
    const before = s;
    s = s.replace(/^--[^\n]*\n/, "");
    s = s.replace(/^\/\*[\s\S]*?\*\//, "");
    s = s.trimStart();
    if (s === before) break;
  }
  return s;
}

export function isCreateTableStatement(normalized: string): boolean {
  return (
    /^CREATE\s+(?:OR\s+REPLACE\s+)?(?:TEMP(?:ORARY)?\s+)?TABLE\b/i.test(normalized) &&
    !/\bAS\s+SELECT\b/i.test(normalized)
  );
}

export function isAlterTableFkStatement(normalized: string): boolean {
  return /^ALTER\s+TABLE\b/i.test(normalized) && /\bFOREIGN\s+KEY\b/i.test(normalized);
}

/** Sanitized DDL may include ALTER TABLE … FOREIGN KEY that warehouse parsers drop. */
export function hasAlterTableForeignKey(sql: string): boolean {
  return /\bALTER\s+TABLE\b[\s\S]*?\bFOREIGN\s+KEY\b/i.test(sql);
}

export function findColumnListEnd(sql: string): number {
  const match = sql.match(
    /^CREATE\s+(?:OR\s+REPLACE\s+)?(?:TEMP(?:ORARY)?\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`[^`]*`|"[^"]*"|[\w.]+)\s*\(/i,
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

export function stripAfterColumnList(sql: string): string {
  const end = findColumnListEnd(sql);
  if (end === -1) return sql;
  return sql.slice(0, end + 1);
}

/** catalog.schema.table or schema.table → unqualified "table" */
export function unqualifyDottedTableNames(sql: string): { sql: string; resolved: number } {
  let resolved = 0;
  const result = sql.replace(
    /\b([A-Za-z_][\w]*)\.([A-Za-z_][\w]*)\.([A-Za-z_][\w]*)\b/g,
    (_, _catalog, _schema, table: string) => {
      resolved++;
      return `"${table}"`;
    },
  );
  const result2 = result.replace(
    /\b([A-Za-z_][\w]*)\.([A-Za-z_][\w]*)\b/g,
    (match, first: string, second: string, offset: number, full: string) => {
      const before = full.slice(Math.max(0, offset - 7), offset).toUpperCase();
      if (before.includes("TABLE") || before.includes("INTO") || before.includes("FROM")) {
        resolved++;
        return `"${second}"`;
      }
      return match;
    },
  );
  return { sql: result2, resolved };
}

export function stripParenClause(sql: string, keyword: RegExp): string {
  let result = sql;
  let match: RegExpExecArray | null;
  const re = new RegExp(keyword.source, keyword.flags + (keyword.flags.includes("g") ? "" : "g"));
  while ((match = re.exec(result)) !== null) {
    const start = match.index;
    const open = result.indexOf("(", start);
    if (open === -1) continue;
    let depth = 0;
    let end = open;
    for (; end < result.length; end++) {
      if (result[end] === "(") depth++;
      else if (result[end] === ")") {
        depth--;
        if (depth === 0) break;
      }
    }
    if (depth === 0) {
      result = result.slice(0, start) + result.slice(end + 1);
      re.lastIndex = start;
    }
  }
  return result;
}

export function simplifyAngleBracketTypes(sql: string): { sql: string; count: number } {
  let result = sql;
  let count = 0;
  let prev = "";
  while (prev !== result) {
    prev = result;
    result = result.replace(/<[^<>]*>/g, () => {
      count++;
      return "";
    });
    result = result.replace(/\b(ARRAY|MAP|ROW|STRUCT)\s*(?:\([^)]*\))?/gi, () => {
      count++;
      return "TEXT";
    });
  }
  return { sql: result, count };
}
