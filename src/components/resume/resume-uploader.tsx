"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { ResumeSummary } from "@/types/resume";

const ACCEPT = ".pdf,.docx,.txt";
const MAX_BYTES = 5 * 1024 * 1024;

export function ResumeUploader({ hasExisting }: { hasExisting: boolean }) {
  const router = useRouter();
  const [dragging, setDragging] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error("That file is too large (max 5MB).");
      return;
    }
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    try {
      await apiFetch<{ resume: ResumeSummary }>("/api/resume", {
        method: "POST",
        body: form,
      });
      toast.success("Resume analyzed and saved.");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Upload failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void upload(file);
      }}
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
      <span className="grid size-12 place-items-center rounded-full bg-primary/12 text-primary">
        {busy ? (
          <Loader2 className="size-6 animate-spin" />
        ) : (
          <UploadCloud className="size-6" />
        )}
      </span>
      <p className="mt-4 font-medium">
        {busy
          ? "Analyzing your resume…"
          : hasExisting
            ? "Replace your resume"
            : "Upload your resume"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Drag &amp; drop or choose a file · PDF, DOCX, or TXT · up to 5MB
      </p>
      <Button
        className="mt-5"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? "Working…" : "Choose file"}
      </Button>
      <p className="mt-3 text-xs text-muted-foreground">
        Optional — but the interviewer will reference your real projects.
      </p>
    </div>
  );
}
