"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { groupForNode } from "@/lib/ddl/table-grouping";
import type { DiagramColumnView, DiagramGrouping, TableGroup } from "@/lib/types/diagram";

type DiagramDisplayContextValue = {
  columnView: DiagramColumnView;
  getGroupForNode: (nodeId: string) => TableGroup | undefined;
};

const DiagramDisplayContext = createContext<DiagramDisplayContextValue>({
  columnView: "full",
  getGroupForNode: () => undefined,
});

export function DiagramDisplayProvider({
  columnView,
  grouping,
  children,
}: {
  columnView: DiagramColumnView;
  grouping: DiagramGrouping;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      columnView,
      getGroupForNode: (nodeId: string) => groupForNode(grouping, nodeId),
    }),
    [columnView, grouping],
  );

  return (
    <DiagramDisplayContext.Provider value={value}>
      {children}
    </DiagramDisplayContext.Provider>
  );
}

export function useDiagramDisplay() {
  return useContext(DiagramDisplayContext);
}
