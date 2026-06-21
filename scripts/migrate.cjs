const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const rootDir = path.join(__dirname, "..");
loadEnvFile(path.join(rootDir, ".env.local"));
loadEnvFile(path.join(rootDir, ".env"));

function splitSqlStatements(source) {
  const statements = [];
  let buffer = "";
  let i = 0;

  while (i < source.length) {
    if (source.startsWith("--", i)) {
      const newline = source.indexOf("\n", i);
      const end = newline === -1 ? source.length : newline + 1;
      buffer += source.slice(i, end);
      i = end;
      continue;
    }

    const dollarMatch = source.slice(i).match(/^\$([A-Za-z0-9_]*)\$/);
    if (dollarMatch) {
      const tag = dollarMatch[0];
      buffer += tag;
      i += tag.length;
      const closeIdx = source.indexOf(tag, i);
      if (closeIdx === -1) {
        throw new Error(`Unclosed dollar-quoted string: ${tag}`);
      }
      buffer += source.slice(i, closeIdx + tag.length);
      i = closeIdx + tag.length;
      continue;
    }

    if (source[i] === "'") {
      buffer += source[i++];
      while (i < source.length) {
        buffer += source[i];
        if (source[i] === "'") {
          if (source[i + 1] === "'") {
            buffer += source[++i];
            i++;
          } else {
            i++;
            break;
          }
        } else {
          i++;
        }
      }
      continue;
    }

    const char = source[i];
    buffer += char;
    if (char === ";") {
      const statement = buffer.trim();
      if (statement) statements.push(statement);
      buffer = "";
    }
    i++;
  }

  const tail = buffer.trim();
  if (tail) statements.push(tail);
  return statements;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required. Set it in .env.local or your shell.");
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, "..", "db", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  const sql = neon(databaseUrl);

  for (const statement of splitSqlStatements(schema)) {
    await sql.query(statement);
  }
  console.log("Applied db/schema.sql successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
