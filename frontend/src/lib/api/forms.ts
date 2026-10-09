/**
 * TanStack Query hooks for form CRUD operations.
 *
 * - useForms: list all forms
 * - useCreateForm: create a draft and return it
 * - useRenameForm: optimistic title update
 * - useDuplicateForm: deep-copy a form
 * - useDeleteForm: optimistic removal from cache
 * - usePublishForm: optimistic status → 'published'
 * - useUnpublishForm: optimistic status → 'draft'
 */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, endpoints } from "@/lib/api";
import type { FormListItem, FormRead } from "@/lib/types";
import { ApiError } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Query keys
// ─────────────────────────────────────────────────────────────────────────────

export const formKeys = {
  all: ["forms"] as const,
  detail: (id: number) => ["forms", id] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.detail.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

export function useForms() {
  return useQuery<FormListItem[]>({
    queryKey: formKeys.all,
    queryFn: () => api.get<FormListItem[]>(endpoints.forms.list()),
  });
}

export function useForm(id: number) {
  return useQuery<FormRead>({
    queryKey: formKeys.detail(id),
    queryFn: () => api.get<FormRead>(endpoints.forms.get(id)),
    enabled: id > 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateForm() {
  const qc = useQueryClient();
  return useMutation<FormRead, Error, { title?: string }>({
    mutationFn: (vars) =>
      api.post<FormRead>(endpoints.forms.create(), vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.all });
      toast.success("Form created");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to create form"));
    },
  });
}

export function useRenameForm() {
  const qc = useQueryClient();
  return useMutation<FormRead, Error, { id: number; title: string }, { previous: FormListItem[] | undefined }>({
    mutationFn: ({ id, title }) =>
      api.patch<FormRead>(endpoints.forms.update(id), { title }),

    // Optimistic update
    onMutate: async ({ id, title }) => {
      await qc.cancelQueries({ queryKey: formKeys.all });
      const previous = qc.getQueryData<FormListItem[]>(formKeys.all);
      qc.setQueryData<FormListItem[]>(formKeys.all, (old) =>
        old?.map((f) => (f.id === id ? { ...f, title } : f)) ?? []
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(formKeys.all, ctx.previous);
      }
      toast.error(getErrorMessage(err, "Failed to rename form"));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.all });
      toast.success("Form renamed");
    },
  });
}

export function useUpdateForm(formId: number) {
  const qc = useQueryClient();
  return useMutation<FormRead, Error, Partial<FormRead>>({
    mutationFn: (updates) =>
      api.patch<FormRead>(endpoints.forms.update(formId), updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.detail(formId) });
      qc.invalidateQueries({ queryKey: formKeys.all });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to update form"));
    },
  });
}

export function useDuplicateForm() {
  const qc = useQueryClient();
  return useMutation<FormRead, Error, number>({
    mutationFn: (id) =>
      api.post<FormRead>(endpoints.forms.duplicate(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.all });
      toast.success("Form duplicated");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to duplicate form"));
    },
  });
}

export function useDeleteForm() {
  const qc = useQueryClient();
  return useMutation<void, Error, number, { previous: FormListItem[] | undefined }>({
    mutationFn: (id) =>
      api.delete<void>(endpoints.forms.delete(id)),

    // Optimistic removal
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: formKeys.all });
      const previous = qc.getQueryData<FormListItem[]>(formKeys.all);
      qc.setQueryData<FormListItem[]>(formKeys.all, (old) =>
        old?.filter((f) => f.id !== id) ?? []
      );
      return { previous };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(formKeys.all, ctx.previous);
      }
      toast.error(getErrorMessage(err, "Failed to delete form"));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.all });
      toast.success("Form deleted");
    },
  });
}

export function usePublishForm() {
  const qc = useQueryClient();
  return useMutation<FormRead, Error, number, { previous: FormListItem[] | undefined }>({
    mutationFn: (id) =>
      api.post<FormRead>(endpoints.forms.publish(id)),

    // Optimistic toggle
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: formKeys.all });
      const previous = qc.getQueryData<FormListItem[]>(formKeys.all);
      qc.setQueryData<FormListItem[]>(formKeys.all, (old) =>
        old?.map((f) => (f.id === id ? { ...f, status: "published" } : f)) ?? []
      );
      return { previous };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(formKeys.all, ctx.previous);
      }
      toast.error(getErrorMessage(err, "Failed to publish form"));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.all });
      toast.success("Form published");
    },
  });
}

export function useUnpublishForm() {
  const qc = useQueryClient();
  return useMutation<FormRead, Error, number, { previous: FormListItem[] | undefined }>({
    mutationFn: (id) =>
      api.post<FormRead>(endpoints.forms.unpublish(id)),

    // Optimistic toggle
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: formKeys.all });
      const previous = qc.getQueryData<FormListItem[]>(formKeys.all);
      qc.setQueryData<FormListItem[]>(formKeys.all, (old) =>
        old?.map((f) => (f.id === id ? { ...f, status: "draft" } : f)) ?? []
      );
      return { previous };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(formKeys.all, ctx.previous);
      }
      toast.error(getErrorMessage(err, "Failed to unpublish form"));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.all });
      toast.success("Form unpublished");
    },
  });
}
