export const RELATIONSHIP_FKS = [
  { fromTable: "accounts", fromColumn: "parent_id", toTable: "accounts", toColumn: "account_id" },
  { fromTable: "groups", fromColumn: "owner_id", toTable: "accounts", toColumn: "account_id" },
  { fromTable: "groups", fromColumn: "created_by", toTable: "accounts", toColumn: "account_id" },
  { fromTable: "memberships", fromColumn: "group_id", toTable: "groups", toColumn: "group_id" },
  { fromTable: "memberships", fromColumn: "account_id", toTable: "accounts", toColumn: "account_id" },
  { fromTable: "orders", fromColumn: "account_id", toTable: "accounts", toColumn: "account_id" },
  { fromTable: "orders", fromColumn: "group_id", toTable: "groups", toColumn: "group_id" },
  { fromTable: "audit_log", fromColumn: "account_id", toTable: "accounts", toColumn: "account_id" },
];

export const RELATIONSHIP_TABLES = [
  { name: "accounts" },
  { name: "groups" },
  { name: "memberships" },
  { name: "audit_log" },
  { name: "orders" },
];

export const COMPLEX_TABLES = [
  { name: "organizations" },
  { name: "teams" },
  { name: "users" },
  { name: "projects" },
  { name: "tasks" },
];
