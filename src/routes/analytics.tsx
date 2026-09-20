import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import {
  fetchSummary,
  fillDaily,
  type AnalyticsRange,
  type AnalyticsSummary,
} from "@/services/analytics";
import {
  ChartCard,
  RankTable,
  RankedBars,
  ScrollTable,
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

const RANGES: AnalyticsRange[] = [7, 30, 90];

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
          <div
            className="flex shrink-0 overflow-hidden rounded-[10px] border"
            style={{ borderColor: "var(--border)", background: "var(--panel)" }}
          >
            {RANGES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                aria-pressed={days === d}
                className="px-[15px] py-2.5 text-[13px] font-semibold transition-colors"
                style={{
                  background: days === d ? "rgba(255,106,0,.12)" : "transparent",
                  color: days === d ? "var(--text)" : "var(--text2)",
                }}
              >
                {d} days
              </button>
            ))}
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
              className="mb-4 flex items-start gap-3.5"
              style={{ background: "var(--panel2)" }}
            >
              <div
                className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] border"
                style={{ background: "var(--panel)", borderColor: "var(--border)", color: "var(--text3)" }}
              >
                <BarChart3 size={18} />
              </div>
              <div>
                <div className="font-display text-[15px] font-semibold">No events yet</div>
                <p className="mt-1 max-w-[560px] text-[13.5px] leading-[1.55]" style={{ color: "var(--text2)" }}>
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
            <StatTile
              label="Pageviews"
              value={compact(data.totals.pageviews)}
              caption={`${data.range.days} days`}
              delay={0}
            />
            <StatTile
              label="Clicks"
              value={compact(data.totals.clicks)}
              caption={`${data.range.days} days`}
              delay={0.05}
            />
            <StatTile
              label="Visitors"
              value={compact(data.totals.visitors)}
              caption="unique"
              delay={0.1}
            />
            <StatTile
              label="Enquiries"
              value={compact(data.totals.leads)}
              caption="from the contact form"
              delay={0.15}
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
              title="Referrers"
              subtitle="Where visits came from before landing."
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
