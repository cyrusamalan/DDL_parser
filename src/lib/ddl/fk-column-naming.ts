export function shortTableName(tableName: string): string {
  const dotIndex = tableName.lastIndexOf(".");
  return dotIndex >= 0 ? tableName.slice(dotIndex + 1) : tableName;
}

export function singularize(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith("ies")) return lower.slice(0, -3) + "y";
  if (lower.endsWith("ses")) return lower.slice(0, -2);
  if (lower.endsWith("s") && lower.length > 1) return lower.slice(0, -1);
  return lower;
}

export function fkColumnMatchesTable(fkColumn: string, referencedTable: string): boolean {
  const tableShort = shortTableName(referencedTable).toLowerCase();
  const columnLower = fkColumn.toLowerCase();

  if (columnLower === `${tableShort}_id`) return true;
  if (columnLower === tableShort) return true;

  const singularTable = singularize(tableShort);
  if (columnLower === `${singularTable}_id`) return true;

  const columnStem = columnLower.replace(/_id$/, "");
  if (columnStem === singularTable || columnStem === tableShort) return true;

  if (tableShort.startsWith(columnStem) || columnStem.startsWith(singularTable)) return true;
  if (tableShort.startsWith(`${columnStem}s`) || `${columnStem}s` === tableShort) return true;

  if (columnLower.endsWith(`_${singularTable}_id`)) return true;
  if (columnLower.endsWith(`_${tableShort}_id`)) return true;

  return false;
}

const USER_REFERENCE_COLUMNS = new Set([
  "manager_id",
  "owner_id",
  "assignee_id",
  "reporter_id",
  "reviewer_id",
  "lead_user_id",
  "created_by",
  "owner_user_id",
]);

const ACCOUNT_REFERENCE_COLUMNS = new Set(["created_by"]);

export function isUserReferenceColumn(column: string): boolean {
  const lower = column.toLowerCase();
  return USER_REFERENCE_COLUMNS.has(lower) || lower.endsWith("_user_id");
}

export function isAccountReferenceColumn(column: string): boolean {
  return ACCOUNT_REFERENCE_COLUMNS.has(column.toLowerCase());
}
