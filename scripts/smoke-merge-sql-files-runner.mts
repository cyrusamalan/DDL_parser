import {
  defaultSqlFileSelection,
  isTableVisibleForSelection,
  mergeSqlFiles,
  migrateSqlFileScopeToSelection,
  normalizeSqlFileSelection,
  resolveInitialSqlFileSelection,
  resolveSqlForDiagram,
  scopedFileName,
} from "../src/lib/merge-sql-files.ts";
import { sanitizePostgresDdl } from "../src/lib/ddl/sanitize-postgres-ddl.ts";
import { walkParseTree } from "../src/lib/ddl/ast-walker.ts";
import pkg from "node-sql-parser";
import type { SqlFileEntry } from "../src/lib/types/diagram.ts";

const { Parser } = pkg;

const files: SqlFileEntry[] = [
  { id: "a", name: "one.sql", sql: "CREATE TABLE one (id int PRIMARY KEY);" },
  { id: "b", name: "two.sql", sql: "CREATE TABLE two (id int PRIMARY KEY);" },
];

const merged = mergeSqlFiles(files);
if (!merged.includes("CREATE TABLE one")) {
  throw new Error("mergeSqlFiles missing first file");
}
if (!merged.includes("CREATE TABLE two")) {
  throw new Error("mergeSqlFiles missing second file");
}

const scoped = resolveSqlForDiagram(files, { fileId: "b" });
if (!scoped.includes("CREATE TABLE two") || scoped.includes("CREATE TABLE one")) {
  throw new Error("resolveSqlForDiagram single-file scope failed");
}

const scopedName = scopedFileName(files, { fileId: "a" });
if (scopedName !== "one.sql") {
  throw new Error("scopedFileName failed");
}

const allSelection = defaultSqlFileSelection(files);
if (allSelection.length !== 2 || !allSelection.includes("a") || !allSelection.includes("b")) {
  throw new Error("defaultSqlFileSelection failed");
}

const normalizedPartial = normalizeSqlFileSelection(files, ["a", "missing"]);
if (normalizedPartial.length !== 1 || normalizedPartial[0] !== "a") {
  throw new Error("normalizeSqlFileSelection should drop stale ids");
}

const normalizedEmpty = normalizeSqlFileSelection(files, []);
if (normalizedEmpty.length !== 2) {
  throw new Error("normalizeSqlFileSelection should fall back to all when empty");
}

const migrated = migrateSqlFileScopeToSelection(files, { fileId: "b" });
if (migrated.length !== 1 || migrated[0] !== "b") {
  throw new Error("migrateSqlFileScopeToSelection single file failed");
}

const resolvedInitial = resolveInitialSqlFileSelection(files, {
  sqlFileScope: { fileId: "a" },
});
if (resolvedInitial.length !== 1 || resolvedInitial[0] !== "a") {
  throw new Error("resolveInitialSqlFileSelection migration failed");
}

const visibleNode = {
  id: "one",
  type: "tableNode" as const,
  position: { x: 0, y: 0 },
  data: { tableName: "one", columns: [], sourceFileId: "a" },
};

if (!isTableVisibleForSelection(visibleNode, ["a"], allSelection)) {
  throw new Error("isTableVisibleForSelection should show matching file");
}

if (isTableVisibleForSelection(visibleNode, ["b"], allSelection)) {
  throw new Error("isTableVisibleForSelection should hide non-matching file");
}

if (!isTableVisibleForSelection(visibleNode, ["b"], ["a"])) {
  throw new Error("isTableVisibleForSelection should ignore filter for single-file projects");
}

const parser = new Parser();
const sourceFileByTable = new Map<string, string>();
for (const file of files) {
  const { sql } = sanitizePostgresDdl(file.sql);
  const ast = parser.astify(sql, { database: "Postgresql" });
  const schema = walkParseTree(ast);
  for (const table of schema.tables) {
    sourceFileByTable.set(table.name, file.id);
  }
}
if (sourceFileByTable.get("one") !== "a" || sourceFileByTable.get("two") !== "b") {
  throw new Error("per-file sourceFileId tagging failed");
}

console.log("merge SQL files smoke test passed.");
