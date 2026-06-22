import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HeroAnimation } from "@/components/landing/hero-animation";
import { APP_MAIN_HEIGHT } from "@/lib/layout-constants";

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main
      className="relative flex w-full flex-1 items-center overflow-hidden"
      style={{ minHeight: APP_MAIN_HEIGHT }}
    >
      {/* Animated backdrop. */}
      <HeroAnimation />

      {/* Left-side darkening so the copy stays legible over the animation. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-transparent" />

      {/* Hero copy (kept to the left). */}
      <div className="relative z-10 flex w-full flex-col px-6 py-16 sm:px-10 lg:px-16 xl:px-24">
        <span className="mb-4 inline-flex w-fit items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-sky-300 backdrop-blur-sm">
          PostgreSQL DDL → interactive ERD
        </span>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Turn PostgreSQL DDL into interactive ERDs
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-300">
          Paste CREATE TABLE statements, generate a diagram in your browser, and
          save projects securely to Neon with Clerk authentication.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/sign-up"
            className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-sky-900/40 transition hover:bg-sky-500"
          >
            Get started
          </Link>
          <Link
            href="/sign-in"
            className="rounded-lg border border-white/25 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
