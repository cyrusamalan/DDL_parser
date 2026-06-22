"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type WorkspaceHeaderState = {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  projectNameDirty: boolean;
  canvasDirty: boolean;
  isSaving: boolean;
  saveError: boolean;
  onSave: () => void;
  readOnly: boolean;
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
  projectNameDirty,
  canvasDirty,
  isSaving,
  saveError,
  onSave,
  readOnly,
}: WorkspaceHeaderState): void {
  const setState = useWorkspaceHeaderRegistration();
  const callbacksRef = useRef({ onProjectNameChange, onSave });

  useEffect(() => {
    callbacksRef.current = { onProjectNameChange, onSave };
  }, [onProjectNameChange, onSave]);

  useEffect(() => {
    setState({
      projectName,
      onProjectNameChange: (name) => callbacksRef.current.onProjectNameChange(name),
      projectNameDirty,
      canvasDirty,
      isSaving,
      saveError,
      onSave: () => callbacksRef.current.onSave(),
      readOnly,
    });
  }, [canvasDirty, isSaving, projectName, projectNameDirty, readOnly, saveError, setState]);

  useEffect(() => {
    return () => setState(null);
  }, [setState]);
}
