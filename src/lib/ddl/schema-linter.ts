import type { Edge } from "@xyflow/react";
import { getIsolatedTableIds } from "@/lib/ddl/isolated-tables";
import {
  countReverseDependents,
  findArticulationPoints,
  findStronglyConnectedComponents,
  findUndirectedComponents,
  maxDirectedDepthFromRoots,
  reachableWithinHops,
} from "@/lib/ddl/schema-graph";
import type { SchemaGraphContext } from "@/lib/ddl/schema-graph-context";
import { buildSchemaGraphContext } from "@/lib/ddl/schema-graph-context";
import type { DiagramGrouping, FkEdgeData, TableFlowNode } from "@/lib/types/diagram";

export type SchemaIssueSeverity = "error" | "warning" | "info";

export type SchemaIssue = {
  id: string;
  ruleId: string;
  severity: SchemaIssueSeverity;
  title: string;
  message: string;
  tableIds: string[];
};

export const LINTER_THRESHOLDS = {
  hubInDegree: 8,
  lookupInDegree: 5,
  longFkChainDepth: 7,
  deleteBlastRadius: 15,
  duplicateColumnMinTables: 8,
  duplicateColumnMinTableRatio: 0.35,
  tenantScopeMaxHops: 6,
  prefixMatchRatio: 0.25,
  prefixCheckMinOutDegree: 3,
  junctionMinBusinessColumns: 2,
  junctionMaxColumns: 8,
  crossGroupEdgeSeverity: "info" as SchemaIssueSeverity,
} as const;

const COMMON_COLUMN_NAMES = new Set([
  "id",
  "uuid",
  "name",
  "title",
  "description",
  "status",
  "type",
  "kind",
  "code",
  "value",
  "label",
  "email",
  "created_at",
  "updated_at",
  "deleted_at",
  "modified_at",
  "created_on",
  "updated_on",
  "timestamp",
  "metadata",
  "data",
  "payload",
  "config",
  "settings",
  "version",
  "active",
  "enabled",
  "user_id",
]);

const TENANT_COLUMN_PATTERN =
  /^(tenant_id|organization_id|org_id|account_id|workspace_id|company_id|user_id|owner_id|member_id)$/i;

const SEVERITY_ORDER: Record<SchemaIssueSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

function issue(
  ruleId: string,
  severity: SchemaIssueSeverity,
  title: string,
  message: string,
  tableIds: string[],
  issueKey?: string,
): SchemaIssue {
  const key = issueKey ?? tableIds[0] ?? "global";
  return {
    id: `${ruleId}:${key}`,
    ruleId,
    severity,
    title,
    message,
    tableIds,
  };
}

function tablePrefix(tableName: string): string {
  const dotIndex = tableName.lastIndexOf(".");
  const shortName = dotIndex >= 0 ? tableName.slice(dotIndex + 1) : tableName;
  const underscore = shortName.indexOf("_");
  return underscore > 0 ? shortName.slice(0, underscore) : shortName;
}

function shortTableName(tableName: string): string {
  const dotIndex = tableName.lastIndexOf(".");
  return dotIndex >= 0 ? tableName.slice(dotIndex + 1) : tableName;
}

function issueTitle(label: string, tableName: string): string {
  return `${label}: ${shortTableName(tableName)}`;
}

function hasTenantColumn(node: TableFlowNode): boolean {
  return node.data.columns.some((col) => TENANT_COLUMN_PATTERN.test(col.name));
}

function isLookupExempt(
  tableId: string,
  inDegree: Map<string, number>,
  outDegree: Map<string, number>,
): boolean {
  return (
    (inDegree.get(tableId) ?? 0) >= LINTER_THRESHOLDS.hubInDegree &&
    (outDegree.get(tableId) ?? 0) === 0
  );
}

function fkColumnMatchesTable(fkColumn: string, referencedTable: string): boolean {
  const tableShort = shortTableName(referencedTable).toLowerCase();
  const columnLower = fkColumn.toLowerCase();

  if (columnLower === `${tableShort}_id`) return true;
  if (columnLower === tableShort) return true;

  const singularTable = tableShort.endsWith("s") ? tableShort.slice(0, -1) : tableShort;
  if (columnLower === `${singularTable}_id`) return true;

  const columnStem = columnLower.replace(/_id$/, "");
  if (columnStem === singularTable || columnStem === tableShort) return true;

  if (tableShort.startsWith(columnStem) || columnStem.startsWith(singularTable)) return true;
  if (tableShort.startsWith(`${columnStem}s`) || `${columnStem}s` === tableShort) return true;

  return false;
}

function sortIssues(issues: SchemaIssue[]): SchemaIssue[] {
  return [...issues].sort((a, b) => {
    const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.ruleId.localeCompare(b.ruleId);
  });
}

export function runSchemaLinterFromContext(
  ctx: SchemaGraphContext,
  grouping?: DiagramGrouping,
): SchemaIssue[] {
  if (ctx.nodes.length === 0) return [];

  const issues: SchemaIssue[] = [];
  const {
    nodes,
    edges,
    nodeIds,
    nodeById,
    directedAdj,
    reverseAdj,
    undirectedAdj,
    inDegree,
    outDegree,
  } = ctx;

  for (const node of nodes) {
    const pkCount = node.data.columns.filter((col) => col.isPrimaryKey).length;
    if (pkCount === 0) {
      issues.push(
        issue(
          "no-primary-key",
          "error",
          issueTitle("Missing PK", node.data.tableName),
          `${node.data.tableName} has no primary key columns.`,
          [node.id],
        ),
      );
    }
  }

  for (const tableId of getIsolatedTableIds(nodeIds, edges)) {
    const node = nodeById.get(tableId);
    if (!node) continue;
    issues.push(
      issue(
        "isolated-table",
        "info",
        "Isolated table",
        `${node.data.tableName} has no foreign key relationships.`,
        [tableId],
      ),
    );
  }

  const sccs = findStronglyConnectedComponents(nodeIds, directedAdj);
  for (const component of sccs) {
    if (component.length <= 1) continue;
    const names = component.map((id) => nodeById.get(id)?.data.tableName ?? id);
    const shortNames = names.map((name) => shortTableName(name));
    issues.push(
      issue(
        "fk-cycle",
        "warning",
        `FK cycle: ${shortNames.join(" → ")}`,
        `Circular FK chain: ${names.join(" → ")}.`,
        component,
      ),
    );
  }

  for (const edge of edges) {
    if (edge.source === edge.target) {
      const node = nodeById.get(edge.source);
      issues.push(
        issue(
          "self-referencing-fk",
          "info",
          "Self-referencing FK",
          `${node?.data.tableName ?? edge.source} references itself.`,
          [edge.source],
        ),
      );
    }
  }

  for (const nodeId of nodeIds) {
    const inDeg = inDegree.get(nodeId) ?? 0;
    if (inDeg >= LINTER_THRESHOLDS.hubInDegree) {
      const node = nodeById.get(nodeId);
      issues.push(
        issue(
          "hub-lookup",
          "info",
          "Hub / lookup table",
          `${node?.data.tableName ?? nodeId} is referenced by ${inDeg} tables.`,
          [nodeId],
        ),
      );
    }
  }

  const { maxDepth, deepestNode } = maxDirectedDepthFromRoots(nodeIds, directedAdj);
  if (maxDepth >= LINTER_THRESHOLDS.longFkChainDepth && deepestNode) {
    const node = nodeById.get(deepestNode);
    const deepestName = node?.data.tableName ?? deepestNode;
    issues.push(
      issue(
        "long-fk-chain",
        "warning",
        issueTitle("Long FK chain", deepestName),
        `FK dependency depth reaches ${maxDepth} hops (deepest: ${deepestName}).`,
        [deepestNode],
      ),
    );
  }

  for (const nodeId of nodeIds) {
    const dependents = countReverseDependents(nodeId, reverseAdj);
    if (dependents >= LINTER_THRESHOLDS.deleteBlastRadius) {
      const node = nodeById.get(nodeId);
      const tableName = node?.data.tableName ?? nodeId;
      issues.push(
        issue(
          "high-delete-blast-radius",
          "warning",
          issueTitle("Delete blast", tableName),
          `Deleting rows in ${tableName} could affect ${dependents} dependent tables.`,
          [nodeId],
        ),
      );
    }
  }

  for (const articulationPoint of findArticulationPoints(nodeIds, undirectedAdj)) {
    const inDeg = inDegree.get(articulationPoint) ?? 0;
    const outDeg = outDegree.get(articulationPoint) ?? 0;
    if (inDeg >= LINTER_THRESHOLDS.hubInDegree && outDeg <= 1) continue;

    const node = nodeById.get(articulationPoint);
    issues.push(
      issue(
        "bridge-table",
        "info",
        "Bridge table",
        `${node?.data.tableName ?? articulationPoint} connects separate parts of the schema graph.`,
        [articulationPoint],
      ),
    );
  }

  const components = findUndirectedComponents(nodeIds, undirectedAdj);
  if (components.length > 1) {
    const sorted = [...components].sort((a, b) => b.length - a.length);
    const summary = sorted
      .slice(0, 4)
      .map((comp) => `${comp.length} tables`)
      .join(", ");
    issues.push(
      issue(
        "multiple-components",
        "info",
        "Multiple disconnected islands",
        `Schema has ${components.length} disconnected components (${summary}).`,
        sorted[0] ?? [],
      ),
    );
  }

  for (const node of nodes) {
    const fkColumns = node.data.columns.filter((col) => col.isForeignKey);
    if (fkColumns.length < 2) continue;

    const keyColumnNames = new Set(
      node.data.columns
        .filter((col) => col.isPrimaryKey || col.isForeignKey)
        .map((col) => col.name),
    );
    const businessColumns = node.data.columns.filter((col) => !keyColumnNames.has(col.name));

    if (businessColumns.length >= LINTER_THRESHOLDS.junctionMinBusinessColumns) {
      if (node.data.columns.length > LINTER_THRESHOLDS.junctionMaxColumns) continue;

      issues.push(
        issue(
          "multi-fk-with-extra-columns",
          "warning",
          issueTitle("Multi-FK extras", node.data.tableName),
          `${node.data.tableName} has ${fkColumns.length} FK columns plus ${businessColumns.length} non-key column(s) on a small table — consider a separate entity.`,
          [node.id],
        ),
      );
    }
  }

  for (const nodeId of nodeIds) {
    const inDeg = inDegree.get(nodeId) ?? 0;
    const outDeg = outDegree.get(nodeId) ?? 0;
    if (inDeg >= LINTER_THRESHOLDS.lookupInDegree && outDeg >= 1) {
      const node = nodeById.get(nodeId);
      const tableName = node?.data.tableName ?? nodeId;
      issues.push(
        issue(
          "lookup-with-outgoing-fk",
          "warning",
          issueTitle("Lookup + FK out", tableName),
          `${tableName} is heavily referenced (${inDeg}) but also references other tables.`,
          [nodeId],
        ),
      );
    }
  }

  if (grouping && Object.keys(grouping.assignments).length > 0) {
    const crossGroupBySource = new Map<string, string[]>();

    for (const edge of edges) {
      const sourceGroup = grouping.assignments[edge.source];
      const targetGroup = grouping.assignments[edge.target];
      if (!sourceGroup || !targetGroup || sourceGroup === targetGroup) continue;

      const targetNode = nodeById.get(edge.target);
      const targetName = targetNode?.data.tableName ?? edge.target;
      const existing = crossGroupBySource.get(edge.source) ?? [];
      if (!existing.includes(targetName)) {
        existing.push(targetName);
        crossGroupBySource.set(edge.source, existing);
      }
    }

    for (const [sourceId, targets] of crossGroupBySource) {
      const sourceNode = nodeById.get(sourceId);
      const sourceName = sourceNode?.data.tableName ?? sourceId;
      const preview = targets.slice(0, 3).join(", ");
      const suffix = targets.length > 3 ? ` (+${targets.length - 3} more)` : "";

      issues.push(
        issue(
          "cross-group-edge",
          LINTER_THRESHOLDS.crossGroupEdgeSeverity,
          `Cross-group FKs (${targets.length})`,
          `${sourceName} references ${targets.length} table(s) in other groups: ${preview}${suffix}.`,
          [sourceId],
          sourceId,
        ),
      );
    }
  }

  const columnToTables = new Map<string, string[]>();
  for (const node of nodes) {
    for (const column of node.data.columns) {
      const existing = columnToTables.get(column.name) ?? [];
      if (!existing.includes(node.id)) {
        existing.push(node.id);
        columnToTables.set(column.name, existing);
      }
    }
  }

  const duplicateColumnMinTables = Math.max(
    LINTER_THRESHOLDS.duplicateColumnMinTables,
    Math.ceil(nodes.length * LINTER_THRESHOLDS.duplicateColumnMinTableRatio),
  );

  for (const [columnName, tableIds] of columnToTables) {
    if (COMMON_COLUMN_NAMES.has(columnName.toLowerCase())) continue;
    if (tableIds.length < duplicateColumnMinTables) continue;
    const tableNames = tableIds.map((id) => nodeById.get(id)?.data.tableName ?? id);
    issues.push(
      issue(
        "duplicate-column-name",
        "info",
        "Repeated column name",
        `Column "${columnName}" appears on ${tableIds.length} tables (${tableNames.slice(0, 3).join(", ")}${tableNames.length > 3 ? "…" : ""}).`,
        tableIds,
        columnName,
      ),
    );
  }

  for (const edge of edges) {
    const data = edge.data as FkEdgeData | undefined;
    if (!data) continue;
    if (fkColumnMatchesTable(data.fromColumn, data.toTable)) continue;

    issues.push(
      issue(
        "fk-column-name-mismatch",
        "info",
        "FK column name mismatch",
        `${data.fromTable}.${data.fromColumn} references ${data.toTable}.${data.toColumn} — column name doesn't match table.`,
        [edge.source],
        edge.id || `${edge.source}:${data.fromColumn}->${data.toTable}`,
      ),
    );
  }

  for (const node of nodes) {
    const outNeighbors = directedAdj.get(node.id) ?? [];
    if (outNeighbors.length < LINTER_THRESHOLDS.prefixCheckMinOutDegree) continue;

    const tablePrefixName = tablePrefix(node.data.tableName);
    let matchCount = 0;
    for (const targetId of outNeighbors) {
      const targetNode = nodeById.get(targetId);
      if (!targetNode) continue;
      if (tablePrefix(targetNode.data.tableName) === tablePrefixName) {
        matchCount++;
      }
    }

    const ratio = matchCount / outNeighbors.length;
    if (ratio < LINTER_THRESHOLDS.prefixMatchRatio) {
      issues.push(
        issue(
          "prefix-domain-mismatch",
          "info",
          "Prefix domain mismatch",
          `${node.data.tableName} (${tablePrefixName}_*) mostly references tables outside its prefix (${Math.round(ratio * 100)}% match).`,
          [node.id],
        ),
      );
    }
  }

  const tenantScopedTables = new Set<string>();
  for (const node of nodes) {
    if (hasTenantColumn(node)) {
      tenantScopedTables.add(node.id);
    }
  }

  for (const node of nodes) {
    const outDeg = outDegree.get(node.id) ?? 0;
    const inDeg = inDegree.get(node.id) ?? 0;
    if (outDeg === 0 && inDeg === 0) continue;
    if (outDeg === 0 && inDeg < LINTER_THRESHOLDS.lookupInDegree) continue;
    if (hasTenantColumn(node)) continue;
    if (isLookupExempt(node.id, inDegree, outDegree)) continue;

    const reachable = reachableWithinHops(
      node.id,
      undirectedAdj,
      LINTER_THRESHOLDS.tenantScopeMaxHops,
    );

    let foundTenantScope = false;
    for (const reachableId of reachable) {
      const reachableNode = nodeById.get(reachableId);
      if (reachableNode && hasTenantColumn(reachableNode)) {
        foundTenantScope = true;
        break;
      }
    }

    if (!foundTenantScope) {
      issues.push(
        issue(
          "unscoped-tenant-path",
          "info",
          "No tenant scope path",
          `${node.data.tableName} has no tenant-like column and no path within ${LINTER_THRESHOLDS.tenantScopeMaxHops} hops to one.`,
          [node.id],
        ),
      );
    }
  }

  for (const node of nodes) {
    if (hasTenantColumn(node)) continue;

    const fkTargets = new Set<string>();
    for (const edge of edges) {
      if (edge.source === node.id) {
        fkTargets.add(edge.target);
      }
    }

    if (fkTargets.size < 2) continue;

    const scopedTargets = [...fkTargets].filter((id) => tenantScopedTables.has(id));
    if (scopedTargets.length < 2) continue;

    issues.push(
      issue(
        "bridge-without-tenant-key",
        "info",
        "Bridge without tenant key",
        `${node.data.tableName} links tenant-scoped tables but has no tenant-like column.`,
        [node.id],
      ),
    );
  }

  return sortIssues(issues);
}

export function runSchemaLinter(
  nodes: TableFlowNode[],
  edges: Edge[],
  grouping?: DiagramGrouping,
): SchemaIssue[] {
  return runSchemaLinterFromContext(buildSchemaGraphContext(nodes, edges), grouping);
}

export function countIssuesBySeverity(
  issues: SchemaIssue[],
): Record<SchemaIssueSeverity, number> {
  const counts: Record<SchemaIssueSeverity, number> = {
    error: 0,
    warning: 0,
    info: 0,
  };
  for (const item of issues) {
    counts[item.severity]++;
  }
  return counts;
}
