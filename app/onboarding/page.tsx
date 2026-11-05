"use client";

import { useState, useTransition } from "react";
import { Button, Input, Wordmark } from "@/components/ui";
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
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Wordmark className="block mb-10" />

        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl tracking-[-0.03em]">Set up your gym</h1>
            <p className="text-fg-2">Tell us about your gym to get started.</p>
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
            {error && <p role="alert" className="text-accent text-[13px]">{error}</p>}
            <Button variant="primary" size="lg" className="w-full" type="submit" loading={isPending} disabled={!name.trim()}>
              Create gym
            </Button>
          </form>

          <p className="text-xs text-fg-3">You can update these details anytime in Settings.</p>
        </div>
      </div>
    </main>
  );
}
