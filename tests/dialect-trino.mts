import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeTrinoDdl } from "../src/lib/ddl/sanitize-trino-ddl.ts";
import {
  COMPLEX_TABLES,
  RELATIONSHIP_FKS,
  RELATIONSHIP_TABLES,
} from "./dialect-fk-fixtures.mts";
import { parseDialectFixture } from "./dialect-parse-helper.mts";
import { assertSchema, type CaseResult } from "./test-utils.mts";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures", "trino");

function load(file: string): string {
  return readFileSync(join(fixtures, file), "utf8");
}

const results: CaseResult[] = [];

{
  const { notes } = sanitizeTrinoDdl(load("01-simple.sql"));
  const schema = parseDialectFixture(load("01-simple.sql"), "trino", sanitizeTrinoDdl);
  const r = assertSchema("01-simple", schema, {
    tables: [{ name: "users", columns: [{ name: "user_id" }, { name: "email" }] }],
    fkCount: 0,
  });
  if (!notes.some((n) => /resolved|trino|with|converted/i.test(n))) {
    r.errors.push("Expected sanitize notes for catalog names or WITH clause");
    r.ok = false;
  }
  results.push(r);
}

{
  const schema = parseDialectFixture(load("02-relationships.sql"), "trino", sanitizeTrinoDdl);
  results.push(
    assertSchema("02-relationships", schema, {
      tables: RELATIONSHIP_TABLES,
      fks: RELATIONSHIP_FKS,
      fkCount: 8,
    }),
  );
}

{
  const schema = parseDialectFixture(load("03-complex.sql"), "trino", sanitizeTrinoDdl);
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
