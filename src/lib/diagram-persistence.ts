import { getSql } from "@/lib/db";
import type { CanvasState } from "@/lib/types/diagram";

export async function insertDiagram(
  userId: string,
  projectName: string,
  canvasState: CanvasState,
): Promise<number> {
  const name = projectName.trim().slice(0, 100) || "Untitled Project";
  const sql = getSql();

  const rows = await sql`
    INSERT INTO diagrams (user_id, project_name, canvas_state)
    VALUES (${userId}, ${name}, ${JSON.stringify(canvasState)}::jsonb)
    RETURNING id
  `;

  return Number(rows[0].id);
}
