import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { api } from "@/services/http";
import type { ContentItem, Lead } from "@/services/domain-types";
import { CONTENT_COLLECTIONS } from "@/services/domain-types";
import { fetchSummary, fillDaily, type AnalyticsSummary } from "@/services/analytics";
import { MiniColumns, compact } from "@/components/charts";
import { Card, ErrorBanner, PanelHead, Pill,
  toneForStatus, SectionHead, Spinner, StatTile } from "@/components/ui";
import { initials } from "@/lib/utils";
import { useAuth, type AdminUser } from "@/store/auth";

export const Route = createFileRoute("/")({
  component: OverviewPage,
});

function greetingName(user: AdminUser | null): string {
  return user?.name?.trim() || user?.email?.split("@")[0] || "";
}

/** "14m" / "2h" / "4d" — the compact age the mockup shows beside each enquiry. */
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

const QUICK_ACTIONS: { label: string; to: string }[] = [
  { label: "New article", to: "/blogPosts" },
  { label: "Add project", to: "/projects" },
  { label: "Edit services", to: "/services" },
  { label: "Analytics", to: "/analytics" },
  { label: "View inbox", to: "/inbox" },
];

interface Loaded {
  leads: Lead[];
  newLeads: number;
  published: number;
  total: number;
  summary: AnalyticsSummary | null;
}

function OverviewPage() {
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [leads, summary, ...collections] = await Promise.all([
          api.get<Lead[]>("/admin/leads"),
          // Analytics must never take the whole screen down with it.
          fetchSummary(30).catch(() => null),
          ...CONTENT_COLLECTIONS.map((c) => api.get<ContentItem[]>(`/admin/content/${c.key}`)),
        ]);
        if (cancelled) return;
        const all = collections.flat();
        setData({
          leads,
          newLeads: leads.filter((l) => l.status === "new").length,
          published: all.filter((i) => i.published).length,
          total: all.length,
          summary,
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load overview");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const name = greetingName(user);
  const daily = data?.summary ? fillDaily(data.summary.range, data.summary.daily).slice(-14) : [];
  const latest = (data?.leads ?? [])
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  return (
    <div className="kf-scr">
      <SectionHead
        title={`Welcome back${name ? `, ${name}` : ""}`}
        subtitle="Here is how the site performed over the last 30 days."
      />
      {error ? <ErrorBanner message={error} /> : null}

      {!data && !error ? (
        <div className="grid place-items-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : null}

      {data ? (
        <>
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))" }}
          >
            <StatTile
              label="Visitors (30d)"
              value={data.summary ? compact(data.summary.totals.visitors) : "—"}
              caption="unique"
              delay={0}
            />
            <StatTile
              label="Clicks (30d)"
              value={data.summary ? compact(data.summary.totals.clicks) : "—"}
              caption="tracked controls"
              delay={0.06}
            />
            <StatTile
              label="Enquiries"
              value={String(data.leads.length)}
              caption={data.newLeads > 0 ? `${data.newLeads} new` : "all followed up"}
              tone={data.newLeads > 0 ? "success" : "neutral"}
              delay={0.12}
            />
            <StatTile
              label="Published content"
              value={`${data.published} / ${data.total}`}
              caption="across 7 collections"
              delay={0.18}
            />
          </div>

          <div
            className="mt-4 grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}
          >
            <Card className="flex flex-col">
              <PanelHead title="Traffic — last 14 days" subtitle="Pageviews per day on the public site." />
              {data.summary ? (
                <MiniColumns data={daily} />
              ) : (
                <p className="py-10 text-center text-ui text-faint">
                  Traffic data is not available right now.
                </p>
              )}
            </Card>

            <Card>
              <PanelHead title="Latest enquiries" subtitle="Straight from the contact form." />
              {latest.length === 0 ? (
                <p className="py-10 text-center text-ui text-faint">
                  No enquiries yet — they will appear here the moment one comes in.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {latest.map((m, i) => (
                    <Link
                      key={m.id}
                      to="/inbox"
                      className="flex items-start gap-3 pb-3"
                      style={{
                        borderBottom: i < latest.length - 1 ? "1px solid var(--border)" : "none",
                        color: "inherit",
                      }}
                    >
                      <div
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border text-caption font-bold bg-raised border-line"
                      >
                        {initials(m.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-ui font-semibold">{m.name}</span>
                          <Pill tone={toneForStatus(m.status)}>{m.status}</Pill>
                        </div>
                        <div className="truncate text-caption text-muted">
                          {m.message}
                        </div>
                      </div>
                      <span className="font-mono shrink-0 text-label text-faint">
                        {ago(m.createdAt)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="mt-4">
            <Card>
              <PanelHead title="Quick actions" />
              <div className="flex flex-wrap gap-2.5">
                {QUICK_ACTIONS.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => navigate({ to: a.to })}
                    className="rounded-control border px-4 py-2.5 text-ui font-semibold border-line bg-raised text-ink"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
