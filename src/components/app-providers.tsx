"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { WorkspaceHeaderProvider } from "@/components/workspace/workspace-header-context";

function isAuthRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up")
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showHeader = !isAuthRoute(pathname);

  return (
    <WorkspaceHeaderProvider>
      {showHeader ? <AppHeader /> : null}
      {children}
    </WorkspaceHeaderProvider>
  );
}
