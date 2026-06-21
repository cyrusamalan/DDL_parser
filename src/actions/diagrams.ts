"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getSql } from "@/lib/db";
import type { CanvasState, Diagram, DiagramSummary } from "@/lib/types/diagram";

async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export async function listDiagrams(): Promise<DiagramSummary[]> {
  const userId = await requireUserId();

  const sql = getSql();
  const rows = await sql`
    SELECT id, project_name, updated_at
    FROM diagrams
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `;

  return rows.map((row) => ({
    id: Number(row.id),
    project_name: String(row.project_name),
    updated_at: new Date(String(row.updated_at)).toISOString(),
  }));
}

export async function getDiagram(id: number): Promise<Diagram | null> {
  const userId = await requireUserId();

  const sql = getSql();
  const rows = await sql`
    SELECT id, project_name, canvas_state, updated_at
    FROM diagrams
    WHERE id = ${id} AND user_id = ${userId}
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: Number(row.id),
    project_name: String(row.project_name),
    updated_at: new Date(String(row.updated_at)).toISOString(),
    canvas_state: row.canvas_state as CanvasState,
  };
}

export async function createDiagram(
  projectName: string,
  canvasState: CanvasState,
): Promise<number> {
  const userId = await requireUserId();
  const name = projectName.trim().slice(0, 100) || "Untitled Project";

  const sql = getSql();
  const rows = await sql`
    INSERT INTO diagrams (user_id, project_name, canvas_state)
    VALUES (${userId}, ${name}, ${JSON.stringify(canvasState)}::jsonb)
    RETURNING id
  `;

  revalidatePath("/dashboard");
  return Number(rows[0].id);
}

export async function updateDiagram(
  id: number,
  canvasState: CanvasState,
  projectName?: string,
): Promise<void> {
  const userId = await requireUserId();
  const sql = getSql();

  if (projectName !== undefined) {
    const name = projectName.trim().slice(0, 100) || "Untitled Project";
    await sql`
      UPDATE diagrams
      SET canvas_state = ${JSON.stringify(canvasState)}::jsonb,
          project_name = ${name}
      WHERE id = ${id} AND user_id = ${userId}
    `;
  } else {
    await sql`
      UPDATE diagrams
      SET canvas_state = ${JSON.stringify(canvasState)}::jsonb
      WHERE id = ${id} AND user_id = ${userId}
    `;
  }

  revalidatePath("/dashboard");
  revalidatePath(`/workspace/${id}`);
}

export async function deleteDiagram(id: number): Promise<void> {
  const userId = await requireUserId();
  const sql = getSql();

  await sql`
    DELETE FROM diagrams
    WHERE id = ${id} AND user_id = ${userId}
  `;

  revalidatePath("/dashboard");
}
