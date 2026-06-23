import {
  fkColumnMatchesTable,
  isAccountReferenceColumn,
  isUserReferenceColumn,
  shortTableName,
  singularize,
} from "./fk-column-naming.ts";
import type { ParsedForeignKey, ParsedSchema, ParsedTable } from "./ast-walker.ts";

function findPrimaryKeyColumn(table: ParsedTable): string | null {
  const pk = table.columns.find((col) => col.isPrimaryKey);
  if (pk) return pk.name;

  const short = shortTableName(table.name).toLowerCase();
  const singular = singularize(short);
  const named = table.columns.find((col) => {
    const n = col.name.toLowerCase();
    return n === `${singular}_id` || n === `${short}_id` || n === "id";
  });
  if (named) return named.name;

  const suffixId = table.columns.find((col) => col.name.toLowerCase().endsWith("_id"));
  return suffixId?.name ?? null;
}

function findTableByShortName(tables: ParsedTable[], shortName: string): ParsedTable | null {
  const target = shortName.toLowerCase();
  const matches = tables.filter((t) => shortTableName(t.name).toLowerCase() === target);
  return matches.length === 1 ? matches[0] : null;
}

function resolveTarget(
  columnName: string,
  fromTable: string,
  tables: ParsedTable[],
): { toTable: string; toColumn: string } | null {
  const pkByTable = new Map<string, string>();
  for (const table of tables) {
    const pk = findPrimaryKeyColumn(table);
    if (pk) pkByTable.set(table.name, pk);
  }

  const candidates: Array<{ toTable: string; toColumn: string }> = [];

  for (const table of tables) {
    const pk = pkByTable.get(table.name);
    if (!pk) continue;
    if (fkColumnMatchesTable(columnName, table.name)) {
      candidates.push({ toTable: table.name, toColumn: pk });
    }
  }

  if (candidates.length === 1) return candidates[0];

  const colLower = columnName.toLowerCase();

  if (
    colLower === "parent_id" ||
    /^parent_/.test(colLower) ||
    /_parent_id$/.test(colLower)
  ) {
    const from = tables.find((t) => t.name === fromTable);
    const fromPk = from ? findPrimaryKeyColumn(from) : null;
    if (fromPk) return { toTable: fromTable, toColumn: fromPk };
  }

  if (colLower === "owner_id" && !findTableByShortName(tables, "users")) {
    const accounts = findTableByShortName(tables, "accounts");
    if (accounts) {
      const pk = pkByTable.get(accounts.name);
      if (pk) return { toTable: accounts.name, toColumn: pk };
    }
  }

  if (colLower.endsWith("_id")) {
    const stem = colLower.slice(0, -3);
    const byStem = findTableByShortName(tables, stem) ?? findTableByShortName(tables, `${stem}s`);
    if (byStem) {
      const pk = pkByTable.get(byStem.name);
      if (pk) return { toTable: byStem.name, toColumn: pk };
    }
  }

  if (isUserReferenceColumn(columnName)) {
    const users = findTableByShortName(tables, "users");
    if (users) {
      const pk = pkByTable.get(users.name);
      if (pk) return { toTable: users.name, toColumn: pk };
    }
  }

  if (isAccountReferenceColumn(columnName)) {
    const accounts = findTableByShortName(tables, "accounts");
    if (accounts) {
      const pk = pkByTable.get(accounts.name);
      if (pk) return { toTable: accounts.name, toColumn: pk };
    }
  }

  const fromPk = tables.find((t) => t.name === fromTable);
  const pkCol = fromPk ? findPrimaryKeyColumn(fromPk) : null;
  if (colLower.endsWith("_id") && pkCol && colLower !== pkCol.toLowerCase()) {
    if (candidates.some((c) => c.toTable === fromTable)) {
      return { toTable: fromTable, toColumn: pkCol };
    }
  }

  if (candidates.length > 1) {
    const external = candidates.filter((c) => c.toTable !== fromTable);
    if (external.length === 1) return external[0];
    return null;
  }

  return null;
}

export function inferImplicitForeignKeys(schema: ParsedSchema): ParsedSchema {
  const foreignKeys = [...schema.foreignKeys];
  const existing = new Set(foreignKeys.map((fk) => fk.id));

  for (const table of schema.tables) {
    const pk = findPrimaryKeyColumn(table);
    for (const column of table.columns) {
      if (column.isPrimaryKey) continue;

      const colLower = column.name.toLowerCase();
      if (
        !colLower.endsWith("_id") &&
        !isUserReferenceColumn(column.name) &&
        !isAccountReferenceColumn(column.name)
      ) {
        continue;
      }

      const target = resolveTarget(column.name, table.name, schema.tables);
      if (!target) continue;
      if (target.toTable === table.name && target.toColumn === column.name) continue;

      const id = `fk:${table.name}.${column.name}->${target.toTable}.${target.toColumn}`;
      if (existing.has(id)) continue;

      foreignKeys.push({
        id,
        fromTable: table.name,
        fromColumn: column.name,
        toTable: target.toTable,
        toColumn: target.toColumn,
      });
      existing.add(id);
      column.isForeignKey = true;
    }
  }

  return { tables: schema.tables, foreignKeys };
}
