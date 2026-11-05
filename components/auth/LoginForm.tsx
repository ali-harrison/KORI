"use client";

import { useState } from "react";
import { Button, Input, Poutama, Wordmark } from "@/components/ui";
import { createClient } from "@/lib/supabase-client";

const UNREACHABLE = "We can't reach the sign-in service right now. Try again in a moment.";

export function LoginForm({ initialError }: { initialError: string | null }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (!error) {
        setSent(true);
      } else if (error.status === 429) {
        setError("Too many sign-in emails. Wait a minute, then try again.");
      } else if (error.name === "AuthRetryableFetchError") {
        setError(UNREACHABLE);
      } else {
        setError(error.message);
      }
    } catch {
      setError(UNREACHABLE);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between border-r border-line p-10">
        <Wordmark />
        <div>
          <Poutama width={480} height={72} spacing={36} step={9} className="mb-8" />
          <p className="text-[clamp(2rem,3.4vw,3rem)] leading-[1.06] tracking-[-0.03em] max-w-md text-balance">
            Members, direct debit and contracts, on one ledger.
          </p>
        </div>
        <a href="https://tewairama.digital" target="_blank" rel="noopener" className="label hover:text-fg transition-colors duration-150 w-fit">
          Te Wairama Digital <span aria-hidden>↗</span>
        </a>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Wordmark className="lg:hidden block mb-10" />

          {!sent ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl tracking-[-0.03em]">Sign in</h1>
                <p className="text-fg-2">Enter your email to receive a magic link.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                {error && <p role="alert" className="text-accent text-[13px]">{error}</p>}
                <Button variant="primary" size="lg" className="w-full" type="submit" loading={loading}>
                  Continue with email
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-3" role="status">
              <h1 className="text-3xl tracking-[-0.03em]">Check your email</h1>
              <p className="text-fg-2">
                We sent a magic link to <span className="text-fg">{email}</span>
              </p>
              <button
                onClick={() => { setSent(false); setError(null); }}
                className="label hover:text-fg transition-colors duration-150 cursor-pointer"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
