import { api, endpoints } from "@/lib/api";
import type { PublicFormPayload, ResponseStartRead, ResponseSubmit } from "@/lib/types";

export function fetchPublicForm(publicId: string) {
  return api.get<PublicFormPayload>(endpoints.public.form(publicId));
}

export function fetchPreviewForm(formId: number) {
  return api.get<PublicFormPayload>(endpoints.preview.form(formId));
}

export function startPublicResponse(publicId: string) {
  return api.post<ResponseStartRead>(endpoints.public.start(publicId), {});
}

export function submitPublicResponse(publicId: string, body: ResponseSubmit) {
  return api.post<{ id: number; status: string }>(
    endpoints.public.submit(publicId),
    body
  );
}
