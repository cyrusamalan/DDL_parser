import { mergeSqlFiles } from "@/lib/merge-sql-files";
import type { SqlDialect, SqlFileEntry } from "@/lib/types/diagram";

const DIALECT_DETECTION_SAMPLE_BYTES = 32_768;

/** Strip comments so markers like "partitioned by" in `--` notes do not false-match Hive. */
function stripCommentsForDetection(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ");
}

function looksLikeHive(sample: string): boolean {
  return (
    /\bDISABLE\s+NOVALIDATE\b/i.test(sample) ||
    /\bSTORED\s+AS\s+(?:ORC|PARQUET|AVRO|TEXTFILE)\b/i.test(sample) ||
    /\bCLUSTERED\s+BY\b/i.test(sample) ||
    /\bMAP\s*<\s*STRING/i.test(sample) ||
    /\bTBLPROPERTIES\b/i.test(sample) ||
    (/\bPARTITIONED\s+BY\b/i.test(sample) && /\bSTORED\s+AS\b/i.test(sample))
  );
}

function looksLikeBigQuery(sample: string): boolean {
  if (
    /`[^`]+\.[^`]+\.[^`]+`/.test(sample) ||
    /`[^`]+\.[^`]+`/.test(sample) ||
    /\bINT64\b/i.test(sample) ||
    /\bFLOAT64\b/i.test(sample) ||
    /\bBOOL\b/i.test(sample) ||
    /\bBIGNUMERIC\b/i.test(sample) ||
    /\bGEOGRAPHY\b/i.test(sample) ||
    /\bOPTIONS\s*\(/i.test(sample)
  ) {
    return true;
  }

  // ARRAY</STRUCT< are shared with Hive; only count them when no Hive storage/constraint cues.
  if (!looksLikeHive(sample) && (/\bSTRUCT\s*</i.test(sample) || /\bARRAY\s*</i.test(sample))) {
    return true;
  }

  // NOT ENFORCED is also used by Flink; require a GoogleSQL cue alongside it.
  if (/\bNOT\s+ENFORCED\b/i.test(sample)) {
    return (
      /\bSTRING\b/i.test(sample) ||
      /\bDATETIME\b/i.test(sample) ||
      /`/.test(sample) ||
      /\bINT64\b/i.test(sample)
    );
  }

  return false;
}

export function detectDialect(sql: string): SqlDialect {
  const rawSample =
    sql.length > DIALECT_DETECTION_SAMPLE_BYTES
      ? sql.slice(0, DIALECT_DETECTION_SAMPLE_BYTES)
      : sql;
  const sample = stripCommentsForDetection(rawSample);

  if (looksLikeHive(sample)) {
    return "hive";
  }

  if (looksLikeBigQuery(sample)) {
    return "bigquery";
  }

  if (
    /\bTIMESTAMP_NTZ\b/i.test(sample) ||
    /\bVARIANT\b/i.test(sample) ||
    /\bCLUSTER\s+BY\b/i.test(sample) ||
    /\bDATA_RETENTION_TIME_IN_DAYS\b/i.test(sample) ||
    (/\bNUMBER\b/i.test(sample) && /\bAUTOINCREMENT\b/i.test(sample))
  ) {
    return "snowflake";
  }

  if (
    /\bENCODE\s+(?:ZSTD|DELTA|RAW|BYTEDICT)\b/i.test(sample) ||
    /\bDISTSTYLE\b/i.test(sample) ||
    /\bDISTKEY\b/i.test(sample) ||
    /\bCOMPOUND\s+SORTKEY\b/i.test(sample)
  ) {
    return "redshift";
  }

  if (
    /\bWATERMARK\s+FOR\b/i.test(sample) ||
    /\bPROCTIME\s*\(\s*\)/i.test(sample) ||
    /\bTIMESTAMP_LTZ\b/i.test(sample) ||
    /'connector'\s*=\s*'kafka'/i.test(sample) ||
    (/\bNOT\s+ENFORCED\b/i.test(sample) && /\bWITH\s*\(\s*'/i.test(sample))
  ) {
    return "flink";
  }

  if (
    /\bCREATE\s+SCHEMA\b/i.test(sample) ||
    /\bWITH\s*\(\s*format\s*=/i.test(sample) ||
    /\bTIMESTAMP\s*\(\s*6\s*\)\s+WITH\s+TIME\s+ZONE\b/i.test(sample) ||
    /\bhive\.\w+\.\w+/i.test(sample)
  ) {
    return "trino";
  }

  if (
    /\bORGANIZE\s+BY\s+ROW\b/i.test(sample) ||
    /\bGENERATED\s+ALWAYS\s+AS\s+IDENTITY\s*\(\s*START\s+WITH\b/i.test(sample) ||
    /\bIN\s+USERSPACE\d*\b/i.test(sample) ||
    /\bDEFAULT\s+CURRENT\s+TIMESTAMP\b/i.test(sample)
  ) {
    return "db2";
  }

  if (/`/.test(sample) || /\bENGINE\s*=/i.test(sample) || /\bAUTO_INCREMENT\b/i.test(sample)) {
    return "mysql";
  }

  if (
    /\[[A-Za-z_]\w*\]/.test(sample) ||
    (/\bIDENTITY\s*\(\s*\d+/i.test(sample) && !/\bENCODE\b/i.test(sample)) ||
    /^GO\s*$/im.test(sample) ||
    /\bNVARCHAR\b/i.test(sample)
  ) {
    return "mssql";
  }

  if (/\bINTEGER\b.*\bAUTOINCREMENT\b/i.test(sample) || /\bWITHOUT\s+ROWID\b/i.test(sample)) {
    return "sqlite";
  }

  return "postgresql";
}

export function sqlForDialectDetection(sql: string, files: SqlFileEntry[]): string {
  if (files.length > 0) {
    return mergeSqlFiles(files);
  }
  return sql;
}

export function detectDialectFromInput(sql: string, files: SqlFileEntry[]): SqlDialect {
  return detectDialect(sqlForDialectDetection(sql, files));
}

export type DialectSource = "auto" | "manual";

export const DIALECT_LABELS: Record<SqlDialect, string> = {
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  mariadb: "MariaDB",
  sqlite: "SQLite",
  mssql: "SQL Server",
  bigquery: "BigQuery",
  snowflake: "Snowflake",
  redshift: "Amazon Redshift",
  db2: "IBM Db2",
  trino: "Trino",
  hive: "Apache Hive",
  flink: "Apache Flink",
};

export const DIALECT_GROUPS: { label: string; dialects: SqlDialect[] }[] = [
  {
    label: "Common",
    dialects: ["postgresql", "mysql", "mariadb", "sqlite", "mssql", "bigquery"],
  },
  {
    label: "Warehouse & analytics",
    dialects: ["snowflake", "redshift", "db2", "trino", "hive", "flink"],
  },
];
