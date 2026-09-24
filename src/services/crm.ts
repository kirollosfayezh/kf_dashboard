import { api } from "./http";

/** Mirrors kf_backend `shared/types.ts` (CRM section) and the admin CRM routes. */

export const STAGES = ["new", "qualified", "proposal", "won", "lost"] as const;
export type Stage = (typeof STAGES)[number];

export interface Touch {
  referrer?: string;
  landingPath?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  fbclid?: string;
  at?: string;
}

export interface Visitor {
  id: string;
  visitorId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  sessions: number;
  pageviews: number;
  clicks: number;
  firstTouch?: Touch;
  lastTouch?: Touch;
  device?: string;
  browser?: string;
  os?: string;
  lang?: string;
  timezone?: string;
  country?: string;
  screen?: string;
  consent?: { status: "granted" | "denied"; at: string };
  contactId?: string;
  contactName?: string;
  channel?: string;
  online?: boolean;
}

export interface ConsentRecord {
  id: string;
  visitorId?: string;
  status: "granted" | "denied";
  source: "banner" | "settings";
  policyVersion: string;
  userAgent?: string;
  at: string;
}

export interface Contact {
  id: string;
  name?: string;
  phones: string[];
  emails: string[];
  company?: string;
  country?: string;
  sources: string[];
  visitorIds: string[];
  stage: Stage;
  value?: number;
  currency: string;
  tags: string[];
  lostReason?: string;
  nextFollowUpAt?: string;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  contactId: string;
  type: string;
  text?: string;
  meta?: Record<string, unknown>;
  by: string;
  at: string;
  contactName?: string;
}

export interface JourneyEvent {
  type: "pageview" | "click";
  path: string;
  label?: string;
  ts: number;
  device?: string;
  lang?: string;
  sessionId?: string;
  visitorId?: string;
}

export interface ContactDetail {
  contact: Contact;
  activities: Activity[];
  visitors: Visitor[];
  journey: JourneyEvent[];
  consent: ConsentRecord[];
  threads: { id: string; visitorId: string; phone?: string; lastMessageAt: string; visitorMeta?: { name?: string } }[];
  leads: { id: string; source: string; message: string; projectType?: string; budget?: string; createdAt: string; status: string }[];
}

export interface CrmOverview {
  stages: { stage: Stage; count: number; values: Record<string, number> }[];
  /** Open deals' value per currency. */
  openPipeline: Record<string, number>;
  newContacts7: number;
  newContacts30: number;
  visitors30: number;
  conversion30: number;
  online: number;
  followUps: Contact[];
  recent: Activity[];
}

export const crm = {
  overview: () => api.get<CrmOverview>("/admin/crm/overview"),
  contacts: (q: Record<string, string | undefined> = {}) => api.get<Contact[]>(`/admin/contacts${qs(q)}`),
  contact: (id: string) => api.get<ContactDetail>(`/admin/contacts/${id}`),
  createContact: (body: Record<string, unknown>) => api.post<Contact>("/admin/contacts", body),
  updateContact: (id: string, body: Record<string, unknown>) => api.patch<Contact>(`/admin/contacts/${id}`, body),
  eraseContact: (id: string) => api.delete(`/admin/contacts/${id}`),
  addNote: (id: string, text: string) => api.post<Activity>(`/admin/contacts/${id}/notes`, { text }),
  visitors: (q: Record<string, string | undefined> = {}) => api.get<Visitor[]>(`/admin/crm/visitors${qs(q)}`),
  visitor: (visitorId: string) =>
    api.get<{ visitor: Visitor; journey: JourneyEvent[]; consent: ConsentRecord[]; contact: Contact | null; chat: { visitorId: string; phone?: string } | null }>(
      `/admin/crm/visitors/${encodeURIComponent(visitorId)}`,
    ),
  consent: (q: Record<string, string | undefined> = {}) =>
    api.get<{ records: ConsentRecord[]; totals: { granted: number; denied: number }; days: number }>(`/admin/crm/consent${qs(q)}`),
};

/* ------------------------------------------------------------- quotes --- */

export type QuoteStatus = "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired";

export interface QuoteLine {
  description: string;
  qty: number;
  unitPrice: number;
}

export interface Quote {
  id: string;
  number: string;
  token: string;
  contactId?: string;
  contactName?: string;
  title: string;
  language: string;
  currency: string;
  lineItems: QuoteLine[];
  discountType: "percent" | "amount";
  discountValue: number;
  taxRate: number;
  notes?: string;
  validUntil?: string;
  status: QuoteStatus;
  total: number;
  sentAt?: string;
  viewedAt?: string;
  acceptedAt?: string;
  acceptedBy?: string;
  declinedAt?: string;
  declineReason?: string;
  createdAt: string;
  updatedAt: string;
  totals?: { lines: number[]; subtotal: number; discount: number; taxable: number; tax: number; total: number };
}

export const quotes = {
  list: (q: Record<string, string | undefined> = {}) => api.get<Quote[]>(`/admin/quotes${qs(q)}`),
  get: (id: string) => api.get<Quote>(`/admin/quotes/${id}`),
  create: (body: Record<string, unknown>) => api.post<Quote>("/admin/quotes", body),
  update: (id: string, body: Record<string, unknown>) => api.patch<Quote>(`/admin/quotes/${id}`, body),
  remove: (id: string) => api.delete(`/admin/quotes/${id}`),
  markSent: (id: string) => api.post<Quote>(`/admin/quotes/${id}/sent`, {}),
};

/** The client's link, in the quote's own language (English has no prefix). */
export function quoteLink(q: Pick<Quote, "token" | "language">): string {
  const site = (import.meta.env.VITE_SITE_URL?.trim() || window.location.origin).replace(/\/+$/, "");
  return `${site}${q.language && q.language !== "en" ? `/${q.language}` : ""}/q/${q.token}`;
}

/* ----------------------------------------------------------- bookings --- */

export type BookingStatus = "confirmed" | "completed" | "no_show" | "cancelled";

export interface Booking {
  id: string;
  start: string;
  end: string;
  name?: string;
  phone: string;
  phoneCountry?: string;
  topic?: string;
  lang?: string;
  contactId?: string;
  contactName?: string;
  status: BookingStatus;
  notes?: string;
  createdAt: string;
}

export const bookings = {
  list: (q: Record<string, string | undefined> = {}) => api.get<Booking[]>(`/admin/bookings${qs(q)}`),
  update: (id: string, body: Record<string, unknown>) => api.patch<Booking>(`/admin/bookings/${id}`, body),
};

/* ------------------------------------------------------ alerts/settings - */

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  contactId?: string;
  readAt?: string;
  createdAt: string;
}

export const notifications = {
  list: (q: Record<string, string | undefined> = {}) => api.get<AdminNotification[]>(`/admin/notifications${qs(q)}`),
  count: () => api.get<{ unread: number }>("/admin/notifications/count"),
  read: (ids: string[] | "all") => api.post<{ unread: number }>("/admin/notifications/read", { ids }),
  check: () => api.post("/admin/notifications/check", {}),
};

export interface TimeWindow {
  start: string;
  end: string;
}

export interface CrmSettings {
  telegram: { enabled: boolean; chatId?: string; events: Record<string, boolean>; hasBotToken: boolean; botTokenHint?: string };
  booking: {
    weekly: { windows: TimeWindow[] }[];
    slotMinutes: number;
    bufferMinutes: number;
    minNoticeHours: number;
    daysAhead: number;
    timezone: string;
    blockedDates: string[];
    enabled: boolean;
  };
  quotes: {
    companyName: string;
    address?: string;
    email?: string;
    phone?: string;
    taxId?: string;
    footer?: string;
    defaultCurrency: string;
    defaultTaxRate: number;
    defaultValidDays: number;
  };
  updatedAt: string;
}

export const crmSettings = {
  get: () => api.get<CrmSettings>("/admin/crm-settings"),
  update: (body: Record<string, unknown>) => api.patch<CrmSettings>("/admin/crm-settings", body),
  testTelegram: () => api.post<{ ok: true }>("/admin/crm-settings/telegram/test", {}),
};

function qs(q: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== "") p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}
