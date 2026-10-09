"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, endpoints, ApiError } from "@/lib/api";
import type { QuestionCreate, QuestionRead, QuestionUpdate, QuestionOptionCreate } from "@/lib/types";
import { toast } from "sonner";
import { formKeys } from "./forms";

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.detail.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export function useCreateQuestion(formId: number) {
  const qc = useQueryClient();
  return useMutation<QuestionRead, Error, QuestionCreate>({
    mutationFn: (vars) =>
      api.post<QuestionRead>(endpoints.forms.questions.create(formId), vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.detail(formId) });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to create question"));
    },
  });
}

export function useUpdateQuestion(formId: number) {
  const qc = useQueryClient();
  return useMutation<QuestionRead, Error, { qid: number; updates: QuestionUpdate }>({
    mutationFn: ({ qid, updates }) =>
      api.patch<QuestionRead>(endpoints.questions.update(qid), updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.detail(formId) });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to update question"));
    },
  });
}

export function useDeleteQuestion(formId: number) {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (qid) =>
      api.delete<void>(endpoints.questions.delete(qid)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.detail(formId) });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to delete question"));
    },
  });
}

export function useReorderQuestions(formId: number) {
  const qc = useQueryClient();
  return useMutation<QuestionRead[], Error, number[]>({
    mutationFn: (ordered_ids) =>
      api.put<QuestionRead[]>(endpoints.forms.questions.reorder(formId), { ordered_ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.detail(formId) });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to reorder questions"));
    },
  });
}

export function useReplaceOptions(formId: number) {
  const qc = useQueryClient();
  return useMutation<void, Error, { qid: number; options: QuestionOptionCreate[] }>({
    mutationFn: ({ qid, options }) =>
      api.put<void>(endpoints.questions.options(qid), {
        options: options.map((option) => option.label),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: formKeys.detail(formId) });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to update options"));
    },
  });
}
