"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, endpoints } from "@/lib/api";
import type { FormSummary, ResponsePage, ResponseRead } from "@/lib/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== "undefined" ? window.location.origin : "");

export const resultKeys = {
  all: ["results"] as const,
  summary: (
    formId: number,
    days?: number,
    fromDate?: string,
    toDate?: string,
    status?: string
  ) => [...resultKeys.all, "summary", formId, days, fromDate, toDate, status] as const,
  responses: (
    formId: number,
    page: number,
    pageSize: number,
    status?: string,
    q?: string,
    fromDate?: string,
    toDate?: string
  ) =>
    [
      ...resultKeys.all,
      "responses",
      formId,
      page,
      pageSize,
      status,
      q,
      fromDate,
      toDate,
    ] as const,
  response: (formId: number, responseId: number) =>
    [...resultKeys.all, "response", formId, responseId] as const,
};

export function useFormSummary(
  formId: number,
  options?: {
    days?: number;
    from?: string;
    to?: string;
    status?: string;
  }
) {
  const queryParams = new URLSearchParams();
  if (options?.days) queryParams.set("days", String(options.days));
  if (options?.from) queryParams.set("from", options.from);
  if (options?.to) queryParams.set("to", options.to);
  if (options?.status && options.status !== "all")
    queryParams.set("status", options.status);
  const qs = queryParams.toString();
  const url = `${endpoints.forms.responses.summary(formId)}${qs ? `?${qs}` : ""}`;

  return useQuery<FormSummary>({
    queryKey: resultKeys.summary(
      formId,
      options?.days,
      options?.from,
      options?.to,
      options?.status
    ),
    queryFn: () => api.get<FormSummary>(url),
    enabled: Number.isFinite(formId) && formId > 0,
    refetchInterval: 30_000,
  });
}

export function useResponses(
  formId: number,
  page: number,
  pageSize: number,
  status: "all" | "completed" | "partial",
  q?: string,
  fromDate?: string,
  toDate?: string
) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (status !== "all") params.set("status", status);
  if (q?.trim()) params.set("q", q.trim());
  if (fromDate) params.set("from", fromDate);
  if (toDate) params.set("to", toDate);
  return useQuery<ResponsePage>({
    queryKey: resultKeys.responses(formId, page, pageSize, status, q, fromDate, toDate),
    queryFn: () =>
      api.get<ResponsePage>(`${endpoints.forms.responses.list(formId)}?${params}`),
    enabled: Number.isFinite(formId) && formId > 0,
    refetchInterval: 30_000,
  });
}

export function useResponse(formId: number, responseId: number | null) {
  return useQuery<ResponseRead>({
    queryKey: resultKeys.response(formId, responseId ?? 0),
    queryFn: () => api.get<ResponseRead>(endpoints.forms.responses.get(formId, responseId as number)),
    enabled: responseId !== null,
  });
}

/** Delete a single response with confirmation toast. */
export function useDeleteResponse(formId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (responseId: number) =>
      api.delete<void>(endpoints.forms.responses.deleteResponse(formId, responseId)),
    onSuccess: () => {
      toast.success("Response deleted.");
      qc.invalidateQueries({ queryKey: resultKeys.all });
    },
    onError: () => toast.error("Failed to delete response."),
  });
}

/** Download CSV or XLSX — returns a blob URL so caller can auto-trigger. */
export async function downloadExport(
  formId: number,
  format: "csv" | "xlsx",
  options?: {
    ids?: number[];
    status?: "completed" | "partial";
    from?: string;
    to?: string;
    q?: string;
    titleSlug?: string;
  }
): Promise<void> {
  const params = new URLSearchParams();
  if (options?.status) params.set("status", options.status);
  if (options?.from) params.set("from", options.from);
  if (options?.to) params.set("to", options.to);
  if (options?.q) params.set("q", options.q);
  if (options?.ids?.length) params.set("ids", options.ids.join(","));
  const qs = params.toString();
  const url = `${BASE_URL}${endpoints.forms.responses.exportV2(formId, format)}${qs ? `&${qs}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Export failed");
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  const date = new Date().toISOString().slice(0, 10);
  const slug = options?.titleSlug || "form";
  a.download = `${slug}-responses-${date}.${format}`;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

/** Legacy CSV download kept for backward compat. */
export async function downloadResponsesCsv(formId: number, filename: string) {
  const response = await fetch(`${BASE_URL}${endpoints.forms.responses.export(formId)}`);
  if (!response.ok) throw new Error("Unable to export responses");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
