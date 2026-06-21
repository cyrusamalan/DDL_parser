"use server";

import { auth } from "@clerk/nextjs/server";
import type { Edge } from "@xyflow/react";
import { suggestTableGrouping, type AiGroupingResult } from "@/lib/ai/gemini-grouping";
import type { TableFlowNode } from "@/lib/types/diagram";

async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export async function autoGroupTables(
  nodes: TableFlowNode[],
  edges: Edge[],
): Promise<AiGroupingResult> {
  await requireUserId();
  return suggestTableGrouping(nodes, edges);
}
