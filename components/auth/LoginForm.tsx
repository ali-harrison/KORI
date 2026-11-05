"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Wordmark } from "@/components/ui/Wordmark";
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
    <div className="min-h-dvh bg-[#0b0d0c] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <Wordmark />
          <div className="text-[11px] text-[#59615b] mt-0.5">gym operations</div>
        </div>

        {!sent ? (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-xl font-medium text-[#e7eae8]">Sign in</h1>
              <p className="text-sm text-[#8f978f]">
                Enter your email to receive a magic link.
              </p>
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
              {error && <p className="text-xs text-[#cf7263]">{error}</p>}
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                type="submit"
                loading={loading}
              >
                Continue with email
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-full bg-[rgba(95,201,164,0.1)] border border-[rgba(95,201,164,0.2)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="text-[#5fc9a4]">
                <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-medium text-[#e7eae8]">Check your email</h2>
              <p className="text-sm text-[#8f978f]">
                We sent a magic link to <span className="text-[#e7eae8]">{email}</span>
              </p>
            </div>
            <button
              onClick={() => { setSent(false); setError(null); }}
              className="text-xs text-[#646c66] hover:text-[#8f978f] transition-colors"
            >
              Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
