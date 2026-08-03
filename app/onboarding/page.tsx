"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createGym } from "@/app/actions/gym";
import { slugify } from "@/utils";

export default function OnboardingPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createGym(formData);
      if (result?.error) setError(result.error);
      // On success, createGym redirects to /dashboard
    });
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-[7px] bg-[#e8ff47] flex items-center justify-center">
            <span className="text-[11px] font-black text-[#0c0c0c] tracking-tight">KG</span>
          </div>
          <span className="text-sm font-semibold text-[#f5f5f5]">KORI/GYM</span>
        </div>

        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-[#f5f5f5]">Set up your gym</h1>
            <p className="text-sm text-[#888888]">Tell us about your gym to get started.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Gym name"
              name="name"
              placeholder="Southerly Strength"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              hint={name ? `Your URL: kori.gym/${slugify(name)}` : undefined}
            />
            <Input label="Address" name="address" placeholder="12 Harbour Road, Southport" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Phone" name="phone" type="tel" placeholder="+64 21 555 0100" />
              <Input label="Gym email" name="email" type="email" placeholder="info@gym.co.nz" />
            </div>
            {error && <p className="text-xs text-[#ef4444]">{error}</p>}
            <div className="pt-2">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                type="submit"
                loading={isPending}
                disabled={!name.trim()}
              >
                Create gym
              </Button>
            </div>
          </form>

          <p className="text-xs text-[#444444] text-center">
            You can update these details anytime in Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
