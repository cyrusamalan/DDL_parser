export type ParsedColumn = {
  name: string;
  dataType: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
};

export type ParsedTable = {
  name: string;
  columns: ParsedColumn[];
};

export type ParsedForeignKey = {
  id: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
};

export type ParsedSchema = {
  tables: ParsedTable[];
  foreignKeys: ParsedForeignKey[];
};

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

function fkId(fromTable: string, fromColumn: string, toTable: string, toColumn: string): string {
  return `fk:${fromTable}.${fromColumn}->${toTable}.${toColumn}`;
}

function columnRefName(columnRef: unknown): string | null {
  if (!isObject(columnRef)) return null;

  const column = columnRef.column;
  if (isObject(column) && isObject(column.expr) && typeof column.expr.value === "string") {
    return column.expr.value;
  }

  if (typeof columnRef.column === "string") {
    return columnRef.column;
  }

  return null;
}

function formatDataType(definition: unknown): string {
  if (!isObject(definition) || typeof definition.dataType !== "string") {
    return "unknown";
  }

  let type = definition.dataType;
  if (typeof definition.length === "number") {
    type += `(${definition.length})`;
  } else if (Array.isArray(definition.length) && definition.length.length > 0) {
    type += `(${definition.length.join(", ")})`;
  }

  return type;
}

function qualifiedTableName(tableNode: unknown): string | null {
  if (!isObject(tableNode)) return null;

  const name = typeof tableNode.table === "string" ? tableNode.table : null;
  if (!name) return null;

  const schema = typeof tableNode.db === "string" ? tableNode.db : null;
  return schema ? `${schema}.${name}` : name;
}

function tableNameFromCreate(createStmt: JsonObject): string | null {
  const table = createStmt.table;
  if (Array.isArray(table) && table.length > 0) {
    return qualifiedTableName(table[0]);
  }

  if (isObject(table)) {
    return qualifiedTableName(table);
  }

  return null;
}

function addForeignKey(
  foreignKeys: ParsedForeignKey[],
  fromTable: string,
  fromColumn: string,
  toTable: string,
  toColumn: string,
): void {
  const id = fkId(fromTable, fromColumn, toTable, toColumn);
  if (!foreignKeys.some((fk) => fk.id === id)) {
    foreignKeys.push({ id, fromTable, fromColumn, toTable, toColumn });
  }
}

function processReferenceDefinition(
  table: ParsedTable,
  fromColumn: string,
  referenceDefinition: JsonObject,
  foreignKeys: ParsedForeignKey[],
): void {
  const refTableList = referenceDefinition.table;
  const refColumns = referenceDefinition.definition;

  if (!Array.isArray(refTableList) || refTableList.length === 0) return;

  const toTable =
    Array.isArray(refTableList) && refTableList.length > 0
      ? qualifiedTableName(refTableList[0])
      : null;
  if (!toTable) return;

  const toColumn = Array.isArray(refColumns) ? columnRefName(refColumns[0]) : null;
  if (!toColumn) return;

  addForeignKey(foreignKeys, table.name, fromColumn, toTable, toColumn);
  const column = table.columns.find((col) => col.name === fromColumn);
  if (column) column.isForeignKey = true;
}

function processCreateTable(
  createStmt: JsonObject,
  tables: Map<string, ParsedTable>,
  foreignKeys: ParsedForeignKey[],
): void {
  const tableName = tableNameFromCreate(createStmt);
  if (!tableName) return;

  const table: ParsedTable = { name: tableName, columns: [] };
  tables.set(tableName, table);

  const definitions = createStmt.create_definitions;
  if (!Array.isArray(definitions)) return;

  for (const definitionNode of definitions) {
    if (!isObject(definitionNode)) continue;

    if (definitionNode.resource === "column") {
      const name = columnRefName(definitionNode.column);
      if (!name) continue;

      const column: ParsedColumn = {
        name,
        dataType: formatDataType(definitionNode.definition),
        isPrimaryKey: definitionNode.primary_key === "primary key",
        isForeignKey: false,
      };
      table.columns.push(column);

      if (isObject(definitionNode.reference_definition)) {
        processReferenceDefinition(
          table,
          name,
          definitionNode.reference_definition,
          foreignKeys,
        );
      }
      continue;
    }

    if (
      definitionNode.resource === "constraint" &&
      definitionNode.constraint_type === "primary key" &&
      Array.isArray(definitionNode.definition)
    ) {
      for (const keyNode of definitionNode.definition) {
        const keyName = columnRefName(keyNode);
        if (!keyName) continue;
        const column = table.columns.find((col) => col.name === keyName);
        if (column) column.isPrimaryKey = true;
      }
      continue;
    }

    if (
      definitionNode.resource === "constraint" &&
      definitionNode.constraint_type === "FOREIGN KEY" &&
      Array.isArray(definitionNode.definition) &&
      isObject(definitionNode.reference_definition)
    ) {
      const fromColumn = columnRefName(definitionNode.definition[0]);
      if (!fromColumn) continue;
      processReferenceDefinition(
        table,
        fromColumn,
        definitionNode.reference_definition,
        foreignKeys,
      );
    }
  }
}

function processAlterTable(
  alterStmt: JsonObject,
  tables: Map<string, ParsedTable>,
  foreignKeys: ParsedForeignKey[],
): void {
  const tableNode = alterStmt.table;
  const tableName = Array.isArray(tableNode)
    ? tableNode.length > 0
      ? qualifiedTableName(tableNode[0])
      : null
    : qualifiedTableName(tableNode);

  if (!tableName) return;

  let table = tables.get(tableName);
  if (!table) {
    table = { name: tableName, columns: [] };
    tables.set(tableName, table);
  }

  const expr = alterStmt.expr;
  if (!Array.isArray(expr)) return;

  for (const item of expr) {
    if (!isObject(item)) continue;

    if (
      item.action === "add" &&
      item.resource === "constraint" &&
      item.constraint_type === "FOREIGN KEY" &&
      Array.isArray(item.definition) &&
      isObject(item.reference_definition)
    ) {
      const fromColumn = columnRefName(item.definition[0]);
      if (!fromColumn) continue;
      processReferenceDefinition(table, fromColumn, item.reference_definition, foreignKeys);
    }
  }
}

export function walkParseTree(ast: unknown): ParsedSchema {
  const tables = new Map<string, ParsedTable>();
  const foreignKeys: ParsedForeignKey[] = [];
  const statements = Array.isArray(ast) ? ast : ast ? [ast] : [];

  for (const statement of statements) {
    if (!isObject(statement)) continue;

    if (statement.type === "create" && statement.keyword === "table") {
      processCreateTable(statement, tables, foreignKeys);
    }

    if (statement.type === "alter" && statement.keyword === "table") {
      processAlterTable(statement, tables, foreignKeys);
    }
  }

  return {
    tables: Array.from(tables.values()),
    foreignKeys,
  };
}

export function formatParseError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Failed to parse SQL DDL.";
}
