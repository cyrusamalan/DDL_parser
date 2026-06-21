import { Suspense } from "react";
import { NewProjectSetup } from "@/components/dashboard/new-project-setup";

function NewProjectFallback() {
  return (
    <div className="mx-auto w-full max-w-3xl animate-pulse space-y-4">
      <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-96 rounded-3xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense fallback={<NewProjectFallback />}>
      <NewProjectSetup />
    </Suspense>
  );
}
