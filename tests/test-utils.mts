import type { ParsedSchema } from "../src/lib/ddl/ast-walker.ts";

export type { ParsedSchema };

export type ColExpect = {
  name: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
};

export type TableExpect = {
  name: string;
  columns?: ColExpect[];
};

export type FkExpect = {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
};

export type CaseExpect = {
  tables: TableExpect[];
  fks?: FkExpect[];
  /** Assert exact total FK count — catches both missing and phantom FKs */
  fkCount?: number;
};

export type CaseResult = {
  label: string;
  ok: boolean;
  errors: string[];
};

export function assertSchema(
  label: string,
  schema: ParsedSchema,
  expect: CaseExpect,
): CaseResult {
  const errors: string[] = [];
  const tableMap = new Map(schema.tables.map((t) => [t.name, t]));

  for (const te of expect.tables) {
    const table = tableMap.get(te.name);
    if (!table) {
      errors.push(
        `Missing table "${te.name}" (found: ${[...tableMap.keys()].join(", ") || "(none)"})`,
      );
      continue;
    }
    if (!te.columns) continue;
    const colMap = new Map(table.columns.map((c) => [c.name, c]));
    for (const ce of te.columns) {
      const col = colMap.get(ce.name);
      if (!col) {
        errors.push(`Table "${te.name}": missing column "${ce.name}"`);
        continue;
      }
      if (ce.isPrimaryKey !== undefined && col.isPrimaryKey !== ce.isPrimaryKey) {
        errors.push(
          `Table "${te.name}", col "${ce.name}": isPrimaryKey expected ${ce.isPrimaryKey}, got ${col.isPrimaryKey}`,
        );
      }
      if (ce.isForeignKey !== undefined && col.isForeignKey !== ce.isForeignKey) {
        errors.push(
          `Table "${te.name}", col "${ce.name}": isForeignKey expected ${ce.isForeignKey}, got ${col.isForeignKey}`,
        );
      }
    }
  }

  if (expect.fkCount !== undefined && schema.foreignKeys.length !== expect.fkCount) {
    errors.push(
      `Expected ${expect.fkCount} FK(s), got ${schema.foreignKeys.length}: ` +
        (schema.foreignKeys.length === 0
          ? "(none)"
          : schema.foreignKeys
              .map((fk) => `${fk.fromTable}.${fk.fromColumn}→${fk.toTable}.${fk.toColumn}`)
              .join(", ")),
    );
  }

  for (const fe of expect.fks ?? []) {
    const found = schema.foreignKeys.some(
      (fk) =>
        fk.fromTable === fe.fromTable &&
        fk.fromColumn === fe.fromColumn &&
        fk.toTable === fe.toTable &&
        fk.toColumn === fe.toColumn,
    );
    if (!found) {
      errors.push(
        `Missing FK: ${fe.fromTable}.${fe.fromColumn} → ${fe.toTable}.${fe.toColumn}` +
          ` (found: ${schema.foreignKeys.map((fk) => `${fk.fromTable}.${fk.fromColumn}→${fk.toTable}.${fk.toColumn}`).join(", ") || "(none)"})`,
      );
    }
  }

  return { label, ok: errors.length === 0, errors };
}
