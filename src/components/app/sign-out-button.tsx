"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

export function SignOutButton() {
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
    <Button variant="outline" onClick={logout}>
      <LogOut className="size-4" /> Sign out
    </Button>
  );
}
