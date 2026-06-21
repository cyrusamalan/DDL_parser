"use client";

import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
import { useState } from "react";

type OAuthButtonsProps = {
  mode: "sign-in" | "sign-up";
};

const PROVIDERS = [
  { strategy: "oauth_google" as const, label: "Google" },
  { strategy: "oauth_github" as const, label: "GitHub" },
];

export function OAuthButtons({ mode }: OAuthButtonsProps) {
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const [error, setError] = useState<string | null>(null);
  const [pendingStrategy, setPendingStrategy] = useState<string | null>(null);

  const isLoaded = mode === "sign-in" ? signInLoaded : signUpLoaded;

  const handleOAuth = async (strategy: (typeof PROVIDERS)[number]["strategy"]) => {
    if (!isLoaded) return;

    setError(null);
    setPendingStrategy(strategy);

    try {
      const auth = mode === "sign-in" ? signIn : signUp;
      if (!auth) return;

      await auth.authenticateWithRedirect({
        strategy,
        redirectUrl: `/${mode}/sso-callback`,
        redirectUrlComplete: "/dashboard",
      });
    } catch {
      setError(`Could not continue with ${strategy.replace("oauth_", "")}.`);
      setPendingStrategy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
        </div>
        <p className="relative mx-auto w-fit bg-white px-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          Or continue with
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.strategy}
            type="button"
            disabled={!isLoaded || pendingStrategy !== null}
            onClick={() => void handleOAuth(provider.strategy)}
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
          >
            {pendingStrategy === provider.strategy ? "Redirecting..." : provider.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-center text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
