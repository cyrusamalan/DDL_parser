export type CreateLogLevel = "info" | "ok" | "warn" | "error";

export type CreateLogEntry = {
  id: string;
  at: string;
  phase: string;
  level: CreateLogLevel;
  message: string;
  detail?: string;
  durationMs?: number;
  meta?: Record<string, string | number | boolean>;
};

const LOG_PREFIX = "[diagram-create]";

function entryId(): string {
  return crypto.randomUUID().slice(0, 8);
}

function formatConsoleLine(entry: CreateLogEntry): string {
  const parts = [
    `${LOG_PREFIX} run=${entry.meta?.runId ?? "?"}`,
    `phase=${entry.phase}`,
    `level=${entry.level}`,
    entry.durationMs !== undefined ? `durationMs=${entry.durationMs}` : null,
    entry.message,
  ].filter(Boolean);

  const metaKeys = entry.meta
    ? Object.keys(entry.meta).filter((key) => key !== "runId")
    : [];
  const metaSuffix =
    metaKeys.length > 0
      ? ` ${metaKeys.map((key) => `${key}=${String(entry.meta![key])}`).join(" ")}`
      : "";

  const detailSuffix = entry.detail ? ` | ${entry.detail}` : "";
  return `${parts.join(" ")}${metaSuffix}${detailSuffix}`;
}

export class CreateRunLogger {
  readonly runId: string;
  private entries: CreateLogEntry[] = [];
  private phaseStartedAt = new Map<string, number>();

  constructor(runId = crypto.randomUUID()) {
    this.runId = runId;
  }

  getEntries(): readonly CreateLogEntry[] {
    return this.entries;
  }

  private push(entry: Omit<CreateLogEntry, "id" | "at" | "meta"> & { meta?: CreateLogEntry["meta"] }) {
    const full: CreateLogEntry = {
      id: entryId(),
      at: new Date().toISOString(),
      ...entry,
      meta: { runId: this.runId, ...entry.meta },
    };
    this.entries.push(full);

    const line = formatConsoleLine(full);
    if (full.level === "error") {
      console.error(line);
    } else if (full.level === "warn") {
      console.warn(line);
    } else {
      console.info(line);
    }

    return full;
  }

  start(phase: string, message: string, meta?: CreateLogEntry["meta"]) {
    this.phaseStartedAt.set(phase, performance.now());
    return this.push({ phase, level: "info", message, meta });
  }

  ok(phase: string, message: string, meta?: CreateLogEntry["meta"]) {
    const started = this.phaseStartedAt.get(phase);
    const durationMs = started !== undefined ? Math.round(performance.now() - started) : undefined;
    this.phaseStartedAt.delete(phase);
    return this.push({ phase, level: "ok", message, durationMs, meta });
  }

  warn(phase: string, message: string, detail?: string, meta?: CreateLogEntry["meta"]) {
    const started = this.phaseStartedAt.get(phase);
    const durationMs = started !== undefined ? Math.round(performance.now() - started) : undefined;
    this.phaseStartedAt.delete(phase);
    return this.push({ phase, level: "warn", message, detail, durationMs, meta });
  }

  fail(phase: string, message: string, detail?: string, meta?: CreateLogEntry["meta"]) {
    const started = this.phaseStartedAt.get(phase);
    const durationMs = started !== undefined ? Math.round(performance.now() - started) : undefined;
    this.phaseStartedAt.delete(phase);
    return this.push({ phase, level: "error", message, detail, durationMs, meta });
  }

  toClipboardText(): string {
    return this.entries
      .map((entry) => {
        const time = entry.at.slice(11, 23);
        const duration = entry.durationMs !== undefined ? ` (${entry.durationMs}ms)` : "";
        const meta =
          entry.meta && Object.keys(entry.meta).length > 1
            ? ` {${Object.entries(entry.meta)
                .filter(([key]) => key !== "runId")
                .map(([key, value]) => `${key}=${value}`)
                .join(", ")}}`
            : "";
        const detail = entry.detail ? `\n    ${entry.detail}` : "";
        return `${time} [${entry.level}] ${entry.phase}${duration}: ${entry.message}${meta}${detail}`;
      })
      .join("\n");
  }

  persistForSupport() {
    try {
      sessionStorage.setItem(
        `diagram-create:last-run`,
        JSON.stringify({ runId: this.runId, entries: this.entries }),
      );
    } catch {
      // ignore quota / private mode
    }
  }
}

export function readLastCreateRun(): { runId: string; entries: CreateLogEntry[] } | null {
  try {
    const raw = sessionStorage.getItem("diagram-create:last-run");
    if (!raw) return null;
    return JSON.parse(raw) as { runId: string; entries: CreateLogEntry[] };
  } catch {
    return null;
  }
}
