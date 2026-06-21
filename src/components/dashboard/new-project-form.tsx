"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Plus } from "lucide-react";

export function NewProjectForm() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(() => {
      const params = new URLSearchParams();
      const trimmed = projectName.trim();
      if (trimmed) params.set("name", trimmed);
      const query = params.toString();
      router.push(query ? `/dashboard/new?${query}` : "/dashboard/new");
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-5 shadow-sm dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950"
    >
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Start a new diagram</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Import DDL on the next step — paste, drop, or upload a .sql file.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={projectName}
          onChange={(event) => setProjectName(event.target.value)}
          placeholder="Project name (optional)"
          className="flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none ring-sky-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          <Plus className="h-4 w-4" />
          {isPending ? "Opening..." : "Continue"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <Link
        href="/dashboard/new"
        className="mt-3 inline-block text-xs font-medium text-sky-700 hover:underline dark:text-sky-400"
      >
        Skip naming for now
      </Link>
    </form>
  );
}
