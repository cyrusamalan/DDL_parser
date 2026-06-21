import type {
  DiagramGrouping,
  TableGroup,
  TableGroupColor,
} from "@/lib/types/diagram";

export const TABLE_GROUP_COLORS: TableGroupColor[] = [
  "indigo",
  "emerald",
  "violet",
  "amber",
  "rose",
  "cyan",
  "orange",
  "teal",
];

const HEADER_CLASSES: Record<TableGroupColor, string> = {
  indigo:
    "from-indigo-100 to-indigo-50 dark:from-indigo-950/80 dark:to-indigo-900/40 border-indigo-200 dark:border-indigo-800",
  emerald:
    "from-emerald-100 to-emerald-50 dark:from-emerald-950/80 dark:to-emerald-900/40 border-emerald-200 dark:border-emerald-800",
  violet:
    "from-violet-100 to-violet-50 dark:from-violet-950/80 dark:to-violet-900/40 border-violet-200 dark:border-violet-800",
  amber:
    "from-amber-100 to-amber-50 dark:from-amber-950/80 dark:to-amber-900/40 border-amber-200 dark:border-amber-800",
  rose: "from-rose-100 to-rose-50 dark:from-rose-950/80 dark:to-rose-900/40 border-rose-200 dark:border-rose-800",
  cyan: "from-cyan-100 to-cyan-50 dark:from-cyan-950/80 dark:to-cyan-900/40 border-cyan-200 dark:border-cyan-800",
  orange:
    "from-orange-100 to-orange-50 dark:from-orange-950/80 dark:to-orange-900/40 border-orange-200 dark:border-orange-800",
  teal: "from-teal-100 to-teal-50 dark:from-teal-950/80 dark:to-teal-900/40 border-teal-200 dark:border-teal-800",
};

const BORDER_CLASSES: Record<TableGroupColor, string> = {
  indigo: "border-indigo-300/80 dark:border-indigo-700/80",
  emerald: "border-emerald-300/80 dark:border-emerald-700/80",
  violet: "border-violet-300/80 dark:border-violet-700/80",
  amber: "border-amber-300/80 dark:border-amber-700/80",
  rose: "border-rose-300/80 dark:border-rose-700/80",
  cyan: "border-cyan-300/80 dark:border-cyan-700/80",
  orange: "border-orange-300/80 dark:border-orange-700/80",
  teal: "border-teal-300/80 dark:border-teal-700/80",
};

const BODY_TINT_CLASSES: Record<TableGroupColor, string> = {
  indigo: "bg-indigo-50/30 dark:bg-indigo-950/15",
  emerald: "bg-emerald-50/30 dark:bg-emerald-950/15",
  violet: "bg-violet-50/30 dark:bg-violet-950/15",
  amber: "bg-amber-50/30 dark:bg-amber-950/15",
  rose: "bg-rose-50/30 dark:bg-rose-950/15",
  cyan: "bg-cyan-50/30 dark:bg-cyan-950/15",
  orange: "bg-orange-50/30 dark:bg-orange-950/15",
  teal: "bg-teal-50/30 dark:bg-teal-950/15",
};

const SWATCH_CLASSES: Record<TableGroupColor, string> = {
  indigo: "bg-indigo-400",
  emerald: "bg-emerald-400",
  violet: "bg-violet-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
  cyan: "bg-cyan-400",
  orange: "bg-orange-400",
  teal: "bg-teal-400",
};

export const DEFAULT_GROUPING: DiagramGrouping = {
  groups: [],
  assignments: {},
};

export type GroupStyles = {
  header: string;
  border: string;
  bodyTint: string;
  swatch: string;
};

export function groupStyles(color: TableGroupColor): GroupStyles {
  return {
    header: HEADER_CLASSES[color],
    border: BORDER_CLASSES[color],
    bodyTint: BODY_TINT_CLASSES[color],
    swatch: SWATCH_CLASSES[color],
  };
}

export function groupSwatchClass(color: TableGroupColor): string {
  return SWATCH_CLASSES[color];
}

function isTableGroupColor(value: string): value is TableGroupColor {
  return TABLE_GROUP_COLORS.includes(value as TableGroupColor);
}

function sanitizeGroup(group: TableGroup): TableGroup {
  return {
    id: group.id,
    name: group.name.trim() || "Group",
    color: isTableGroupColor(group.color) ? group.color : "indigo",
  };
}

export function mergeGrouping(saved?: DiagramGrouping | null): DiagramGrouping {
  if (!saved) return { ...DEFAULT_GROUPING };

  const groups = Array.isArray(saved.groups) ? saved.groups.map(sanitizeGroup) : [];
  const assignments =
    saved.assignments && typeof saved.assignments === "object" ? { ...saved.assignments } : {};

  const groupIds = new Set(groups.map((group) => group.id));
  const cleanedAssignments: Record<string, string> = {};
  for (const [nodeId, groupId] of Object.entries(assignments)) {
    if (groupIds.has(groupId)) {
      cleanedAssignments[nodeId] = groupId;
    }
  }

  return { groups, assignments: cleanedAssignments };
}

function nextDefaultColor(groups: TableGroup[]): TableGroupColor {
  const used = new Set(groups.map((group) => group.color));
  const available = TABLE_GROUP_COLORS.find((color) => !used.has(color));
  return available ?? TABLE_GROUP_COLORS[groups.length % TABLE_GROUP_COLORS.length];
}

function nextGroupName(groups: TableGroup[]): string {
  let index = groups.length + 1;
  while (groups.some((group) => group.name === `Group ${index}`)) {
    index++;
  }
  return `Group ${index}`;
}

export function createGroup(grouping: DiagramGrouping): DiagramGrouping {
  const id = crypto.randomUUID();
  return {
    groups: [
      ...grouping.groups,
      {
        id,
        name: nextGroupName(grouping.groups),
        color: nextDefaultColor(grouping.groups),
      },
    ],
    assignments: { ...grouping.assignments },
  };
}

export function renameGroup(
  grouping: DiagramGrouping,
  groupId: string,
  name: string,
): DiagramGrouping {
  return {
    ...grouping,
    groups: grouping.groups.map((group) =>
      group.id === groupId ? { ...group, name: name.trim() || group.name } : group,
    ),
  };
}

export function setGroupColor(
  grouping: DiagramGrouping,
  groupId: string,
  color: TableGroupColor,
): DiagramGrouping {
  return {
    ...grouping,
    groups: grouping.groups.map((group) =>
      group.id === groupId ? { ...group, color } : group,
    ),
  };
}

export function deleteGroup(grouping: DiagramGrouping, groupId: string): DiagramGrouping {
  const assignments = { ...grouping.assignments };
  for (const [nodeId, assignedGroupId] of Object.entries(assignments)) {
    if (assignedGroupId === groupId) {
      delete assignments[nodeId];
    }
  }

  return {
    groups: grouping.groups.filter((group) => group.id !== groupId),
    assignments,
  };
}

export function assignTable(
  grouping: DiagramGrouping,
  nodeId: string,
  groupId: string,
): DiagramGrouping {
  if (!grouping.groups.some((group) => group.id === groupId)) {
    return grouping;
  }

  return {
    ...grouping,
    assignments: { ...grouping.assignments, [nodeId]: groupId },
  };
}

export function unassignTable(grouping: DiagramGrouping, nodeId: string): DiagramGrouping {
  const assignments = { ...grouping.assignments };
  delete assignments[nodeId];
  return { ...grouping, assignments };
}

export function pruneAssignments(
  grouping: DiagramGrouping,
  nodeIds: string[],
): DiagramGrouping {
  const validIds = new Set(nodeIds);
  const assignments: Record<string, string> = {};

  for (const [nodeId, groupId] of Object.entries(grouping.assignments)) {
    if (validIds.has(nodeId)) {
      assignments[nodeId] = groupId;
    }
  }

  return { ...grouping, assignments };
}

export function groupForNode(
  grouping: DiagramGrouping,
  nodeId: string,
): TableGroup | undefined {
  const groupId = grouping.assignments[nodeId];
  if (!groupId) return undefined;
  return grouping.groups.find((group) => group.id === groupId);
}

export function tablesForGroup(grouping: DiagramGrouping, groupId: string): string[] {
  return Object.entries(grouping.assignments)
    .filter(([, assignedGroupId]) => assignedGroupId === groupId)
    .map(([nodeId]) => nodeId);
}

export function ungroupedNodeIds(nodeIds: string[], grouping: DiagramGrouping): string[] {
  return nodeIds.filter((nodeId) => !grouping.assignments[nodeId]);
}

export function groupsWithAssignments(grouping: DiagramGrouping): TableGroup[] {
  const assignedGroupIds = new Set(Object.values(grouping.assignments));
  return grouping.groups.filter((group) => assignedGroupIds.has(group.id));
}

export function buildNodePartitions(
  grouping: DiagramGrouping | undefined,
  nodeIds: string[],
): Map<string, number> | null {
  if (!grouping || Object.keys(grouping.assignments).length === 0) {
    return null;
  }

  const groupPartition = new Map<string, number>();
  grouping.groups.forEach((group, index) => {
    groupPartition.set(group.id, index + 1);
  });

  const partitions = new Map<string, number>();
  for (const nodeId of nodeIds) {
    const groupId = grouping.assignments[nodeId];
    partitions.set(nodeId, groupId ? (groupPartition.get(groupId) ?? 0) : 0);
  }

  return partitions;
}

export type AiGroupingSuggestion = {
  groups: {
    name: string;
    tables: string[];
  }[];
};

const MAX_AI_GROUPS = 12;

export function groupingFromAiSuggestion(
  suggestion: AiGroupingSuggestion,
  nodeIds: string[],
): DiagramGrouping {
  const validNodeIds = new Set(nodeIds);
  const assigned = new Set<string>();
  const groups: TableGroup[] = [];
  const assignments: Record<string, string> = {};

  let rawGroups = suggestion.groups
    .map((group) => ({
      name: group.name.trim() || "Group",
      tables: group.tables.filter((tableId) => validNodeIds.has(tableId)),
    }))
    .filter((group) => group.tables.length > 0);

  if (rawGroups.length > MAX_AI_GROUPS) {
    const kept = rawGroups.slice(0, MAX_AI_GROUPS - 1);
    const overflowTables = rawGroups.slice(MAX_AI_GROUPS - 1).flatMap((group) => group.tables);
    kept.push({ name: "Other", tables: overflowTables });
    rawGroups = kept;
  }

  rawGroups.forEach((rawGroup, index) => {
    const id = crypto.randomUUID();
    groups.push({
      id,
      name: rawGroup.name,
      color: TABLE_GROUP_COLORS[index % TABLE_GROUP_COLORS.length],
    });

    for (const tableId of rawGroup.tables) {
      if (assigned.has(tableId)) continue;
      assigned.add(tableId);
      assignments[tableId] = id;
    }
  });

  return { groups, assignments };
}
