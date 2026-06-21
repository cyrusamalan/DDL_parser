import { notFound } from "next/navigation";
import { getDiagram } from "@/actions/diagrams";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

type WorkspacePageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { id } = await params;
  const diagramId = Number(id);

  if (!Number.isFinite(diagramId)) {
    notFound();
  }

  const diagram = await getDiagram(diagramId);
  if (!diagram) {
    notFound();
  }

  return <WorkspaceShell diagram={diagram} />;
}
