"use client";

import { AppHeader } from "@/components/app-header";
import { WorkspaceHeaderProvider } from "@/components/workspace/workspace-header-context";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceHeaderProvider>
      <AppHeader />
      {children}
    </WorkspaceHeaderProvider>
  );
}
