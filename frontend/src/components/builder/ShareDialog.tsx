"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { Tooltip } from "@/components/ui/Tooltip";
import { Button } from "@/components/ui/Button";
import { Link2, ExternalLink, QrCode, Copy, Check, Globe, Mail, ChevronDown } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { usePublishForm } from "@/lib/api/forms";
import { cn } from "@/lib/utils";
import type { FormRead } from "@/lib/types";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: FormRead;
}

export function ShareDialog({ open, onOpenChange, form }: ShareDialogProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [embedExpanded, setEmbedExpanded] = useState(false);
  const publishForm = usePublishForm();

  const isPublished = form.status === "published";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${origin}/f/${form.public_id}`;
  const embedCode = `<iframe src="${publicUrl}" style="width:100%;height:600px;border:0" title="${form.title}"></iframe>`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedLink(true);
      toast.success("Link copied");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopiedEmbed(true);
      toast.success("Embed code copied");
      setTimeout(() => setCopiedEmbed(false), 2000);
    } catch {
      toast.error("Failed to copy embed code");
    }
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`, "_blank", "noopener,noreferrer");
  };

  const shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`, "_blank", "noopener,noreferrer");
  };

  const shareX = () => {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(form.title)}`, "_blank", "noopener,noreferrer");
  };

  const handlePublish = () => {
    publishForm.mutate(form.id, {
      onSuccess: () => {
        toast.success("Form published");
      },
      onError: () => {
        toast.error("Failed to publish form");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[540px] rounded-[20px] p-6 text-[#262627]">
        <DialogTitle className="text-xl font-semibold text-[#262627] mb-5">
          Share your form
        </DialogTitle>

        {!isPublished ? (
          <div className="py-6 text-center space-y-4">
            <p className="text-sm text-neutral-600">
              This form is a draft. Publish it to get a shareable link.
            </p>
            <Button
              onClick={handlePublish}
              disabled={publishForm.isPending}
              className="bg-[#262627] text-white hover:bg-black font-semibold px-5 py-2.5 rounded-lg"
            >
              {publishForm.isPending ? "Publishing..." : "Publish form"}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Row: Copy link + URL + Open + QR */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCopyLink}
                className="bg-[#262627] hover:bg-black text-white text-xs font-semibold px-3.5 h-10 rounded-lg flex items-center gap-1.5 shrink-0"
              >
                {copiedLink ? <Check size={14} /> : <Link2 size={14} />}
                {copiedLink ? "Copied" : "Copy link"}
              </Button>

              <input
                type="text"
                readOnly
                value={publicUrl}
                aria-label="Public form URL"
                className="flex-1 min-w-0 bg-[#f5f5f5] text-xs text-neutral-700 px-3 h-10 rounded-lg border border-[#ececec] focus:outline-none select-all"
              />

              <Tooltip content="Open form in new tab">
                <button
                  type="button"
                  onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")}
                  aria-label="Open in new tab"
                  className="h-10 w-10 flex items-center justify-center rounded-lg border border-[#ececec] text-neutral-700 hover:bg-[#f5f5f5] transition-colors shrink-0"
                >
                  <ExternalLink size={16} />
                </button>
              </Tooltip>

              <div className="relative">
                <Tooltip content="Show QR code">
                  <button
                    type="button"
                    onClick={() => setShowQr(!showQr)}
                    aria-label="QR code"
                    className="h-10 w-10 flex items-center justify-center rounded-lg border border-[#ececec] text-neutral-700 hover:bg-[#f5f5f5] transition-colors shrink-0"
                  >
                    <QrCode size={16} />
                  </button>
                </Tooltip>

                {showQr && (
                  <div className="absolute right-0 top-12 z-50 p-4 bg-white rounded-xl shadow-xl border border-[#ececec] flex flex-col items-center">
                    <QRCodeSVG value={publicUrl} size={160} />
                    <p className="text-[11px] text-neutral-500 mt-2">Scan to open form</p>
                  </div>
                )}
              </div>
            </div>

            {/* Link preview card */}
            <div className="border border-[#ececec] rounded-xl p-3.5 bg-[#fafafa] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-lg bg-neutral-200 flex items-center justify-center shrink-0 text-neutral-500 text-xs font-semibold">
                  Preview
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#262627] truncate">
                    {form.title || "Untitled form"}
                  </div>
                  <div className="text-[11px] text-neutral-500 truncate">
                    {form.welcome_description || "Take this survey"}
                  </div>
                  <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                    {typeof window !== "undefined" ? window.location.host : ""}
                  </div>
                </div>
              </div>

              <Tooltip content="Coming soon">
                <button
                  disabled
                  className="flex items-center gap-1 text-xs text-neutral-400 font-medium px-2.5 py-1 rounded border border-neutral-200 cursor-not-allowed bg-white"
                >
                  Customize <ChevronDown size={13} />
                </button>
              </Tooltip>
            </div>

            {/* Share in social buttons */}
            <div>
              <div className="text-xs font-medium text-neutral-500 mb-2">Share in:</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={shareFacebook}
                  title="Share on Facebook"
                  aria-label="Share on Facebook"
                  className="h-9 px-3 rounded-lg border border-[#ececec] hover:bg-[#f5f5f5] text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  Facebook
                </button>
                <button
                  onClick={shareLinkedIn}
                  title="Share on LinkedIn"
                  aria-label="Share on LinkedIn"
                  className="h-9 px-3 rounded-lg border border-[#ececec] hover:bg-[#f5f5f5] text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  LinkedIn
                </button>
                <button
                  onClick={shareX}
                  title="Share on X"
                  aria-label="Share on X"
                  className="h-9 px-3 rounded-lg border border-[#ececec] hover:bg-[#f5f5f5] text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  X
                </button>
              </div>
            </div>

            {/* Embed form section */}
            <div>
              <div className="text-xs font-semibold text-[#262627] mb-2.5">Embed form</div>
              <div className="space-y-2">
                <div className="border border-[#ececec] rounded-xl p-3 bg-white">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setEmbedExpanded(!embedExpanded)}
                      className="flex items-center gap-2 text-xs font-medium text-[#262627] hover:text-black w-full text-left"
                    >
                      <Globe size={15} className="text-neutral-500" />
                      <span>On your website</span>
                    </button>
                  </div>
                  {embedExpanded && (
                    <div className="mt-3 pt-3 border-t border-[#ececec] space-y-2">
                      <pre className="text-[11px] font-mono bg-[#f5f5f5] p-2.5 rounded-lg overflow-x-auto text-neutral-700 whitespace-pre-wrap select-all">
                        {embedCode}
                      </pre>
                      <Button
                        size="sm"
                        onClick={handleCopyEmbed}
                        className="bg-[#262627] text-white hover:bg-black text-xs font-semibold h-8"
                      >
                        {copiedEmbed ? <Check size={12} className="mr-1" /> : <Copy size={12} className="mr-1" />}
                        {copiedEmbed ? "Copied" : "Copy code"}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="border border-[#ececec] rounded-xl p-3 bg-[#fafafa] flex items-center justify-between opacity-60">
                  <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
                    <Mail size={15} />
                    <span>In your email</span>
                  </div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400 bg-neutral-200/60 px-1.5 py-0.5 rounded">
                    Coming soon
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
