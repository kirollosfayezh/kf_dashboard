import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Download } from "lucide-react";
import {
  classifySources,
  delta,
  fetchSummary,
  fillDaily,
  summaryToCsv,
  type AnalyticsRange,
  type AnalyticsSummary,
} from "@/services/analytics";
import {
  ChartCard,
  RankTable,
  RankedBars,
  ScrollTable,
  SourceShareBars,
  SourceShareTable,
  TrendChart,
  TrendTable,
  VIZ_1,
  VIZ_2,
  compact,
  type RankRow,
} from "@/components/charts";
import { Card, ErrorBanner, PanelHead, SectionHead, Spinner, StatTile } from "@/components/ui";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

const RANGES: { days: AnalyticsRange; label: string }[] = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "1 year" },
];

/** Triggers a client-side download without a round trip to the server. */
function downloadCsv(data: AnalyticsSummary) {
  const blob = new Blob([summaryToCsv(data)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kf-analytics-${data.range.from}-to-${data.range.to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** `hero.start-project` → `hero · start project`, so the list is readable at a glance. */
function prettyControl(label: string): string {
  return label.split(".").map((p) => p.replace(/[-_]/g, " ")).join(" · ");
}

function hostOf(referrer: string): string {
  if (!referrer) return "Direct";
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return referrer;
  }
}

function AnalyticsPage() {
  const [days, setDays] = useState<AnalyticsRange>(30);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSummary(days)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load analytics");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const daily = data ? fillDaily(data.range, data.daily) : [];
  // Leads come from the contact form, not the tracker — a range can have leads
  // and still have recorded no site events, which is what the notice is about.
  const hasEvents = !!data && data.totals.pageviews + data.totals.clicks > 0;

  const pageRows: RankRow[] = (data?.topPages ?? []).map((p) => ({
    label: p.path,
    value: p.views,
    mono: true,
  }));
  const clickRows: RankRow[] = (data?.topClicks ?? []).map((c) => ({
    label: prettyControl(c.label),
    value: c.clicks,
  }));
  const referrerRows: RankRow[] = (data?.topReferrers ?? []).map((r) => ({
    label: hostOf(r.referrer),
    value: r.count,
  }));
  // Channel buckets rather than raw hosts — "where does traffic come from?" is
  // a four-answer question, not a twenty-host list. Raw hosts stay available in
  // the Referrers card below.
  const sourceRows = data ? classifySources(data.topReferrers, data.totals.pageviews) : [];

  const deviceRows: RankRow[] = (data?.devices ?? []).map((d) => ({
    label: d.device ? d.device[0].toUpperCase() + d.device.slice(1) : "Unknown",
    value: d.count,
  }));

  return (
    <div className="kf-scr">
      <SectionHead
        title="Analytics"
        subtitle="Traffic and clicks recorded on the live site, straight from your own event log."
        action={
          /* One filter row above everything it scopes — every card re-reads the same slice. */
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div
              className="flex overflow-hidden rounded-control border border-line bg-panel"
            >
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                onClick={() => setDays(r.days)}
                aria-pressed={days === r.days}
                className="px-[15px] py-2.5 text-ui font-semibold transition-colors"
                style={{
                  background: days === r.days ? "rgba(255,106,0,.12)" : "transparent",
                  color: days === r.days ? "var(--text)" : "var(--text2)",
                }}
              >
                {r.label}
              </button>
            ))}
            </div>
            <button
              type="button"
              onClick={() => data && downloadCsv(data)}
              disabled={!data}
              title="Download everything on this screen as CSV"
              className="flex shrink-0 items-center gap-2 rounded-control border px-[15px] py-2.5 text-ui font-semibold transition-colors disabled:opacity-40 border-line bg-panel text-muted"
            >
              <Download size={15} />
              Export
            </button>
          </div>
        }
      />

      {error ? <ErrorBanner message={error} /> : null}

      {!data && loading ? (
        <div className="grid place-items-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : null}

      {data ? (
        /* Hold the previous render at reduced opacity on refetch — no skeleton flash. */
        <div style={{ opacity: loading ? 0.55 : 1, transition: "opacity .2s" }}>
          {!hasEvents ? (
            <Card
              className="mb-4 flex items-start gap-3.5 bg-raised"
            >
              <div
                className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-control border bg-panel border-line text-faint"
              >
                <BarChart3 size={18} />
              </div>
              <div>
                <div className="font-display text-body font-semibold">No events yet</div>
                <p className="mt-1 max-w-[560px] text-ui leading-[1.55] text-muted">
                  Tracking is live but nothing has been recorded in the last {data.range.days} days.
                  Numbers appear here as soon as visitors load a page or tap a tracked control on
                  the site — nothing to configure.
                </p>
              </div>
            </Card>
          ) : null}

          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))" }}
          >
            {(
              [
                ["Pageviews", "pageviews"],
                ["Clicks", "clicks"],
                ["Visitors", "visitors"],
                ["Enquiries", "leads"],
              ] as const
            ).map(([label, key], i) => {
              const d = delta(data.totals[key], data.previous[key]);
              return (
                <StatTile
                  key={key}
                  label={label}
                  value={compact(data.totals[key])}
                  caption={d.label}
                  tone={d.direction === "up" ? "success" : d.direction === "down" ? "danger" : "neutral"}
                  delay={i * 0.05}
                />
              );
            })}
            <StatTile
              label="Conversion"
              value={
                data.totals.visitors > 0
                  ? `${Math.round((data.totals.leads / data.totals.visitors) * 1000) / 10}%`
                  : "—"
              }
              caption="enquiries per visitor"
              delay={0.2}
            />
          </div>

          <div className="mt-4">
            <ChartCard
              title="Daily traffic"
              subtitle={`Pageviews and clicks per day, ${data.range.from} to ${data.range.to}.`}
              chart={<TrendChart data={daily} />}
              table={<TrendTable data={daily} />}
            />
          </div>

          <div
            className="mt-4 grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}
          >
            <ChartCard
              title="Most-clicked controls"
              subtitle="Which buttons and links visitors actually press."
              chart={
                <RankedBars
                  rows={clickRows}
                  color={VIZ_2}
                  unit="clicks"
                  emptyLabel="No control clicks recorded in this range."
                />
              }
              table={<RankTable rows={clickRows} head={["Control", "Clicks"]} />}
            />
            <ChartCard
              title="Most-viewed pages"
              subtitle="Where the traffic lands."
              chart={
                <RankedBars
                  rows={pageRows}
                  color={VIZ_1}
                  unit="views"
                  emptyLabel="No pageviews recorded in this range."
                />
              }
              table={<RankTable rows={pageRows} head={["Page", "Views"]} />}
            />
          </div>

          <div
            className="mt-4 grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}
          >
            <ChartCard
              title="Traffic sources"
              subtitle="Share of visits by channel, grouped from the referring host."
              chart={<SourceShareBars rows={sourceRows} />}
              table={<SourceShareTable rows={sourceRows} />}
            />
            <ChartCard
              title="Referrers"
              subtitle="The individual hosts behind those channels."
              chart={
                <RankedBars
                  rows={referrerRows}
                  color={VIZ_1}
                  unit="visits"
                  emptyLabel="No referrers recorded in this range."
                />
              }
              table={<RankTable rows={referrerRows} head={["Referrer", "Events"]} />}
            />
            <ChartCard
              title="Devices"
              subtitle="Recorded events by device type."
              chart={
                <RankedBars
                  rows={deviceRows}
                  color={VIZ_1}
                  unit="events"
                  emptyLabel="No device data recorded in this range."
                />
              }
              table={<RankTable rows={deviceRows} head={["Device", "Events"]} />}
            />
          </div>

          <div className="mt-4">
            <Card>
              <PanelHead
                title="What is counted"
                subtitle="Everything on this screen comes from your own site — no third-party tracker."
              />
              <ScrollTable
                head={["Metric", "Definition"]}
                rows={[
                  ["Pageviews", "One per page load on the public site."],
                  ["Clicks", "One per tracked control (a labelled button or link)."],
                  ["Visitors", "Distinct visitor ids seen in the range."],
                  ["Enquiries", "Contact-form and campaign leads created in the range."],
                  ["Referrers / devices", "Counted per recorded event, not per visitor."],
                ]}
              />
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
