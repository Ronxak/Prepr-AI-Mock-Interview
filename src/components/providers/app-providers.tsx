"use client";

import * as React from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={150}>
      {children}
      <Toaster />
    </TooltipProvider>
  );
}
