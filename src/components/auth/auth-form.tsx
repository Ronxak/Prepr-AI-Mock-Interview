"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import type { PublicUser } from "@/types/user";

type Mode = "login" | "signup";

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [loading, setLoading] = React.useState(false);
  const [fieldError, setFieldError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      await apiFetch<{ user: PublicUser }>(
        isSignup ? "/api/auth/register" : "/api/auth/login",
        { method: "POST", body: JSON.stringify(payload) },
      );
      toast.success(isSignup ? "Welcome to Prepr" : "Welcome back");
      router.push(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Something went wrong. Please try again.";
      setFieldError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {isSignup && (
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" placeholder="Ada Lovelace" autoComplete="name" required />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder={isSignup ? "At least 8 characters" : "••••••••"}
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
        />
      </div>

      {fieldError && (
        <p className="text-sm text-destructive" role="alert">
          {fieldError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        {isSignup ? "Create account" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isSignup ? "Already have an account? " : "New to Prepr? "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {isSignup ? "Sign in" : "Create one"}
        </Link>
      </p>
    </form>
  );
}
