import { api } from "./http";
import type { Subscriber } from "./domain-types";

/** Admin side of the newsletter list: `GET/DELETE /api/admin/newsletter`. */
export const newsletter = {
  /** Every subscriber, newest first; `q` filters by email on the server. */
  list: (q?: string) =>
    api.get<Subscriber[]>(`/admin/newsletter${q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`),
  remove: (id: string) => api.delete(`/admin/newsletter/${id}`),
};
