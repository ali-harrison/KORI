import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // /auth/callback sends people back here when a magic link fails, which
  // nearly always means it expired or was already used.
  const { error } = await searchParams;
  return (
    <LoginForm
      initialError={error ? "That sign-in link has expired or already been used. Request a new one below." : null}
    />
  );
}
