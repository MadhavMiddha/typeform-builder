"use client";

import { useQuery } from "@tanstack/react-query";
import { api, endpoints } from "@/lib/api";
import type { FormSummary, ResponsePage, ResponseRead } from "@/lib/types";

export const resultKeys = {
  all: ["results"] as const,
  summary: (formId: number) => [...resultKeys.all, "summary", formId] as const,
  responses: (formId: number, page: number, pageSize: number, status: "all" | "completed" | "partial") =>
    [...resultKeys.all, "responses", formId, page, pageSize, status] as const,
  response: (formId: number, responseId: number) =>
    [...resultKeys.all, "response", formId, responseId] as const,
};

export function useFormSummary(formId: number) {
  return useQuery<FormSummary>({
    queryKey: resultKeys.summary(formId),
    queryFn: () => api.get<FormSummary>(endpoints.forms.responses.summary(formId)),
    enabled: Number.isFinite(formId) && formId > 0,
    refetchInterval: 30_000,
  });
}

export function useResponses(formId: number, page: number, pageSize: number, status: "all" | "completed" | "partial") {
  return useQuery<ResponsePage>({
    queryKey: resultKeys.responses(formId, page, pageSize, status),
    queryFn: () =>
      api.get<ResponsePage>(
        `${endpoints.forms.responses.list(formId)}?page=${page}&page_size=${pageSize}${status === "all" ? "" : `&status=${status}`}`
      ),
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

export async function downloadResponsesCsv(formId: number, filename: string) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const response = await fetch(`${base}${endpoints.forms.responses.export(formId)}`);
  if (!response.ok) throw new Error("Unable to export responses");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
