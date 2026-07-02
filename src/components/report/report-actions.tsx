"use client";

import { useState } from "react";
import { Share2, Printer, Check, X, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

export function ReportActions({
  interviewId,
  initialToken,
}: {
  interviewId: string;
  initialToken?: string | null;
}) {
  const [token, setToken] = useState(initialToken);
  const [shareOpen, setShareOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/shared/${token}`
    : "";

  async function toggleShare(enable: boolean) {
    setLoading(true);
    try {
      const res = await apiFetch<{ shareToken: string | null }>(
        `/api/report/${interviewId}/share`,
        {
          method: "POST",
          body: JSON.stringify({ enable }),
        },
      );
      setToken(res.shareToken);
      if (enable && res.shareToken) {
        toast.success("Link generated!");
      } else {
        toast.success("Link revoked.");
        setShareOpen(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update sharing");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied to clipboard");
  }

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <div className="flex items-center gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
          <Share2 className="size-4" /> Share
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="size-4" /> Print PDF
        </Button>
      </div>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Interview Report</DialogTitle>
            <DialogDescription>
              Create a public link to share this report with mentors or peers.
            </DialogDescription>
          </DialogHeader>

          {!token ? (
            <div className="flex flex-col gap-4 py-4">
              <p className="text-sm text-muted-foreground">
                This report is currently private. Generate a link to share it.
              </p>
              <Button onClick={() => toggleShare(true)} disabled={loading}>
                Generate Link
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 py-4">
              <div className="flex gap-2">
                <Input readOnly value={shareUrl} />
                <Button variant="secondary" onClick={handleCopy}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <Button
                variant="destructive"
                onClick={() => toggleShare(false)}
                disabled={loading}
              >
                <X className="size-4" /> Revoke Link
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
