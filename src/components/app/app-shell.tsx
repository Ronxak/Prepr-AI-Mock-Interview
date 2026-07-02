"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  LayoutDashboard,
  FileText,
  History,
  Plus,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { PublicUser } from "@/types/user";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/history", label: "History", icon: History },
  { href: "/resume", label: "Resume", icon: FileText },
];

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/history": "Interview history",
  "/resume": "Resume",
  "/profile": "Profile",
};

export function AppShell({
  user,
  children,
}: {
  user: PublicUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const title =
    TITLES[pathname] ??
    (pathname.startsWith("/interview")
      ? "Interview"
      : pathname.startsWith("/report")
        ? "Report"
        : "Prepr");

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border/60 bg-card/30 p-4 md:flex">
        <div className="px-2 py-2">
          <Logo />
        </div>
        <Button asChild className="mt-4">
          <Link href="/interview/new">
            <Plus className="size-4" /> New interview
          </Link>
        </Button>
        <nav className="mt-6 flex flex-col gap-1">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto">
          <UserMenu user={user} />
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <Logo showWordmark={false} />
            </div>
            <h1 className="text-base font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="md:hidden">
              <Link href="/interview/new">
                <Plus className="size-4" /> New
              </Link>
            </Button>
            <div className="md:hidden">
              <UserMenu user={user} compact />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function UserMenu({ user, compact }: { user: PublicUser; compact?: boolean }) {
  const router = useRouter();
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-secondary/60",
            !compact && "w-full",
          )}
        >
          <Avatar className="size-8">
            <AvatarFallback>{initials || "U"}</AvatarFallback>
          </Avatar>
          {!compact && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {user.email}
              </div>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserIcon className="size-4" /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={logout}>
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
