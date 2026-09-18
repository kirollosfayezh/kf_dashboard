/** Mirrors kf_backend/functions/src/shared/http/api-response.ts */

export interface ApiErrorItem {
  code: string;
  message: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  errors: ApiErrorItem[];
  message: string | null;
}

export function messageFromEnvelope(envelope: ApiEnvelope<unknown> | null): string {
  if (!envelope) return "Request failed";
  if (envelope.errors?.length) {
    return envelope.errors.map((e) => e.message).filter(Boolean).join(". ");
  }
  if (envelope.message) return envelope.message;
  return "Request failed";
}
