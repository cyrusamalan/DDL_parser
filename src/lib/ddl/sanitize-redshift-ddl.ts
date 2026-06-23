import { splitSqlStatements, type SanitizeDdlResult } from "./sanitize-postgres-ddl.ts";
import {
  ensureTerminator,
  isAlterTableFkStatement,
  isCreateTableStatement,
  stripAfterColumnList,
  stripLeadingComments,
} from "./sanitize-dialect-helpers.ts";

function convertRedshiftToPg(statement: string): string {
  let r = statement;
  r = r.replace(/\s+ENCODE\s+(?:ZSTD|DELTA|RAW|BYTEDICT|LZO|AZ64|TEXT255|TEXT32K|RUNLENGTH)\b/gi, "");
  r = r.replace(/\s+IDENTITY\s*\(\s*\d+\s*,\s*\d+\s*\)/gi, "");
  r = r.replace(/\bSYSDATE\b/gi, "CURRENT_TIMESTAMP");
  return r;
}

function stripRedshiftTableClauses(sql: string): string {
  let r = stripAfterColumnList(sql);
  r = r.replace(/\)\s*DISTSTYLE\s+(?:ALL|KEY|EVEN|AUTO)\b[^;]*/gi, ")");
  r = r.replace(/\)\s*DISTKEY\s*\([^)]*\)[^;]*/gi, ")");
  r = r.replace(/\)\s*COMPOUND\s+SORTKEY\s*\([^)]*\)[^;]*/gi, ")");
  r = r.replace(/\)\s*SORTKEY\s*\([^)]*\)[^;]*/gi, ")");
  r = r.replace(/\)\s*DISTKEY\s*\([^)]*\)/gi, ")");
  return r;
}

export function sanitizeRedshiftDdl(input: string): SanitizeDdlResult {
  const statements = splitSqlStatements(input.trim());
  const kept: string[] = [];
  let removedCount = 0;
  let convertedCount = 0;

  for (const statement of statements) {
    const normalized = stripLeadingComments(statement);

    if (isCreateTableStatement(normalized)) {
      let sql = convertRedshiftToPg(statement);
      sql = stripRedshiftTableClauses(sql);
      if (sql !== statement) convertedCount++;
      kept.push(ensureTerminator(sql));
      continue;
    }

    if (isAlterTableFkStatement(normalized)) {
      kept.push(ensureTerminator(convertRedshiftToPg(statement)));
      continue;
    }

    removedCount++;
  }

  const notes: string[] = [];
  if (convertedCount > 0) {
    notes.push(
      `Converted ${convertedCount} Redshift statement${convertedCount === 1 ? "" : "s"} (ENCODE, IDENTITY, DISTSTYLE/DISTKEY/SORTKEY stripped).`,
    );
  }
  if (removedCount > 0) {
    notes.push(`Removed ${removedCount} non-table statement${removedCount === 1 ? "" : "s"} (views, etc.).`);
  }

  return { sql: kept.join("\n\n"), notes };
}
