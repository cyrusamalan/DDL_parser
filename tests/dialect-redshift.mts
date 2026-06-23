import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeRedshiftDdl } from "../src/lib/ddl/sanitize-redshift-ddl.ts";
import {
  COMPLEX_TABLES,
  RELATIONSHIP_FKS,
  RELATIONSHIP_TABLES,
} from "./dialect-fk-fixtures.mts";
import { parseDialectFixture } from "./dialect-parse-helper.mts";
import { assertSchema, type CaseResult } from "./test-utils.mts";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures", "redshift");

function load(file: string): string {
  return readFileSync(join(fixtures, file), "utf8");
}

const results: CaseResult[] = [];

{
  const schema = parseDialectFixture(load("01-simple.sql"), "redshift", sanitizeRedshiftDdl);
  results.push(
    assertSchema("01-simple", schema, {
      tables: [{ name: "users", columns: [{ name: "user_id" }, { name: "email" }] }],
      fkCount: 0,
    }),
  );
}

{
  const { notes } = sanitizeRedshiftDdl(load("02-relationships.sql"));
  const schema = parseDialectFixture(load("02-relationships.sql"), "redshift", sanitizeRedshiftDdl);
  const r = assertSchema("02-relationships", schema, {
    tables: RELATIONSHIP_TABLES,
    fks: RELATIONSHIP_FKS,
    fkCount: 8,
  });
  if (!notes.some((n) => /redshift|encode|dist|converted|removed/i.test(n))) {
    r.errors.push("Expected sanitize notes");
    r.ok = false;
  }
  results.push(r);
}

{
  const schema = parseDialectFixture(load("03-complex.sql"), "redshift", sanitizeRedshiftDdl);
  results.push(
    assertSchema("03-complex", schema, {
      tables: COMPLEX_TABLES,
      fkCount: 13,
    }),
  );
}

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;
console.log(JSON.stringify({ passed, failed, results }));
