/**
 * Tiny, dependency-free SQL tokenizer used only by the landing-page hero
 * animation. It is intentionally lightweight (regex-based, no Prism/Shiki) and
 * good enough to colour a small, known DDL snippet — not a general SQL parser.
 */

export type SqlTokenKind =
  | "keyword"
  | "type"
  | "string"
  | "comment"
  | "punctuation"
  | "number"
  | "plain";

export interface SqlToken {
  value: string;
  kind: SqlTokenKind;
}

const KEYWORDS = new Set([
  "create",
  "table",
  "alter",
  "add",
  "constraint",
  "primary",
  "foreign",
  "key",
  "references",
  "not",
  "null",
  "default",
  "unique",
  "check",
  "on",
  "delete",
  "update",
  "cascade",
  "and",
  "as",
]);

const TYPES = new Set([
  "uuid",
  "text",
  "varchar",
  "char",
  "integer",
  "int",
  "bigint",
  "serial",
  "bigserial",
  "boolean",
  "bool",
  "timestamptz",
  "timestamp",
  "date",
  "time",
  "numeric",
  "decimal",
  "real",
  "double",
  "jsonb",
  "json",
  "bytea",
]);

/** A single matcher pass; ordering matters (comments/strings before words). */
const TOKEN_PATTERN = new RegExp(
  [
    "(--[^\\n]*)", // 1: line comment
    "('(?:[^'\\\\]|\\\\.)*')", // 2: single-quoted string
    "(\\b\\d+\\b)", // 3: number
    "([A-Za-z_][A-Za-z0-9_]*)", // 4: word (keyword / type / identifier)
    "([(),;.\\[\\]]+)", // 5: punctuation
  ].join("|"),
  "g",
);

/**
 * Split `sql` into coloured tokens. Whitespace and any unmatched characters are
 * preserved as `plain` tokens so the original text round-trips exactly.
 */
export function tokenizeSql(sql: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  let lastIndex = 0;

  const pushPlain = (value: string) => {
    if (value) tokens.push({ value, kind: "plain" });
  };

  for (const match of sql.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    pushPlain(sql.slice(lastIndex, index));
    lastIndex = index + match[0].length;

    const [, comment, str, num, word, punct] = match;
    if (comment) {
      tokens.push({ value: comment, kind: "comment" });
    } else if (str) {
      tokens.push({ value: str, kind: "string" });
    } else if (num) {
      tokens.push({ value: num, kind: "number" });
    } else if (word) {
      const lower = word.toLowerCase();
      const kind: SqlTokenKind = KEYWORDS.has(lower)
        ? "keyword"
        : TYPES.has(lower)
          ? "type"
          : "plain";
      tokens.push({ value: word, kind });
    } else if (punct) {
      tokens.push({ value: punct, kind: "punctuation" });
    }
  }

  pushPlain(sql.slice(lastIndex));
  return tokens;
}

/** Tailwind text-colour classes per token kind, tuned for a dark backdrop. */
export const SQL_TOKEN_CLASS: Record<SqlTokenKind, string> = {
  keyword: "text-sky-400",
  type: "text-amber-300",
  string: "text-emerald-300",
  comment: "text-slate-500 italic",
  punctuation: "text-slate-400",
  number: "text-fuchsia-300",
  plain: "text-slate-200",
};

/**
 * Demo schema shown in the hero. Kept in sync (by hand) with the table cards in
 * `DemoErd` so the SQL the user reads visibly becomes the diagram they see.
 */
export const DEMO_DDL = `-- schema.sql
CREATE TABLE users (
  id          uuid PRIMARY KEY,
  email       text NOT NULL UNIQUE,
  full_name   text,
  created_at  timestamptz NOT NULL
);

CREATE TABLE posts (
  id          uuid PRIMARY KEY,
  author_id   uuid NOT NULL REFERENCES users (id),
  title       text NOT NULL,
  body        text,
  published   boolean DEFAULT false
);

CREATE TABLE comments (
  id          uuid PRIMARY KEY,
  post_id     uuid NOT NULL REFERENCES posts (id),
  author_id   uuid NOT NULL REFERENCES users (id),
  body        text NOT NULL,
  created_at  timestamptz NOT NULL
);
`;
