"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Wordmark } from "@/components/ui/Wordmark";
import { createGym } from "@/app/actions/gym";

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
    <div className="min-h-dvh bg-[#0b0d0c] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-10">
          <Wordmark />
          <div className="text-[11px] text-[#59615b] mt-0.5">gym operations</div>
        </div>

        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-medium text-[#e7eae8]">Set up your gym</h1>
            <p className="text-sm text-[#8f978f]">Tell us about your gym to get started.</p>
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
            />
            <Input label="Address" name="address" placeholder="12 Harbour Road, Southport" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Phone" name="phone" type="tel" placeholder="+64 21 555 0100" />
              <Input label="Gym email" name="email" type="email" placeholder="hello@example.com" />
            </div>
            {error && <p className="text-xs text-[#cf7263]">{error}</p>}
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

          <p className="text-xs text-[#646c66] text-center">
            You can update these details anytime in Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
