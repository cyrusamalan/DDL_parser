const assert = require("node:assert/strict");
const { Parser } = require("node-sql-parser");

const parser = new Parser();
const sql = `
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL
);
`;

const ast = parser.astify(sql, { database: "Postgresql" });
assert.ok(Array.isArray(ast) && ast.length === 2);

const posts = ast[1];
const fkColumn = posts.create_definitions.find(
  (def) => def.column?.column?.expr?.value === "user_id",
);
assert.ok(fkColumn?.reference_definition?.table?.[0]?.table === "users");

console.log("DDL parser smoke test passed.");
