type ServerCreateLogInput = {
  runId?: string | null;
  phase: string;
  level?: "info" | "ok" | "warn" | "error";
  message: string;
  durationMs?: number;
  meta?: Record<string, string | number | boolean>;
  detail?: string;
};

export function logDiagramCreate({
  runId,
  phase,
  level = "info",
  message,
  durationMs,
  meta,
  detail,
}: ServerCreateLogInput) {
  const payload = {
    runId: runId ?? "unknown",
    phase,
    level,
    message,
    ...(durationMs !== undefined ? { durationMs } : {}),
    ...(meta ?? {}),
    ...(detail ? { detail } : {}),
  };

  const line = `[diagram-create] ${JSON.stringify(payload)}`;
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}
