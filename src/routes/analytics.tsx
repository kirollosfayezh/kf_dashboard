import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Download } from "lucide-react";
import {
  fetchInsights,
  fetchSummary,
  fillDaily,
  summaryToCsv,
  type AnalyticsInsights,
  type AnalyticsRange,
  type AnalyticsSummary,
} from "@/services/analytics";
import { ChartCard, RankTable, RankedBars, ScrollTable, TrendChart, TrendTable, VIZ_1, VIZ_2, type RankRow } from "@/components/charts";
import { Card, ErrorBanner, PanelHead, SectionHead } from "@/components/ui";
import {
  AdsSection,
  AudienceCards,
  CardSkeleton,
  ChannelTrendCard,
  FunnelCard,
  KpiStrip,
  LandingCard,
  ReachOutCards,
  SourcesCard,
  TimingCard,
} from "@/components/analytics-insights";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

const RANGES: { days: AnalyticsRange; label: string }[] = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "1 year" },
];

const SECTIONS = [
  { id: "an-overview", label: "Overview" },
  { id: "an-ads", label: "Google Ads" },
  { id: "an-visitors", label: "Visitors" },
  { id: "an-behaviour", label: "Behaviour" },
] as const;

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

/** Fetches one analytics payload per range, keeping the last result on screen while the next loads. */
function useRangeData<T>(days: AnalyticsRange, load: (d: AnalyticsRange) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    load(days)
      .then((r) => !cancelled && setData(r))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load analytics"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [days, load]);
  return { data, loading, error };
}

/**
 * The jump bar: sticks under the app header, highlights the section in view,
 * and scrolls to a section on tap. Scrolls sideways on its own if a phone is
 * too narrow for the four labels — never the page.
 */
function SectionNav() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const [top, setTop] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const header = document.querySelector("header");
    const measure = () => {
      const h = header?.getBoundingClientRect().height ?? 0;
      setTop(h);
      // Anchored sections land below both sticky bars.
      document.documentElement.style.setProperty("--an-scroll-mt", `${h + (barRef.current?.offsetHeight ?? 0) + 12}px`);
    };
    measure();
    const ro = header ? new ResizeObserver(measure) : null;
    if (header) ro?.observe(header);
    return () => ro?.disconnect();
  }, []);

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={barRef}
      className="sticky z-30 -mx-[18px] mb-4 px-[18px] py-2.5 backdrop-blur-[16px] md:-mx-[26px] md:px-[26px]"
      style={{ top, background: "var(--navbg)", borderBottom: "1px solid var(--border)" }}
    >
      <nav aria-label="Analytics sections" className="kf-noscrollbar flex gap-1 overflow-x-auto">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-current={active === s.id ? "true" : undefined}
            onClick={() => {
              setActive(s.id);
              document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5 text-ui font-semibold transition-colors sm:px-3.5",
              active === s.id ? "text-ink" : "text-muted hover:text-ink",
            )}
            style={active === s.id ? { background: "rgba(255,106,0,.12)", boxShadow: "inset 0 0 0 1px rgba(255,106,0,.35)" } : undefined}
          >
            {s.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Section({ id, title, subtitle, children }: React.PropsWithChildren<{ id: string; title: string; subtitle: string }>) {
  return (
    <section id={id} className="mb-10" style={{ scrollMarginTop: "var(--an-scroll-mt, 120px)" }}>
      <div className="mb-3.5">
        <h2 className="font-display text-title font-semibold tracking-[-.015em]">{title}</h2>
        <p className="mt-1 text-ui text-muted">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

const grid2 = { gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))" };

function AnalyticsPage() {
  const [days, setDays] = useState<AnalyticsRange>(30);
  const summary = useRangeData(days, fetchSummary);
  const insights = useRangeData(days, fetchInsights);
  const data = summary.data;
  const ins: AnalyticsInsights | null = insights.data;
  const loading = summary.loading || insights.loading;

  const daily = data ? fillDaily(data.range, data.daily) : [];
  // Leads come from the contact form, not the tracker — a range can have leads
  // and still have recorded no site events, which is what the notice is about.
  const hasEvents = !!data && data.totals.pageviews + data.totals.clicks > 0;

  const pageRows: RankRow[] = (data?.topPages ?? []).map((p) => ({ label: p.path, value: p.views, mono: true }));
  const clickRows: RankRow[] = (data?.topClicks ?? []).map((c) => ({ label: prettyControl(c.label), value: c.clicks }));
  const referrerRows: RankRow[] = (data?.topReferrers ?? []).map((r) => ({ label: hostOf(r.referrer), value: r.count }));
  const deviceRows: RankRow[] = (data?.devices ?? []).map((d) => ({
    label: d.device ? d.device[0].toUpperCase() + d.device.slice(1) : "Unknown",
    value: d.count,
  }));

  const error = summary.error ?? insights.error;

  return (
    <div className="kf-scr min-w-0">
      <SectionHead
        title="Analytics"
        subtitle="Who visits the site, where they come from, and who reaches out — straight from your own event log."
        action={
          /* One filter row above everything it scopes — every card re-reads the same slice. */
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
            <div className="flex min-w-0 overflow-hidden rounded-control border border-line bg-panel">
              {RANGES.map((r) => (
                <button
                  key={r.days}
                  type="button"
                  onClick={() => setDays(r.days)}
                  aria-pressed={days === r.days}
                  className="whitespace-nowrap px-[11px] py-2.5 text-ui font-semibold transition-colors sm:px-[15px]"
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
              className="flex shrink-0 items-center gap-2 rounded-control border px-3 py-2.5 sm:px-[15px] text-ui font-semibold transition-colors disabled:opacity-40 border-line bg-panel text-muted"
            >
              <Download size={15} />
              <span className="max-sm:sr-only">Export</span>
            </button>
          </div>
        }
      />

      <SectionNav />

      {error ? <div className="mb-4"><ErrorBanner message={error} /></div> : null}

      {/* Hold the previous render at reduced opacity on refetch — no skeleton flash. */}
      <div style={{ opacity: loading && data ? 0.55 : 1, transition: "opacity .2s" }} aria-busy={loading}>
        {data && !hasEvents ? (
          <Card className="mb-4 flex items-start gap-3.5 bg-raised">
            <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-control border bg-panel border-line text-faint">
              <BarChart3 size={18} />
            </div>
            <div>
              <div className="font-display text-body font-semibold">No events yet</div>
              <p className="mt-1 max-w-[560px] text-ui leading-[1.55] text-muted">
                Tracking is live but nothing has been recorded in the last {data.range.days} days. Numbers appear here as soon as
                visitors load a page or tap a tracked control on the site — nothing to configure.
              </p>
            </div>
          </Card>
        ) : null}

        <Section id="an-overview" title="Overview" subtitle="The headline numbers, each against the previous period of the same length.">
          <KpiStrip summary={data} insights={ins} />
          <div className="mt-4 grid gap-4" style={grid2}>
            {data ? (
              <ChartCard
                title="Daily traffic"
                subtitle={`Pageviews and clicks per day, ${data.range.from} to ${data.range.to}.`}
                chart={<TrendChart data={daily} />}
                table={<TrendTable data={daily} />}
              />
            ) : (
              <CardSkeleton />
            )}
            {ins ? <ChannelTrendCard insights={ins} /> : <CardSkeleton />}
          </div>
        </Section>

        <Section id="an-ads" title="Google Ads" subtitle="Everyone who arrived from a Google ad — what they searched, what they did, and who they are when they left their details.">
          {ins ? <AdsSection insights={ins} /> : <CardSkeleton height={260} />}
        </Section>

        <Section id="an-visitors" title="Visitors" subtitle="Where people come from, where they land, and who they are.">
          <div className="grid gap-4" style={grid2}>
            {ins ? <SourcesCard insights={ins} /> : <CardSkeleton />}
            {ins ? <LandingCard insights={ins} /> : <CardSkeleton />}
          </div>
          <div className="mt-4">{ins ? <AudienceCards insights={ins} /> : <CardSkeleton height={140} />}</div>
          <div className="mt-4 grid gap-4" style={grid2}>
            <ChartCard
              title="Referrers"
              subtitle="The individual sites that sent visits."
              chart={<RankedBars rows={referrerRows} color={VIZ_1} unit="visits" emptyLabel="No referrers recorded in this range." />}
              table={<RankTable rows={referrerRows} head={["Referrer", "Events"]} />}
            />
            <ChartCard
              title="Devices"
              subtitle="Recorded events by device type."
              chart={<RankedBars rows={deviceRows} color={VIZ_1} unit="events" emptyLabel="No device data recorded in this range." />}
              table={<RankTable rows={deviceRows} head={["Device", "Events"]} />}
            />
          </div>
        </Section>

        <Section id="an-behaviour" title="Behaviour" subtitle="What visitors do on the site, how they reach out, and when they are around.">
          <div className="grid gap-4" style={grid2}>
            {ins ? <FunnelCard insights={ins} /> : <CardSkeleton />}
            {ins ? <TimingCard insights={ins} /> : <CardSkeleton />}
          </div>
          <div className="mt-4">{ins ? <ReachOutCards insights={ins} /> : <CardSkeleton height={140} />}</div>
          <div className="mt-4 grid gap-4" style={grid2}>
            <ChartCard
              title="Most-clicked controls"
              subtitle="Which buttons and links visitors actually press."
              chart={<RankedBars rows={clickRows} color={VIZ_2} unit="clicks" emptyLabel="No control clicks recorded in this range." />}
              table={<RankTable rows={clickRows} head={["Control", "Clicks"]} />}
            />
            <ChartCard
              title="Most-viewed pages"
              subtitle="Where the traffic lands."
              chart={<RankedBars rows={pageRows} color={VIZ_1} unit="views" emptyLabel="No pageviews recorded in this range." />}
              table={<RankTable rows={pageRows} head={["Page", "Views"]} />}
            />
          </div>
        </Section>

        <Card>
          <PanelHead title="What is counted" subtitle="Everything on this screen comes from your own site — no third-party tracker." />
          <ScrollTable
            head={["Metric", "Definition"]}
            rows={[
              ["Visitors", "Distinct visitor ids seen in the range."],
              ["Pageviews", "One per page load on the public site."],
              ["Clicks", "One per tracked control (a labelled button or link)."],
              ["Tapped to contact", "Pressed a WhatsApp, phone, email or chat button."],
              ["Enquiries", "Contact-form and campaign leads created in the range."],
              ["Conversion", "Enquiries divided by visitors."],
              ["▲ / ▼ %", "Change against the period of the same length just before this one."],
              ["Source", "Where a visitor's first visit came from. Google Ads is split out from other paid traffic."],
              ["Google Ads visitor", "Arrived with a Google click id (gclid) or google + cpc tags. Keywords need the Final URL suffix in Google Ads."],
              ["Time on site", "From a person's first to last recorded action in the range; 'active on N days' when they came back."],
              ["Named contact", "A visitor who left their name, phone or email (form, chat or booking), linked to the CRM."],
              ["Referrers / devices", "Counted per recorded event, not per visitor."],
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
