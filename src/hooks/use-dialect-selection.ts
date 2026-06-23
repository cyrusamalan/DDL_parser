"use client";

import { useCallback, useState } from "react";
import {
  detectDialectFromInput,
  sqlForDialectDetection,
  type DialectSource,
} from "@/lib/ddl/detect-dialect";
import type { SqlDialect, SqlFileEntry } from "@/lib/types/diagram";

type UseDialectSelectionOptions = {
  initialDialect?: SqlDialect;
  initialUserOverride?: boolean;
};

export function useDialectSelection({
  initialDialect = "postgresql",
  initialUserOverride = false,
}: UseDialectSelectionOptions = {}) {
  const [dialect, setDialect] = useState<SqlDialect>(initialDialect);
  const [dialectSource, setDialectSource] = useState<DialectSource>(
    initialUserOverride ? "manual" : "auto",
  );

  const syncFromInput = useCallback(
    (sql: string, files: SqlFileEntry[]) => {
      if (dialectSource !== "auto") return;
      const content = sqlForDialectDetection(sql, files);
      if (!content.trim()) return;
      setDialect(detectDialectFromInput(sql, files));
    },
    [dialectSource],
  );

  const setManualDialect = useCallback((next: SqlDialect) => {
    setDialect(next);
    setDialectSource("manual");
  }, []);

  const resetToAuto = useCallback((sql: string, files: SqlFileEntry[]) => {
    setDialectSource("auto");
    const content = sqlForDialectDetection(sql, files);
    if (content.trim()) {
      setDialect(detectDialectFromInput(sql, files));
    }
  }, []);

  return {
    dialect,
    dialectSource,
    dialectUserOverride: dialectSource === "manual",
    syncFromInput,
    setManualDialect,
    resetToAuto,
  };
}
