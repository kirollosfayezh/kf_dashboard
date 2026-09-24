import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@/services/http";
import type { Lead, LeadStatus } from "@/services/domain-types";
import { formatDate, initials } from "@/lib/utils";
import { Card, EmptyState, ErrorBanner, Pill,
  toneForStatus, SectionHead, Spinner } from "@/components/ui";

export const Route = createFileRoute("/inbox")({
  component: InboxPage,
});

const FILTERS: (LeadStatus | "all")[] = ["all", "new", "contacted", "won", "lost"];
const STATUSES: LeadStatus[] = ["new", "contacted", "won", "lost"];

function label(s: string) {
  return s === "all" ? "All" : s[0].toUpperCase() + s.slice(1);
}

/** "14m" / "2h" / "4d" — the compact age the mockup shows on each enquiry. */
function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function InboxPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LeadStatus | "all">("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async (status: LeadStatus | "all") => {
    setError(null);
    try {
      const qs = status === "all" ? "" : `?status=${status}`;
      setLeads(await api.get<Lead[]>(`/admin/leads${qs}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leads");
    }
  };

  useEffect(() => {
    void load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const updateStatus = async (lead: Lead, status: LeadStatus) => {
    setUpdating(lead.id);
    try {
      await api.patch(`/admin/leads/${lead.id}/status`, { status });
      // Optimistic on the "all" view; a filtered view has to re-query because
      // the lead may no longer belong in it.
      if (filter === "all") {
        setLeads((prev) => (prev ?? []).map((l) => (l.id === lead.id ? { ...l, status } : l)));
      } else {
        await load(filter);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="kf-scr">
      <SectionHead
        title="Inbox"
        subtitle="Contact form submissions. Set a status to track follow-up."
        action={
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const on = filter === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={on}
                  className="rounded-control border px-[15px] py-[9px] text-ui font-semibold"
                  style={{
                    borderColor: on ? "rgba(255,106,0,.45)" : "var(--border)",
                    background: on ? "rgba(255,106,0,.1)" : "var(--panel)",
                    color: "var(--text)",
                  }}
                >
                  {label(f)}
                </button>
              );
            })}
          </div>
        }
      />
      {error ? <ErrorBanner message={error} /> : null}

      {!leads && !error ? (
        <div className="grid place-items-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : null}

      {leads && leads.length === 0 ? (
        <EmptyState
          title="No enquiries here"
          body="Submissions from the contact form and campaign pages land in this list."
        />
      ) : null}

      {leads && leads.length > 0 ? (
        <div className="flex flex-col gap-3">
          {leads.map((lead, i) => {
            const phone = (lead.phone ?? "").replace(/[^\d]/g, "");
            return (
              <Card
                key={lead.id}
                className="!p-[18px]"
                style={{
                  animation: "kfIn .45s cubic-bezier(.22,1,.36,1) both",
                  animationDelay: `${Math.min(i, 8) * 0.05}s`,
                }}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border text-caption font-bold bg-raised border-line"
                  >
                    {initials(lead.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-body font-semibold">{lead.name}</div>
                    <a href={`mailto:${lead.email}`} className="font-mono block truncate text-caption">
                      {lead.email}
                    </a>
                  </div>
                  <span className="font-mono text-label text-faint">
                    {lead.source.toUpperCase()}
                  </span>
                  <Pill tone={toneForStatus(lead.status)}>{lead.status}</Pill>
                  <span
                    className="font-mono text-caption text-faint"
                    title={formatDate(lead.createdAt)}
                  >
                    {ago(lead.createdAt)}
                  </span>
                </div>

                {lead.company || lead.projectType || lead.budget ? (
                  <div
                    className="font-mono mt-2.5 flex flex-wrap gap-x-2 gap-y-1 text-caption text-faint"
                  >
                    {[lead.company, lead.projectType, lead.budget].filter(Boolean).map((v, idx) => (
                      <span key={String(v)}>
                        {idx > 0 ? <span className="mr-2">·</span> : null}
                        {String(v)}
                      </span>
                    ))}
                  </div>
                ) : null}

                <p className="mt-3 text-body leading-[1.6] text-muted">
                  {lead.message}
                </p>

                <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                  <a
                    href={`mailto:${lead.email}?subject=Re:%20your%20enquiry`}
                    className="rounded-control px-4 py-[9px] text-ui font-semibold bg-brand text-white"
                  >
                    Reply
                  </a>
                  {lead.contactId ? (
                    <Link
                      to="/contacts/$id"
                      params={{ id: lead.contactId }}
                      className="rounded-control border px-4 py-[9px] text-ui font-semibold border-line text-ink"
                    >
                      Open contact
                    </Link>
                  ) : null}
                  {phone ? (
                    <a
                      href={`https://wa.me/${phone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-control border px-4 py-[9px] text-ui font-semibold border-line bg-raised text-ink"
                    >
                      WhatsApp
                    </a>
                  ) : null}

                  <div className="flex-1" />

                  {/* The real "archive" is a status — same row position as the mockup. */}
                  <div
                    className="flex flex-wrap overflow-hidden rounded-control border border-line"
                  >
                    {STATUSES.map((s) => {
                      const on = lead.status === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={on || updating === lead.id}
                          onClick={() => void updateStatus(lead, s)}
                          className="px-3 py-[9px] text-caption font-semibold disabled:cursor-default"
                          style={{
                            background: on ? "rgba(255,106,0,.14)" : "transparent",
                            color: on ? "var(--text)" : "var(--text3)",
                          }}
                        >
                          {label(s)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
