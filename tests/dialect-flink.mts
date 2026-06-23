import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeFlinkDdl } from "../src/lib/ddl/sanitize-flink-ddl.ts";
import {
  COMPLEX_TABLES,
  RELATIONSHIP_FKS,
  RELATIONSHIP_TABLES,
} from "./dialect-fk-fixtures.mts";
import { parseDialectFixture } from "./dialect-parse-helper.mts";
import { assertSchema, type CaseResult } from "./test-utils.mts";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures", "flink");

function load(file: string): string {
  return readFileSync(join(fixtures, file), "utf8");
}

const results: CaseResult[] = [];

{
  const { notes } = sanitizeFlinkDdl(load("01-simple.sql"));
  const schema = parseDialectFixture(load("01-simple.sql"), "flink", sanitizeFlinkDdl);
  const r = assertSchema("01-simple", schema, {
    tables: [{ name: "users", columns: [{ name: "user_id" }, { name: "email" }] }],
    fkCount: 0,
  });
  if (!notes.some((n) => /flink|watermark|connector|converted/i.test(n))) {
    r.errors.push("Expected sanitize notes");
    r.ok = false;
  }
  results.push(r);
}

{
  const schema = parseDialectFixture(load("02-relationships.sql"), "flink", sanitizeFlinkDdl);
  results.push(
    assertSchema("02-relationships", schema, {
      tables: RELATIONSHIP_TABLES,
      fks: RELATIONSHIP_FKS,
      fkCount: 8,
    }),
  );
}

{
  const schema = parseDialectFixture(load("03-complex.sql"), "flink", sanitizeFlinkDdl);
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
