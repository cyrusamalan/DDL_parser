"use client";

import { useEffect, useMemo, useState } from "react";
import { EMPTY_SCHEMA_STATS } from "@/lib/ddl/schema-stats";
import { runSchemaAnalysis, type SchemaAnalysisResult } from "@/lib/ddl/schema-analysis";
import type { Edge } from "@xyflow/react";
import type { DiagramGrouping, TableFlowNode } from "@/lib/types/diagram";

const EMPTY_ANALYSIS: SchemaAnalysisResult = {
  stats: EMPTY_SCHEMA_STATS,
  issues: [],
  bottlenecks: [],
};

const DEBOUNCE_MS = 200;

type AnalysisInput = {
  nodes: TableFlowNode[];
  edges: Edge[];
  grouping: DiagramGrouping;
};

function useDebouncedAnalysisInput(
  nodes: TableFlowNode[],
  edges: Edge[],
  grouping: DiagramGrouping,
): { input: AnalysisInput; isAnalyzing: boolean } {
  const [debounced, setDebounced] = useState<AnalysisInput>({ nodes, edges, grouping });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebounced({ nodes, edges, grouping });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [nodes, edges, grouping]);

  const isAnalyzing =
    nodes.length > 0 &&
    (debounced.nodes !== nodes || debounced.edges !== edges || debounced.grouping !== grouping);

  if (nodes.length === 0) {
    return { input: { nodes: [], edges: [], grouping }, isAnalyzing: false };
  }

  return { input: debounced, isAnalyzing };
}

export function useSchemaAnalysis(
  nodes: TableFlowNode[],
  edges: Edge[],
  grouping: DiagramGrouping,
): SchemaAnalysisResult & { isAnalyzing: boolean } {
  const { input, isAnalyzing } = useDebouncedAnalysisInput(nodes, edges, grouping);

  const result = useMemo(() => {
    if (input.nodes.length === 0) {
      return EMPTY_ANALYSIS;
    }
    return runSchemaAnalysis(input.nodes, input.edges, input.grouping);
  }, [input]);

  return { ...result, isAnalyzing };
}
