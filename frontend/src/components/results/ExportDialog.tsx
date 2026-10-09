"use client";

import { useState } from "react";
import { CheckCircle2, Download, FileText, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";
import { downloadExport } from "@/lib/api/results";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  formId: number;
  titleSlug: string;
  totalCount: number;
  selectedIds?: number[];
  status?: "completed" | "partial";
  q?: string;
  from?: string;
  to?: string;
}

export function ExportDialog({
  open,
  onClose,
  formId,
  titleSlug,
  totalCount,
  selectedIds,
  status,
  q,
  from,
  to,
}: ExportDialogProps) {
  const [format, setFormat] = useState<"csv" | "xlsx">("csv");
  const [phase, setPhase] = useState<"pick" | "success" | "error">("pick");
  const [loading, setLoading] = useState(false);
  const exportCount = selectedIds?.length || totalCount;

  const handleExport = async () => {
    setLoading(true);
    try {
      await downloadExport(formId, format, { ids: selectedIds, status, q, from, to, titleSlug });
      setPhase("success");
    } catch {
      setPhase("error");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    setLoading(true);
    try {
      await downloadExport(formId, format, { ids: selectedIds, status, q, from, to, titleSlug });
      setPhase("success");
    } catch {
      // stay on success/error phase
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPhase("pick");
    setFormat("csv");
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[20px] bg-white p-6 shadow-2xl focus:outline-none"
          aria-label="Export responses"
        >
          {/* Header */}
          <div className="mb-5 flex items-start justify-between">
            <Dialog.Title className="text-[18px] font-semibold text-[#262627]">
              {phase === "pick"
                ? `Export ${exportCount} response${exportCount === 1 ? "" : "s"}`
                : phase === "success"
                ? "Your file is ready"
                : "Export failed"}
            </Dialog.Title>
            <button
              onClick={handleClose}
              className="ml-4 rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              aria-label="Close export dialog"
            >
              <X size={18} />
            </button>
          </div>

          {phase === "pick" && (
            <>
              <p className="mb-4 text-sm text-neutral-500">Choose your format:</p>
              <div className="space-y-3">
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                    format === "csv"
                      ? "border-[#262627] bg-neutral-50"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="export-format"
                    value="csv"
                    checked={format === "csv"}
                    onChange={() => setFormat("csv")}
                    className="mt-0.5 accent-[#262627]"
                  />
                  <div>
                    <span className="font-medium text-[#262627]">.csv</span>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Plain text data for databases or advanced analysis.
                    </p>
                  </div>
                </label>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                    format === "xlsx"
                      ? "border-[#262627] bg-neutral-50"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="export-format"
                    value="xlsx"
                    checked={format === "xlsx"}
                    onChange={() => setFormat("xlsx")}
                    className="mt-0.5 accent-[#262627]"
                  />
                  <div>
                    <span className="font-medium text-[#262627]">.xlsx</span>
                    <p className="text-xs text-neutral-500 mt-0.5">Works with Excel.</p>
                  </div>
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-sm text-neutral-500 hover:text-neutral-800 px-3 py-2"
                >
                  Cancel
                </button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExport}
                  disabled={loading}
                  id="export-dialog-confirm"
                >
                  {loading ? "Exporting…" : "Export"}
                </Button>
              </div>
            </>
          )}

          {phase === "success" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
                <CheckCircle2 size={36} className="text-green-600" />
              </div>
              <p className="text-center text-sm text-neutral-600">
                Your file is ready and will download to your device.
              </p>
              <button
                type="button"
                onClick={handleRetry}
                disabled={loading}
                className="mt-1 flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-[#262627] hover:bg-neutral-50 disabled:opacity-50"
              >
                <Download size={15} />
                {loading ? "Downloading…" : "Download file"}
              </button>
            </div>
          )}

          {phase === "error" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                <FileText size={36} className="text-red-500" />
              </div>
              <p className="text-center text-sm text-neutral-600">
                Export failed. Please try again.
              </p>
              <Button variant="primary" size="sm" onClick={handleExport} disabled={loading}>
                {loading ? "Retrying…" : "Try again"}
              </Button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
