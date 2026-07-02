"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResumeAnalysisView } from "@/components/resume/resume-analysis-view";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { formatDate } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { ResumeSummary } from "@/types/resume";

export function ResumeList({ resumes }: { resumes: ResumeSummary[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = React.useState<string | null>(
    resumes[0]?.id ?? null,
  );
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  if (resumes.length === 0) return null;

  const selected = resumes.find((r) => r.id === selectedId) ?? resumes[0]!;

  async function remove(id: string) {
    setDeletingId(id);
    try {
      await apiFetch(`/api/resume/${id}`, { method: "DELETE" });
      toast.success("Resume deleted.");
      if (selectedId === id) setSelectedId(null);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Couldn't delete the resume.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Uploaded resumes</h3>
        <div className="grid gap-2">
          {resumes.map((r) => {
            const active = r.id === selected.id;
            return (
              <div
                key={r.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
                  active
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/70 bg-card/40",
                )}
              >
                <button
                  onClick={() => setSelectedId(r.id)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <FileText
                    className={cn(
                      "size-4 shrink-0",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span className="truncate font-medium">{r.fileName}</span>
                  <Badge variant="secondary" className="uppercase">
                    {r.fileType}
                  </Badge>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {formatDate(r.createdAt)}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={deletingId === r.id}
                  onClick={() => remove(r.id)}
                  aria-label={`Delete ${r.fileName}`}
                >
                  {deletingId === r.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="mb-4 text-lg font-medium">
          Analysis · <span className="text-muted-foreground">{selected.fileName}</span>
        </h3>
        <ResumeAnalysisView analysis={selected.analysis} />
      </div>
    </div>
  );
}
