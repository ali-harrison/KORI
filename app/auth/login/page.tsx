"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-[7px] bg-[#e8ff47] flex items-center justify-center">
            <span className="text-[11px] font-black text-[#0c0c0c] tracking-tight">KG</span>
          </div>
          <span className="text-sm font-semibold text-[#f5f5f5]">KORI/GYM</span>
        </div>

        {!sent ? (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-[#f5f5f5]">Sign in</h1>
              <p className="text-sm text-[#888888]">
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
              {error && <p className="text-xs text-[#ef4444]">{error}</p>}
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

            <p className="text-xs text-[#444444] text-center">
              By continuing you agree to our{" "}
              <a href="#" className="text-[#888888] hover:text-[#f5f5f5] transition-colors">Terms</a>
              {" "}and{" "}
              <a href="#" className="text-[#888888] hover:text-[#f5f5f5] transition-colors">Privacy Policy</a>.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-full bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="text-[#10b981]">
                <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-[#f5f5f5]">Check your email</h2>
              <p className="text-sm text-[#888888]">
                We sent a magic link to <span className="text-[#f5f5f5]">{email}</span>
              </p>
            </div>
            <button
              onClick={() => { setSent(false); setError(null); }}
              className="text-xs text-[#444444] hover:text-[#888888] transition-colors"
            >
              Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
