"use client";

import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database } from "lucide-react";
import { APP_HEADER_HEIGHT } from "@/lib/layout-constants";
import { useWorkspaceHeaderState } from "@/components/workspace/workspace-header-context";

function SaveStatusLabel({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "saving") {
    return <span className="text-xs text-zinc-500 dark:text-zinc-400">Saving...</span>;
  }
  if (status === "saved") {
    return <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span>;
  }
  if (status === "error") {
    return <span className="text-xs text-red-600 dark:text-red-400">Save failed</span>;
  }
  return null;
}

export function AppHeader() {
  const pathname = usePathname();
  const workspaceHeader = useWorkspaceHeaderState();
  const isWorkspace = pathname.startsWith("/workspace/");

  return (
    <header
      className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/90"
      style={{ height: APP_HEADER_HEIGHT }}
    >
      <div className="mx-auto flex h-full w-full max-w-[1600px] items-center gap-4 px-4 sm:px-6">
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-2 rounded-lg px-1 py-1 text-sm font-semibold text-zinc-900 transition hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
            <Database className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">DDL ERD Visualizer</span>
        </Link>

        {isWorkspace && workspaceHeader && (
          <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
            <input
              value={workspaceHeader.projectName}
              onChange={(event) => workspaceHeader.onProjectNameChange(event.target.value)}
              className="min-w-0 max-w-md flex-1 truncate rounded-lg border border-transparent bg-transparent px-3 py-1.5 text-center text-sm font-semibold text-zinc-900 outline-none ring-sky-500 transition focus:border-zinc-300 focus:bg-white focus:ring-2 dark:text-zinc-100 dark:focus:border-zinc-700 dark:focus:bg-zinc-950"
              aria-label="Project name"
            />
            <SaveStatusLabel status={workspaceHeader.saveStatus} />
          </div>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                type="button"
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Sign up
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox:
                    "h-9 w-9 ring-2 ring-zinc-200 ring-offset-2 ring-offset-white dark:ring-zinc-700 dark:ring-offset-zinc-900",
                  userButtonTrigger: "rounded-full focus:shadow-none focus:ring-2 focus:ring-sky-500",
                },
              }}
            />
          </Show>
        </div>
      </div>
    </header>
  );
}
