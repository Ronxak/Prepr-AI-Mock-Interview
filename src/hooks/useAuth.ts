"use client";

import useSWR from "swr";
import { apiFetch } from "@/lib/api-client";
import type { PublicUser } from "@/types/user";

/** Client-side current-user hook. Returns null when unauthenticated (no retry). */
export function useAuth() {
  const { data, error, isLoading, mutate } = useSWR<{ user: PublicUser }>(
    "/api/auth/me",
    (url: string) => apiFetch<{ user: PublicUser }>(url),
    { shouldRetryOnError: false, revalidateOnFocus: false },
  );

  return {
    user: data?.user ?? null,
    isLoading,
    isAuthenticated: !!data?.user,
    isError: !!error,
    mutate,
  };
}
