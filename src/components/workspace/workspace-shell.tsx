import type { Diagram } from "@/lib/types/diagram";
import { WorkspaceClient } from "@/components/workspace/workspace-client";

type WorkspaceShellProps = {
  diagram: Diagram;
};

export function WorkspaceShell({ diagram }: WorkspaceShellProps) {
  return <WorkspaceClient key={diagram.id} diagram={diagram} />;
}
