"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronRight, Trash2 } from "lucide-react";
import { deleteDiagram } from "@/actions/diagrams";
import type { DiagramSummary } from "@/lib/types/diagram";

type DiagramCardProps = {
  diagram: DiagramSummary;
};

export function DiagramCard({ diagram }: DiagramCardProps) {
  const router = useRouter();
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!window.confirm(`Delete "${diagram.project_name}"?`)) return;

    startDeleteTransition(async () => {
      await deleteDiagram(diagram.id);
      router.refresh();
    });
  };

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 to-violet-400 opacity-0 transition group-hover:opacity-100" />
      <Link
        href={`/workspace/${diagram.id}`}
        className="block rounded-xl px-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
      >
        <div className="flex items-start justify-between gap-3 pr-8">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {diagram.project_name}
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Updated {new Date(diagram.updated_at).toLocaleString()}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 translate-x-0 text-zinc-400 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
        </div>
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="absolute right-3 top-3 rounded-md p-2 text-zinc-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950 dark:hover:text-red-400"
        aria-label={`Delete ${diagram.project_name}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </article>
  );
}
