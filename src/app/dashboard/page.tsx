import Link from "next/link";
import { listDiagrams } from "@/actions/diagrams";
import { DiagramCard } from "@/components/dashboard/diagram-card";
import { NewProjectForm } from "@/components/dashboard/new-project-form";
import { LayoutGrid, Plus } from "lucide-react";

export default async function DashboardPage() {
  const diagrams = await listDiagrams();

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Your diagrams
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Import PostgreSQL DDL, visualize tables and relationships, and pick up where you
            left off.
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          <Plus className="h-4 w-4" />
          New diagram
        </Link>
      </div>

      <NewProjectForm />

      <section>
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <LayoutGrid className="h-4 w-4" />
          Saved projects
          {diagrams.length > 0 && (
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {diagrams.length}
            </span>
          )}
        </div>

        {diagrams.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              No saved diagrams yet
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
              Create your first project to paste DDL or upload a migration file and generate an
              interactive ERD.
            </p>
            <Link
              href="/dashboard/new"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              <Plus className="h-4 w-4" />
              Create your first diagram
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {diagrams.map((diagram) => (
              <DiagramCard key={diagram.id} diagram={diagram} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
