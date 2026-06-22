import { tablesForGroup, ungroupedNodeIds } from "@/lib/ddl/table-grouping";
import type { DiagramGrouping } from "@/lib/types/diagram";

export type GroupFocusId = string | "ungrouped";

export function nodeIdsForGroupFocus(
  groupId: GroupFocusId,
  grouping: DiagramGrouping,
  allNodeIds: string[],
): string[] {
  const ids =
    groupId === "ungrouped"
      ? ungroupedNodeIds(allNodeIds, grouping)
      : tablesForGroup(grouping, groupId);
  return ids;
}

export function maxZoomForGroupFocus(tableCount: number): number {
  if (tableCount <= 3) return 1.2;
  if (tableCount <= 8) return 1;
  return 0.75;
}

export function groupFocusLabel(
  groupId: GroupFocusId,
  grouping: DiagramGrouping,
  tableCount: number,
): string {
  if (groupId === "ungrouped") {
    return `Ungrouped (${tableCount} table${tableCount === 1 ? "" : "s"})`;
  }
  const name = grouping.groups.find((group) => group.id === groupId)?.name ?? "Group";
  return `${name} (${tableCount} table${tableCount === 1 ? "" : "s"})`;
}
