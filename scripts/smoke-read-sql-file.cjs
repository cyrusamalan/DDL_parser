const assert = require("node:assert/strict");

function isAllowedSqlFileName(fileName) {
  return fileName.trim().toLowerCase().endsWith(".sql");
}

const MAX_SQL_FILE_BYTES = 5 * 1024 * 1024;

function validateSqlFileMeta(fileName, size) {
  if (!isAllowedSqlFileName(fileName)) {
    return { ok: false, error: "Only .sql files are allowed." };
  }
  if (size === 0) {
    return { ok: false, error: "The selected file is empty." };
  }
  if (size > MAX_SQL_FILE_BYTES) {
    return { ok: false, error: "The selected file is too large (max 5 MB)." };
  }
  return { ok: true };
}

assert.equal(isAllowedSqlFileName("schema.sql"), true);
assert.equal(isAllowedSqlFileName("SCHEMA.SQL"), true);
assert.equal(isAllowedSqlFileName("schema.txt"), false);
assert.equal(isAllowedSqlFileName("schema.json"), false);
assert.equal(isAllowedSqlFileName("schemasql"), false);

assert.deepEqual(validateSqlFileMeta("migration.sql", 128), { ok: true });
assert.equal(validateSqlFileMeta("migration.txt", 128).ok, false);
assert.equal(validateSqlFileMeta("migration.sql", 0).ok, false);
assert.equal(validateSqlFileMeta("migration.sql", MAX_SQL_FILE_BYTES + 1).ok, false);

console.log("SQL upload validation smoke test passed.");
