"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { Button, type buttonVariants } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import type { VariantProps } from "class-variance-authority";

export function SignOutButton({
  variant = "outline",
  size,
}: VariantProps<typeof buttonVariants>) {
  const router = useRouter();
  async function logout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out. Try again.");
    }
  }
  return (
    <Button variant={variant} size={size} onClick={logout}>
      <LogOut className="size-4" /> Sign out
    </Button>
  );
}
