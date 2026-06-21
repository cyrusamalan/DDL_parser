import Link from "next/link";
import { AppLogo } from "@/components/app-logo";
import type { ReactNode } from "react";

type AuthPageShellProps = {
  mode: "sign-in" | "sign-up";
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showSwitchLink?: boolean;
};

const COPY = {
  "sign-in": {
    title: "Welcome back",
    subtitle: "Sign in to open your saved diagrams and keep editing where you left off.",
    switchLabel: "Don't have an account?",
    switchHref: "/sign-up",
    switchAction: "Create one",
  },
  "sign-up": {
    title: "Create your account",
    subtitle: "Start turning PostgreSQL DDL into interactive ERDs in minutes.",
    switchLabel: "Already have an account?",
    switchHref: "/sign-in",
    switchAction: "Sign in",
  },
} as const;

export function AuthPageShell({
  mode,
  children,
  title,
  subtitle,
  showSwitchLink = true,
}: AuthPageShellProps) {
  const copy = COPY[mode];
  const heading = title ?? copy.title;
  const description = subtitle ?? copy.subtitle;

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="relative hidden w-[44%] max-w-xl overflow-hidden border-r border-zinc-200 bg-zinc-900 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between dark:border-zinc-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(14,165,233,0.18),_transparent_55%)]" />
        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-3">
            <AppLogo className="h-11 w-11 text-white" />
            <span className="text-sm font-semibold tracking-tight">DDL ERD Visualizer</span>
          </Link>
          <h1 className="mt-10 text-3xl font-semibold tracking-tight">
            Turn PostgreSQL DDL into interactive ERDs
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-300">
            Paste CREATE TABLE statements, visualize relationships, organize tables into groups,
            and save projects securely.
          </p>
        </div>
        <ul className="relative space-y-3 text-sm text-zinc-400">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            Import DDL from paste or .sql upload
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            Drag-and-drop table layout with FK edges
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            AI-assisted table grouping
          </li>
        </ul>
      </aside>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <AppLogo className="h-9 w-9" />
              DDL ERD Visualizer
            </Link>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                {heading}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {description}
              </p>
            </div>

            {children}

            {showSwitchLink ? (
              <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
                {copy.switchLabel}{" "}
                <Link
                  href={copy.switchHref}
                  className="font-medium text-sky-700 hover:underline dark:text-sky-400"
                >
                  {copy.switchAction}
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
