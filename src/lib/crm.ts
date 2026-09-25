import type { QuoteStatus, Stage } from "@/services/crm";

/** Display helpers shared by the CRM screens. */

export const STAGE_META: Record<Stage, { label: string; color: string; tone: "neutral" | "info" | "warning" | "success" | "danger" }> = {
  new: { label: "New", color: "var(--color-info)", tone: "info" },
  qualified: { label: "Qualified", color: "#9B5DE5", tone: "neutral" },
  proposal: { label: "Proposal", color: "var(--color-warning)", tone: "warning" },
  won: { label: "Won", color: "var(--color-success)", tone: "success" },
  lost: { label: "Lost", color: "var(--color-danger)", tone: "danger" },
};

/** 🇪🇬 from "EG". */
export function flagOf(country?: string): string {
  if (!country || !/^[A-Z]{2}$/.test(country)) return "";
  return country.replace(/./g, (c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65));
}

let regionNames: Intl.DisplayNames | null = null;
export function countryName(code?: string): string {
  if (!code) return "";
  try {
    regionNames ??= new Intl.DisplayNames(["en"], { type: "region" });
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export function money(value: number | undefined, currency = "EGP"): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${value.toLocaleString("en-US")} ${currency}`;
  }
}

/** "€4,500 + EGP 12,000" — totals kept per currency, never added across them. */
export function moneyByCurrency(values: Record<string, number>): string {
  const parts = Object.entries(values).filter(([, v]) => v > 0);
  return parts.length ? parts.map(([cur, v]) => money(v, cur)).join(" + ") : "—";
}

/** "14m" / "2h" / "4d" ago, or a date past a month. */
export function ago(iso: string | number | undefined): string {
  if (!iso) return "—";
  const t = typeof iso === "number" ? iso : Date.parse(iso);
  const ms = Date.now() - t;
  if (!Number.isFinite(ms)) return "—";
  if (ms < 0) return "soon";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 31) return `${d}d ago`;
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function dateTime(iso: string | number | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export const whatsappLink = (e164: string, text?: string) =>
  `https://wa.me/${e164.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const CHANNEL_LABEL: Record<string, string> = {
  paid: "Paid ad",
  campaign: "Campaign",
  search: "Search",
  social: "Social",
  referral: "Referral",
  direct: "Direct",
};

export const SOURCE_LABEL: Record<string, string> = {
  chat: "Live chat",
  contact: "Contact form",
  campaign: "Campaign form",
  booking: "Booking",
  quote: "Quote",
  newsletter: "Newsletter",
  manual: "Added manually",
};

/** A `conversion` journey event's label, as the action it stands for. */
export const CONVERSION_LABEL: Record<string, string> = {
  lead: "enquiry sent",
  booking: "call booked",
  chat_start: "chat started",
  quote_accepted: "quote accepted",
  newsletter: "newsletter signup",
};

export function contactName(c: { name?: string; phones?: string[]; emails?: string[] }): string {
  return c.name?.trim() || c.phones?.[0] || c.emails?.[0] || "Unnamed contact";
}

/** Downloads rows as a CSV file (Excel-friendly: BOM + quoted cells). */
export function downloadCsv(filename: string, header: string[], rows: (string | number | undefined)[][]) {
  const cell = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const text = "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const QUOTE_STATUS: Record<QuoteStatus, { label: string; tone: "neutral" | "info" | "warning" | "success" | "danger" }> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Sent", tone: "info" },
  viewed: { label: "Viewed", tone: "warning" },
  accepted: { label: "Accepted", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  expired: { label: "Expired", tone: "neutral" },
};
