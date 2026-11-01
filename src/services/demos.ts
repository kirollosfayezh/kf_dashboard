import { api, SERVER_ORIGIN } from "./http";
import { SITE_URL } from "@/components/content-crud/form-model";

/** An uploaded demo website, without its HTML (`GET/PUT/DELETE /api/admin/demos/:slug`). */
export interface DemoSummary {
  id: string;
  slug: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

export const demos = {
  get: (slug: string) => api.get<DemoSummary>(`/admin/demos/${encodeURIComponent(slug)}`),
  upload: (slug: string, html: string) => api.put<DemoSummary>(`/admin/demos/${encodeURIComponent(slug)}`, { html }),
  remove: (slug: string) => api.delete(`/admin/demos/${encodeURIComponent(slug)}`),
};

/** Where visitors open a demo: the site proxies /demos to the API; without a site URL (dev) the API serves it directly. */
export function demoPublicUrl(slug: string): string {
  return `${SITE_URL || SERVER_ORIGIN}/demos/${slug}`;
}
