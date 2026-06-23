import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { estimateCanvasStateBytes } from "@/lib/canvas-state-size";
import { insertDiagram } from "@/lib/diagram-persistence";
import { logDiagramCreate } from "@/lib/server/diagram-create-log";
import type { CanvasState } from "@/lib/types/diagram";

type CreateDiagramBody = {
  projectName: string;
  canvasState: CanvasState;
};

function runIdFromRequest(request: Request): string | null {
  return request.headers.get("x-diagram-create-run");
}

export async function POST(request: Request) {
  const runId = runIdFromRequest(request);
  const startedAt = performance.now();

  logDiagramCreate({
    runId,
    phase: "api.auth",
    message: "Authenticating create request",
  });

  const { userId } = await auth();
  if (!userId) {
    logDiagramCreate({
      runId,
      phase: "api.auth",
      level: "error",
      message: "Unauthorized",
      durationMs: Math.round(performance.now() - startedAt),
    });
    return NextResponse.json({ error: "Unauthorized", runId }, { status: 401 });
  }

  let body: CreateDiagramBody;
  let bodyBytes = 0;
  try {
    const raw = await request.text();
    bodyBytes = new TextEncoder().encode(raw).length;
    body = JSON.parse(raw) as CreateDiagramBody;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Invalid JSON";
    logDiagramCreate({
      runId,
      phase: "api.parse-body",
      level: "error",
      message: "Invalid request body",
      detail,
      durationMs: Math.round(performance.now() - startedAt),
      meta: { bodyBytes },
    });
    return NextResponse.json({ error: "Invalid request body.", runId }, { status: 400 });
  }

  if (!body?.canvasState || typeof body.canvasState !== "object") {
    logDiagramCreate({
      runId,
      phase: "api.validate",
      level: "error",
      message: "Missing canvas_state",
      durationMs: Math.round(performance.now() - startedAt),
      meta: { bodyBytes },
    });
    return NextResponse.json({ error: "Missing diagram data.", runId }, { status: 400 });
  }

  const nodeCount = body.canvasState.nodes?.length ?? 0;
  const edgeCount = body.canvasState.edges?.length ?? 0;
  const sqlFileCount = body.canvasState.sqlFiles?.length ?? 0;
  const canvasBytes = estimateCanvasStateBytes(body.canvasState);

  logDiagramCreate({
    runId,
    phase: "api.insert",
    message: "Inserting diagram row",
    meta: {
      bodyBytes,
      canvasBytes,
      nodeCount,
      edgeCount,
      sqlFileCount,
      dialect: body.canvasState.dialect ?? "postgresql",
    },
  });

  const insertStartedAt = performance.now();
  try {
    const id = await insertDiagram(userId, body.projectName ?? "", body.canvasState);
    const insertMs = Math.round(performance.now() - insertStartedAt);
    const totalMs = Math.round(performance.now() - startedAt);

    logDiagramCreate({
      runId,
      phase: "api.insert",
      level: "ok",
      message: "Diagram saved",
      durationMs: insertMs,
      meta: { diagramId: id, totalMs },
    });

    return NextResponse.json({ id, runId });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Insert failed";
    logDiagramCreate({
      runId,
      phase: "api.insert",
      level: "error",
      message: "Database insert failed",
      detail,
      durationMs: Math.round(performance.now() - startedAt),
      meta: { bodyBytes, canvasBytes, nodeCount, edgeCount },
    });
    return NextResponse.json({ error: "Could not save diagram.", runId, detail }, { status: 500 });
  }
}
