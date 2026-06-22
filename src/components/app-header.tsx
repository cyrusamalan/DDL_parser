"use client";

import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppLogo } from "@/components/app-logo";
import { APP_HEADER_HEIGHT } from "@/lib/layout-constants";
import { useWorkspaceHeaderState } from "@/components/workspace/workspace-header-context";

const headerHeightStyle = { height: APP_HEADER_HEIGHT };

function SaveButton({
  onClick,
  disabled,
  label = "Save",
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-500 dark:hover:bg-sky-400"
    >
      {label}
    </button>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const workspaceHeader = useWorkspaceHeaderState();
  const isWorkspace = pathname.startsWith("/workspace/");

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/90"
        style={headerHeightStyle}
      >
        <div className="flex h-full w-full items-center justify-center px-24 sm:px-32">
          {isWorkspace && workspaceHeader ? (
            <div className="flex min-w-0 items-center justify-center gap-2">
              <input
                value={workspaceHeader.projectName}
                onChange={(event) => workspaceHeader.onProjectNameChange(event.target.value)}
                className="min-w-0 max-w-md truncate rounded-lg border border-transparent bg-transparent px-3 py-1.5 text-center text-sm font-semibold text-zinc-900 outline-none ring-sky-500 transition focus:border-zinc-300 focus:bg-white focus:ring-2 dark:text-zinc-100 dark:focus:border-zinc-700 dark:focus:bg-zinc-950"
                aria-label="Project name"
              />
              {workspaceHeader.projectNameDirty && (
                <SaveButton
                  onClick={workspaceHeader.onSave}
                  disabled={workspaceHeader.isSaving}
                  label={workspaceHeader.isSaving ? "Saving..." : "Save"}
                />
              )}
              {workspaceHeader.saveError && (
                <span className="text-xs text-red-600 dark:text-red-400">Save failed</span>
              )}
            </div>
          ) : (
            <span className="text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              DDL ERD Visualizer
            </span>
          )}
        </div>
      </header>

      <div
        className="fixed left-0 top-0 z-50 flex items-center pl-3 sm:pl-4"
        style={headerHeightStyle}
      >
        <Link
          href="/dashboard"
          className="flex h-full items-center py-1.5 text-zinc-900 transition hover:opacity-80 dark:text-zinc-100"
          aria-label="Go to dashboard"
        >
          <AppLogo className="h-9 w-9 sm:h-10 sm:w-10" />
        </Link>
      </div>

      <div
        className="fixed right-0 top-0 z-50 flex items-center gap-2 pr-3 sm:pr-4"
        style={headerHeightStyle}
      >
        {isWorkspace && workspaceHeader?.canvasDirty && (
          <SaveButton
            onClick={workspaceHeader.onSave}
            disabled={workspaceHeader.isSaving}
            label={workspaceHeader.isSaving ? "Saving..." : "Save changes"}
          />
        )}
        <Show when="signed-out">
          <Link
            href="/sign-in"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Sign up
          </Link>
        </Show>
        <Show when="signed-in">
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox:
                  "h-9 w-9 ring-2 ring-zinc-200 dark:ring-zinc-700",
                userButtonTrigger:
                  "rounded-full focus:shadow-none focus:ring-2 focus:ring-sky-500",
              },
            }}
          />
        </Show>
      </div>
    </>
  );
}
