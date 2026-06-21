import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight">
        Turn PostgreSQL DDL into interactive ERDs
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
        Paste CREATE TABLE statements, generate a diagram in your browser, and save
        projects securely to Neon with Clerk authentication.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/sign-up"
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Get started
        </Link>
        <Link
          href="/sign-in"
          className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
