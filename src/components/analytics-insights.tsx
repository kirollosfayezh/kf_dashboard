import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, Mail, MessageCircle, MousePointerClick, Phone } from "lucide-react";
import { delta, type AdVisitor, type AnalyticsInsights, type AnalyticsSummary, type InsightRow, type SeriesChannel } from "@/services/analytics";
import {
  ChartCard,
  FunnelChart,
  FunnelTable,
  LineChart,
  RankTable,
  RankedBars,
  ScrollTable,
  Sparkline,
  StackedColumns,
  VIZ_1,
  VIZ_2,
  VIZ_3,
  VIZ_4,
  WeekHeatmap,
  WeekHeatmapTable,
  busiestWindow,
  compact,
  describeWindow,
  shortDay,
  type LineSeries,
  type RankRow,
} from "@/components/charts";
import { Card, PanelHead, Pill, Skeleton, StatTile } from "@/components/ui";
import { countryName } from "@/lib/crm";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
 * Colour follows the SOURCE everywhere on this screen: Google Ads is always the
 * brand orange, free search blue, social violet, direct green (dashed where it
 * is a line — orange/green sit too close for deuteranopes), everything rarer a
 * neutral "other". Order validated with the dataviz checker on both surfaces.
 * ------------------------------------------------------------------------- */
const NEUTRAL = "var(--text3)";

/** Plain-language names for the traffic groups the backend returns. */
export const CHANNEL: Record<string, string> = {
  google_ads: "Google Ads",
  other_ads: "Other ads (Meta, TikTok…)",
  campaign: "Tagged links (posts, bio, email)",
  search: "Google & other search (free)",
  social: "Social media",
  referral: "Other websites",
  direct: "Direct / typed / WhatsApp",
};
const CHANNEL_COLOR: Record<string, string> = { google_ads: VIZ_1, search: VIZ_3, social: VIZ_2, direct: VIZ_4 };

const SERIES: LineSeries<SeriesChannel>[] = [
  { key: "google_ads", label: "Google Ads", color: VIZ_1 },
  { key: "search", label: "Free search", color: VIZ_3 },
  { key: "social", label: "Social", color: VIZ_2 },
  { key: "direct", label: "Direct", color: VIZ_4, dash: "6 4" },
  { key: "other", label: "Other", color: NEUTRAL, dash: "2 4" },
];

const TAP: Record<string, string> = { whatsapp: "WhatsApp", phone: "Phone call", email: "Email", chat: "Chat opened" };

const CONVERSION: Record<string, string> = {
  lead: "Contact form sent",
  booking: "Call booked",
  chat_start: "Chat started",
  quote_accepted: "Quote accepted",
  newsletter: "Newsletter signup",
};

/** Wraps user text (an Arabic keyword) in a bidi isolate so a suffix like "· 1 enquiry" stays after it. */
const isolate = (s: string) => `\u2068${s}\u2069`;
const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 1000) / 10}%` : "—");
const grid2 = { gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))" };
const grid3 = { gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))" };

/** Visitors / enquiries / rate, for any keyed table. */
function rateRows(rows: InsightRow[], label: (k: string) => string = (k) => k): string[][] {
  return rows.map((r) => [label(r.key), r.visitors.toLocaleString(), r.leads.toLocaleString(), pct(r.leads, r.visitors)]);
}

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" });
}

/** "4m 10s on site" for one visit; "active on 3 days" when they came back. */
export function timeOnSite(spanSeconds: number, activeDays: number): string {
  if (activeDays > 1) return `active on ${activeDays} days`;
  if (spanSeconds < 5) return "one quick look";
  const m = Math.floor(spanSeconds / 60);
  const s = spanSeconds % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m on site`;
  return m ? `${m}m ${s}s on site` : `${s}s on site`;
}

/* ------------------------------- Skeletons -------------------------------- */

export function CardSkeleton({ height = 200, className }: { height?: number; className?: string }) {
  return (
    <Card className={className}>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-2 h-3 w-64 max-w-full" />
      <div className="mt-5 animate-pulse rounded-control bg-hover" style={{ height }} />
    </Card>
  );
}

/* --------------------------------- KPIs ----------------------------------- */

function KpiTile({
  label,
  value,
  current,
  previous,
  series,
  days,
  color,
  format = (n) => n.toLocaleString(),
}: {
  label: string;
  value: string;
  current: number;
  previous: number;
  series: number[];
  days: string[];
  color: string;
  format?: (n: number) => string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const d = delta(current, previous);
  return (
    <Card padding="compact" className="min-w-0">
      <div className="truncate text-caption text-muted" title={label}>{label}</div>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <span className="font-display text-title font-semibold tracking-[-.02em]">{value}</span>
        <span
          className={cn(
            "font-mono shrink-0 rounded-full px-1.5 py-0.5 text-label",
            d.direction === "up" && "bg-success-bg text-success",
            d.direction === "down" && "bg-danger-bg text-danger",
            d.direction === "flat" && "bg-hover text-faint",
          )}
          title={`Previous period: ${format(previous)}`}
        >
          {d.pct == null ? (d.direction === "up" ? "new" : "—") : `${d.direction === "up" ? "▲ " : d.direction === "down" ? "▼ " : ""}${Math.abs(d.pct)}%`}
        </span>
      </div>
      <Sparkline values={series} days={days} color={color} onHover={setHover} />
      <div className="font-mono mt-1 truncate text-label text-faint">{hover ?? `prev. period ${format(previous)}`}</div>
    </Card>
  );
}

const KPI_COLS = { gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 158px), 1fr))" };

/**
 * The headline row: six numbers, each with its change against the previous
 * period of the same length and a daily sparkline. Visitors, taps, enquiries
 * and ad visitors come from the per-visitor insights; pageviews from the event
 * summary.
 */
export function KpiStrip({ summary, insights }: { summary: AnalyticsSummary | null; insights: AnalyticsInsights | null }) {
  if (!insights || !summary) {
    return (
      <div className="grid gap-3" style={KPI_COLS} aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i} padding="compact">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-7 w-16" />
            <Skeleton className="mt-3 h-[30px] w-full" />
          </Card>
        ))}
      </div>
    );
  }
  const daily = insights.daily;
  const days = daily.map((d) => d.day);
  const prev = insights.previous;
  const f = insights.funnel;
  const conv = f.visitors ? (f.leads / f.visitors) * 100 : 0;
  const prevConv = prev.visitors ? (prev.leads / prev.visitors) * 100 : 0;
  const pvByDay = new Map(summary.daily.map((d) => [d.day, d.pageviews]));
  const pctFmt = (n: number) => `${Math.round(n * 10) / 10}%`;
  return (
    <div className="grid gap-3" style={KPI_COLS}>
      <KpiTile label="Visitors" value={compact(f.visitors)} current={f.visitors} previous={prev.visitors} series={daily.map((d) => d.visitors)} days={days} color={VIZ_1} />
      <KpiTile
        label="Pageviews"
        value={compact(summary.totals.pageviews)}
        current={summary.totals.pageviews}
        previous={summary.previous.pageviews}
        series={days.map((d) => pvByDay.get(d) ?? 0)}
        days={days}
        color={VIZ_1}
      />
      <KpiTile label="Contact taps" value={compact(f.contactTaps)} current={f.contactTaps} previous={prev.contactTaps} series={daily.map((d) => d.contactTaps)} days={days} color={VIZ_2} />
      <KpiTile label="Enquiries" value={compact(f.leads)} current={f.leads} previous={prev.leads} series={daily.map((d) => d.leads)} days={days} color={VIZ_2} />
      <KpiTile
        label="Conversion"
        value={f.visitors ? pctFmt(conv) : "—"}
        current={conv}
        previous={prevConv}
        series={daily.map((d) => (d.visitors ? Math.round((d.leads / d.visitors) * 1000) / 10 : 0))}
        days={days}
        color={VIZ_2}
        format={pctFmt}
      />
      <KpiTile label="Ad visitors" value={compact(insights.ads.visitors)} current={insights.ads.visitors} previous={prev.adVisitors} series={daily.map((d) => d.adVisitors)} days={days} color={VIZ_1} />
    </div>
  );
}

/* ------------------------------ Source trend ------------------------------ */

export function ChannelTrendCard({ insights }: { insights: AnalyticsInsights }) {
  const rows = insights.daily.map((d) => ({ day: d.day, ...d.channels }));
  // A source with nothing in the range is left out — its survivors keep their colours.
  const shown = SERIES.filter((s) => rows.some((r) => r[s.key] > 0));
  return (
    <ChartCard
      title="Visitors by source"
      subtitle="People per day, stacked by where their first visit came from."
      chart={
        shown.length ? (
          <StackedColumns data={rows} series={shown} label="Visitors per day by source" unit="visitors" />
        ) : (
          <p className="py-10 text-center text-ui text-faint">Sources appear once visitors arrive with a tracked first visit.</p>
        )
      }
      table={<ScrollTable head={["Day", ...SERIES.map((s) => s.label)]} rows={rows.map((r) => [shortDay(r.day), ...SERIES.map((s) => String(r[s.key]))])} numericFrom={1} />}
    />
  );
}

/* ------------------------------- Google Ads ------------------------------- */

function TapIcon({ kind }: { kind: string }) {
  const Icon = kind === "phone" ? Phone : kind === "email" ? Mail : kind === "chat" ? MessageCircle : MousePointerClick;
  return <Icon size={13} />;
}

/** One person who came from a Google ad: what they searched, what they did, who they are. */
function AdPerson({ p }: { p: AdVisitor }) {
  const hot = !!p.contact || p.conversions.length > 0;
  return (
    <div className="min-w-0 rounded-control border border-line bg-panel p-3.5" style={hot ? { borderColor: "rgba(255,106,0,.45)" } : undefined}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {p.contact ? (
            <Link to="/contacts/$id" params={{ id: p.contact.id }} className="truncate font-display text-body font-semibold text-ink hover:underline">
              {p.contact.name || p.contact.phones[0] || p.contact.emails[0] || "Contact"}
            </Link>
          ) : (
            <span className="font-display text-body font-semibold text-muted">Anonymous visitor</span>
          )}
          {p.contact?.company ? <span className="truncate text-caption text-faint">· {p.contact.company}</span> : null}
        </div>
        <span className="font-mono text-caption text-faint">{when(p.lastSeenAt)}</span>
      </div>
      {p.contact ? (
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-ui">
          {p.contact.phones.map((ph) => (
            <a key={ph} href={`tel:${ph}`} className="text-ink hover:underline">{ph}</a>
          ))}
          {p.contact.emails.map((em) => (
            <a key={em} href={`mailto:${em}`} className="break-all text-ink hover:underline">{em}</a>
          ))}
        </div>
      ) : null}
      <div className="mt-2 grid gap-x-4 gap-y-1 text-caption text-muted" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))" }}>
        <span className="min-w-0">Keyword: <b className="text-ink">{p.keyword || "—"}</b></span>
        <span className="min-w-0">Campaign: <b className="text-ink">{p.campaign || "—"}</b></span>
        <span className="min-w-0 break-words">Landed on: <b className="font-mono text-ink">{p.landingPath || "—"}</b></span>
        <span className="min-w-0">
          {[p.device, countryName(p.country), p.lang?.toUpperCase()].filter(Boolean).join(" · ") || "—"} · {p.pageviews} pages
        </span>
        <span className="flex min-w-0 items-center gap-1">
          <Clock size={12} aria-hidden="true" />
          {timeOnSite(p.spanSeconds ?? 0, p.activeDays ?? 1)}
        </span>
      </div>
      {p.contactTaps.length || p.conversions.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {p.contactTaps.map((t) => (
            <Pill key={t} tone="info"><span className="inline-flex items-center gap-1"><TapIcon kind={t} />{TAP[t] ?? t}</span></Pill>
          ))}
          {p.conversions.map((c) => (
            <Pill key={c} tone="success">{CONVERSION[c] ?? c}</Pill>
          ))}
        </div>
      ) : null}
      {p.pages.length ? (
        <div className="mt-2 truncate font-mono text-caption text-faint" title={p.pages.join("  →  ")}>
          {p.pages.join("  →  ")}
        </div>
      ) : null}
    </div>
  );
}

export function AdsSection({ insights }: { insights: AnalyticsInsights }) {
  const [showAll, setShowAll] = useState(false);
  const [onlyHot, setOnlyHot] = useState(false);
  const ads = insights.ads;
  const people = ads.people.filter((p) => !onlyHot || p.contact || p.conversions.length || p.contactTaps.length);
  const shown = showAll ? people : people.slice(0, 12);
  const untagged = ads.visitors > 0 && ads.keywords.every((k) => k.key === "(not tagged)");
  const trend = insights.daily.map((d) => ({ day: d.day, adVisitors: d.adVisitors, adLeads: d.adLeads }));
  const named = ads.people.filter((p) => p.contact).length;
  const vsPrev = delta(ads.visitors, insights.previous.adVisitors);

  return (
    <>
      <Card>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))" }}>
          <StatTile label="Ad visitors" value={compact(ads.visitors)} caption={vsPrev.label} tone={vsPrev.direction === "up" ? "success" : vsPrev.direction === "down" ? "danger" : "neutral"} />
          <StatTile label="Tapped to contact" value={compact(ads.contactTaps)} caption={`${pct(ads.contactTaps, ads.visitors)} of ad visitors`} tone={ads.contactTaps ? "success" : "neutral"} />
          <StatTile label="Enquiries" value={compact(ads.leads)} caption={`${pct(ads.leads, ads.visitors)} of ad visitors`} tone={ads.leads ? "success" : "neutral"} />
          <StatTile label="Named contacts" value={compact(named)} caption="left name / phone / email" />
        </div>
        {ads.visitors === 0 ? (
          <div className="mt-4 rounded-control border border-dashed border-line-strong bg-raised p-4 text-ui text-muted">
            <b className="text-ink">No ad visitors in this range yet.</b> They appear here automatically once the campaign runs — every ad click
            carries a Google click id the site already records.
          </div>
        ) : (
          <div className="mt-5">
            <div className="mb-2 text-caption text-muted">Ad visitors and their enquiries, per day</div>
            <LineChart
              data={trend}
              height={120}
              unit="people"
              label="Google Ads visitors and enquiries per day"
              series={[
                { key: "adVisitors", label: "Ad visitors", color: VIZ_1 },
                { key: "adLeads", label: "Enquiries from ads", color: VIZ_2 },
              ]}
            />
          </div>
        )}
        {untagged ? (
          <p className="mt-4 rounded-control border border-line bg-raised p-3 text-ui text-muted">
            To see the <b className="text-ink">keyword</b> and campaign for each visitor, add this in Google Ads → Campaign settings → Campaign URL
            options → <b className="text-ink">Final URL suffix</b>:{" "}
            <span className="break-all font-mono text-caption text-ink">
              utm_source=google&amp;utm_medium=cpc&amp;utm_campaign={"{campaignid}"}&amp;utm_term={"{keyword}"}&amp;utm_content={"{adgroupid}"}
            </span>
          </p>
        ) : null}
      </Card>

      {ads.visitors > 0 ? (
        <>
          <div className="mt-4 grid gap-4" style={grid2}>
            <ChartCard
              title="Keywords"
              subtitle="What they searched before clicking your ad."
              chart={
                <RankedBars
                  rows={ads.keywords.map((k) => ({ label: `${isolate(k.key)}${k.leads ? ` · ${k.leads} enquir${k.leads === 1 ? "y" : "ies"}` : ""}`, value: k.visitors }))}
                  color={VIZ_1}
                  unit="visitors"
                  emptyLabel="No keywords yet."
                />
              }
              table={<ScrollTable head={["Keyword", "Visitors", "Enquiries", "Rate"]} rows={rateRows(ads.keywords)} numericFrom={1} />}
            />
            <ChartCard
              title="Campaigns & landing pages"
              subtitle="Campaigns here; the table view lists ad landing pages."
              chart={<ScrollTable head={["Campaign", "Visitors", "Enquiries", "Rate"]} rows={rateRows(ads.campaigns)} numericFrom={1} />}
              table={<ScrollTable head={["Landing page", "Visitors", "Enquiries", "Rate"]} rows={rateRows(ads.landingPages)} numericFrom={1} />}
            />
          </div>
          <Card className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <PanelHead title="People from Google Ads" subtitle="Enquiries and contact taps first. Open a name for the full CRM record." />
              <label className="flex cursor-pointer items-center gap-2 text-ui text-muted">
                <input type="checkbox" checked={onlyHot} onChange={(e) => setOnlyHot(e.target.checked)} />
                Only people who reached out
              </label>
            </div>
            <div className="mt-3 grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 420px), 1fr))" }}>
              {shown.map((p) => <AdPerson key={p.visitorId} p={p} />)}
            </div>
            {!shown.length ? <p className="py-4 text-center text-ui text-faint">Nobody in this filter yet.</p> : null}
            {people.length > 12 ? (
              <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 text-ui font-semibold text-ink underline">
                {showAll ? "Show fewer" : `Show all ${people.length}`}
              </button>
            ) : null}
          </Card>
        </>
      ) : null}
    </>
  );
}

/* -------------------------------- Visitors -------------------------------- */

/** Share-of-visitors bars, one fixed colour per source (the same as the trend lines). */
function SourceBars({ rows, total }: { rows: InsightRow[]; total: number }) {
  if (!rows.length) return <p className="py-6 text-center text-ui text-faint">No visitors recorded in this range.</p>;
  return (
    <div className="flex flex-col gap-[14px]">
      {rows.map((r) => {
        const share = total ? Math.round((r.visitors / total) * 1000) / 10 : 0;
        const color = CHANNEL_COLOR[r.key] ?? NEUTRAL;
        return (
          <div key={r.key} title={`${CHANNEL[r.key] ?? r.key} — ${r.visitors} visitors (${share}%), ${r.leads} enquiries`}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-ui">
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
                <span className="truncate text-ink">{CHANNEL[r.key] ?? r.key}</span>
              </span>
              <span className="font-mono shrink-0 text-caption" style={{ color: "var(--text2)", fontVariantNumeric: "tabular-nums" }}>
                {r.visitors.toLocaleString()} · {share}%{r.leads ? ` · ${r.leads} enq.` : ""}
              </span>
            </div>
            <div className="h-[7px] w-full rounded-full" style={{ background: "var(--viz-track)" }}>
              <div className="h-full rounded-full" style={{ width: `${Math.max(2, share)}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SourcesCard({ insights }: { insights: AnalyticsInsights }) {
  const total = insights.channels.reduce((a, c) => a + c.visitors, 0);
  return (
    <ChartCard
      title="Where visitors come from"
      subtitle="Per visitor, from their first visit, with the enquiries each source sent."
      chart={<SourceBars rows={insights.channels} total={total} />}
      table={<ScrollTable head={["Source", "Visitors", "Enquiries", "Rate"]} rows={rateRows(insights.channels, (k) => CHANNEL[k] ?? k)} numericFrom={1} />}
    />
  );
}

export function AudienceCards({ insights }: { insights: AnalyticsInsights }) {
  const countryRows: RankRow[] = insights.countries.map((c) => ({ label: countryName(c.key) || c.key, value: c.visitors }));
  const langRows: RankRow[] = insights.languages.map((c) => ({ label: c.key.toUpperCase(), value: c.visitors }));
  const nr: RankRow[] = [
    { label: "New", value: insights.returning.new },
    { label: "Returning", value: insights.returning.returning },
  ];
  return (
    <div className="grid gap-4" style={grid3}>
      <ChartCard title="Countries" subtitle="From the visitor's time zone." chart={<RankedBars rows={countryRows} color={VIZ_1} unit="visitors" emptyLabel="No country data yet." />} table={<RankTable rows={countryRows} head={["Country", "Visitors"]} />} />
      <ChartCard title="Site language" subtitle="The language they browsed in." chart={<RankedBars rows={langRows} color={VIZ_1} unit="visitors" emptyLabel="No language data yet." />} table={<RankTable rows={langRows} head={["Language", "Visitors"]} />} />
      <ChartCard
        title="New vs returning"
        subtitle="Returning = seen before this range, or more than one visit."
        chart={<RankedBars rows={nr} color={VIZ_1} unit="visitors" emptyLabel="No visitors yet." />}
        table={<RankTable rows={nr} head={["Visitors", "Count"]} />}
      />
    </div>
  );
}

export function LandingCard({ insights }: { insights: AnalyticsInsights }) {
  const rows: RankRow[] = insights.landingPages.map((r) => ({ label: `${r.key}${r.leads ? ` · ${r.leads} enq.` : ""}`, value: r.visitors, mono: true }));
  return (
    <ChartCard
      title="Best landing pages"
      subtitle="The first page of new visitors, and how many of them sent an enquiry."
      chart={<RankedBars rows={rows} color={VIZ_1} unit="visitors" emptyLabel="No new visitors in this range." />}
      table={<ScrollTable head={["Landing page", "Visitors", "Enquiries", "Rate"]} rows={rateRows(insights.landingPages)} numericFrom={1} />}
    />
  );
}

/* -------------------------------- Behaviour ------------------------------- */

export function FunnelCard({ insights }: { insights: AnalyticsInsights }) {
  const f = insights.funnel;
  const steps = [
    { label: "Visited the site", value: f.visitors },
    { label: "Looked around (2+ pages or a click)", value: f.engaged },
    { label: "Tapped WhatsApp / call / email / chat", value: f.contactTaps },
    { label: "Sent an enquiry", value: f.leads },
  ];
  return (
    <ChartCard
      title="From visit to enquiry"
      subtitle="How far visitors get, and how many continue at each step."
      chart={<FunnelChart steps={steps} />}
      table={<FunnelTable steps={steps} />}
    />
  );
}

export function TimingCard({ insights }: { insights: AnalyticsInsights }) {
  const best = busiestWindow(insights.heatmap, 2);
  return (
    <ChartCard
      title="When people visit (Cairo time)"
      subtitle={best ? `Busiest: ${describeWindow(best, 2)} — a good time to run ads and be on chat.` : "Pageviews by weekday and hour."}
      chart={<WeekHeatmap cells={insights.heatmap} />}
      table={<WeekHeatmapTable cells={insights.heatmap} />}
    />
  );
}

export function ReachOutCards({ insights }: { insights: AnalyticsInsights }) {
  const tapRows: RankRow[] = insights.contactTaps.map((t) => ({ label: `${TAP[t.kind] ?? t.kind} · ${t.visitors} people`, value: t.taps }));
  const convRows: RankRow[] = insights.conversions.map((c) => ({ label: CONVERSION[c.kind] ?? c.kind, value: c.count }));
  return (
    <div className="grid gap-4" style={grid2}>
      <ChartCard
        title="How people reach out"
        subtitle="Taps on WhatsApp, call, email and the chat button."
        chart={<RankedBars rows={tapRows} color={VIZ_2} unit="taps" emptyLabel="No contact taps recorded in this range." />}
        table={<ScrollTable head={["Channel", "Taps", "People"]} rows={insights.contactTaps.map((t) => [TAP[t.kind] ?? t.kind, String(t.taps), String(t.visitors)])} numericFrom={1} />}
      />
      <ChartCard
        title="Conversions"
        subtitle="Forms sent, calls booked, chats started, quotes accepted."
        chart={<RankedBars rows={convRows} color={VIZ_2} unit="times" emptyLabel="No conversions recorded in this range." />}
        table={<RankTable rows={convRows} head={["Conversion", "Count"]} />}
      />
    </div>
  );
}
