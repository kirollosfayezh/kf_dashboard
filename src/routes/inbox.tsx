import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/services/http";
import type { Lead, LeadStatus } from "@/services/domain-types";
import { formatDate, initials } from "@/lib/utils";
import {
  Button,
  Card,
  Drawer,
  EmptyState,
  ErrorBanner,
  Pill,
  Select,
  SectionHead,
  Spinner,
} from "@/components/ui";

export const Route = createFileRoute("/inbox")({
  component: InboxPage,
});

const STATUS_OPTIONS: (LeadStatus | "all")[] = ["all", "new", "contacted", "won", "lost"];

function InboxPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LeadStatus | "all">("all");
  const [active, setActive] = useState<Lead | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = async (status: LeadStatus | "all") => {
    setError(null);
    try {
      const qs = status === "all" ? "" : `?status=${status}`;
      const data = await api.get<Lead[]>(`/admin/leads${qs}`);
      setLeads(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leads");
    }
  };

  useEffect(() => {
    void load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const updateStatus = async (lead: Lead, status: LeadStatus) => {
    setUpdating(true);
    try {
      await api.patch(`/admin/leads/${lead.id}/status`, { status });
      await load(filter);
      setActive((prev) => (prev && prev.id === lead.id ? { ...prev, status } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="kf-scr">
      <SectionHead
        title="Inbox"
        subtitle="Contact form submissions. Set a status to track follow-up."
        action={
          <Select value={filter} onChange={(e) => setFilter(e.target.value as LeadStatus | "all")} className="w-auto">
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </Select>
        }
      />
      {error ? <ErrorBanner message={error} /> : null}
      {!leads && !error ? (
        <div className="grid place-items-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : null}
      {leads && leads.length === 0 ? (
        <EmptyState title="No leads here" body="Submissions from the contact form and campaigns will show up here." />
      ) : null}
      {leads && leads.length > 0 ? (
        <div
          className="overflow-hidden rounded-2xl border"
          style={{ borderColor: "var(--border)", background: "var(--panel)" }}
        >
          {/* Column headings only make sense once the rows are actually a grid (md+). */}
          <div
            className="hidden gap-3.5 border-b px-5 py-3 text-[10.5px] tracking-wider md:grid md:grid-cols-[1.6fr_1.8fr_1fr_0.9fr_0.9fr]"
            style={{
              borderColor: "var(--border)",
              background: "var(--panel2)",
              color: "var(--text3)",
            }}
          >
            <div className="font-mono">NAME</div>
            <div className="font-mono">EMAIL</div>
            <div className="font-mono">SOURCE</div>
            <div className="font-mono">STATUS</div>
            <div className="font-mono">DATE</div>
          </div>
          {leads.map((lead, i) => (
            <button
              key={lead.id}
              onClick={() => setActive(lead)}
              className="kf-row flex w-full flex-col gap-1.5 border-b px-4 py-3.5 text-left text-[14px] md:grid md:grid-cols-[1.6fr_1.8fr_1fr_0.9fr_0.9fr] md:items-center md:gap-3.5 md:px-5"
              style={{ borderColor: i < leads.length - 1 ? "var(--border)" : "transparent" }}
            >
              <div className="flex items-center justify-between gap-2 md:block md:min-w-0">
                <span className="truncate font-semibold">{lead.name}</span>
                {/* Status rides next to the name on mobile; it has its own column on md+. */}
                <span className="md:hidden">
                  <Pill text={lead.status} />
                </span>
              </div>
              <div className="font-mono truncate text-[13px]" style={{ color: "var(--text2)" }}>
                {lead.email}
              </div>
              <div className="hidden text-[13px] md:block" style={{ color: "var(--text2)" }}>
                {lead.source}
              </div>
              <div className="hidden md:block">
                <Pill text={lead.status} />
              </div>
              <div className="font-mono text-[12px]" style={{ color: "var(--text3)" }}>
                <span className="md:hidden">{lead.source} · </span>
                {formatDate(lead.createdAt)}
              </div>
            </button>
          ))}
        </div>
      ) : null}

      <Drawer open={!!active} onClose={() => setActive(null)} title={active?.name ?? ""}>
        {active ? (
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div
                className="grid h-9 w-9 place-items-center rounded-full text-[12.5px] font-bold"
                style={{ background: "var(--panel2)", border: "1px solid var(--border)" }}
              >
                {initials(active.name)}
              </div>
              <div>
                <a href={`mailto:${active.email}`} className="font-mono block text-[13px]">
                  {active.email}
                </a>
                {active.phone ? (
                  <div className="font-mono text-[12px]" style={{ color: "var(--text3)" }}>
                    {active.phone}
                  </div>
                ) : null}
              </div>
            </div>

            <Card className="mb-4" style={{ background: "var(--panel2)" }}>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px]" style={{ color: "var(--text3)" }}>
                <span className="font-mono">{active.source.toUpperCase()}</span>
                <span>·</span>
                <span>{formatDate(active.createdAt)}</span>
                {active.company ? (
                  <>
                    <span>·</span>
                    <span>{active.company}</span>
                  </>
                ) : null}
                {active.projectType ? (
                  <>
                    <span>·</span>
                    <span>{active.projectType}</span>
                  </>
                ) : null}
                {active.budget ? (
                  <>
                    <span>·</span>
                    <span>{active.budget}</span>
                  </>
                ) : null}
              </div>
              <p className="text-[14.5px] leading-relaxed">{active.message}</p>
            </Card>

            <div className="mb-2 text-[12.5px] font-semibold" style={{ color: "var(--text2)" }}>
              Status
            </div>
            <div className="flex flex-wrap gap-2">
              {(["new", "contacted", "won", "lost"] as LeadStatus[]).map((s) => (
                <Button
                  key={s}
                  disabled={updating || active.status === s}
                  onClick={() => void updateStatus(active, s)}
                  variant={active.status === s ? "default" : "ghost"}
                  style={
                    active.status === s
                      ? undefined
                      : { border: "1px solid var(--border)" }
                  }
                >
                  {s[0].toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
