"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type WorkspaceHeaderState = {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  saveStatus: SaveStatus;
};

type WorkspaceHeaderContextValue = {
  state: WorkspaceHeaderState | null;
  setState: (state: WorkspaceHeaderState | null) => void;
};

const WorkspaceHeaderContext = createContext<WorkspaceHeaderContextValue | null>(null);

export function WorkspaceHeaderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceHeaderState | null>(null);
  const value = useMemo(() => ({ state, setState }), [state]);

  return (
    <WorkspaceHeaderContext.Provider value={value}>{children}</WorkspaceHeaderContext.Provider>
  );
}

export function useWorkspaceHeaderState(): WorkspaceHeaderState | null {
  const context = useContext(WorkspaceHeaderContext);
  return context?.state ?? null;
}

function useWorkspaceHeaderRegistration(): (state: WorkspaceHeaderState | null) => void {
  const context = useContext(WorkspaceHeaderContext);
  if (!context) {
    throw new Error("useWorkspaceHeaderRegistration must be used within WorkspaceHeaderProvider");
  }
  return context.setState;
}

export function useRegisterWorkspaceHeader({
  projectName,
  onProjectNameChange,
  saveStatus,
}: WorkspaceHeaderState): void {
  const setState = useWorkspaceHeaderRegistration();

  useEffect(() => {
    setState({ projectName, onProjectNameChange, saveStatus });
    return () => setState(null);
  }, [onProjectNameChange, projectName, saveStatus, setState]);
}
