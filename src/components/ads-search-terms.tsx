import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Copy, RefreshCw } from "lucide-react";
import { Button, Callout, Card, PanelHead, Pill, SegmentedControl, Skeleton } from "@/components/ui";
import type { AnalyticsInsights } from "@/services/analytics";
import {
  ADS_SYNC_ENDPOINT,
  ADS_URL_SUFFIX,
  MATCH_LABEL,
  adsScript,
  fetchSearchTerms,
  money,
  negativeList,
  rotateAdsKey,
  suffixState,
  type AdsSetup,
  type SearchTermRow,
  type SearchTermsReport,
} from "@/services/google-ads";
import { cn } from "@/lib/utils";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" });

/** Wraps user text (an Arabic search term) so punctuation around it keeps its place. */
const isolate = (s: string) => `⁨${s}⁩`;

/** Copies text, falling back to a prompt where the clipboard is blocked. Returns a "just copied" flag. */
function useCopy(): [string | null, (id: string, text: string) => Promise<void>] {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Copy this:", text);
    }
    setCopied(id);
    window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 2200);
  };
  return [copied, copy];
}

/* --------------------------------- Setup ---------------------------------- */

function Step({ n, title, state, tone, children }: React.PropsWithChildren<{ n: number; title: string; state: string; tone: "success" | "warning" | "neutral" }>) {
  return (
    <div className="min-w-0 rounded-control border border-line bg-raised p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 font-display text-body font-semibold">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-hover font-mono text-caption text-muted">{n}</span>
          {title}
        </div>
        <Pill tone={tone}>{state}</Pill>
      </div>
      {children}
    </div>
  );
}

/**
 * The two things Google Ads has to be told once: the Final URL suffix (so each
 * ad visitor arrives with their keyword) and the script (so the typed search
 * terms reach this dashboard). Open while either is missing, tucked away after.
 */
export function AdsSetupCard({ insights, setup, onSetup }: { insights: AnalyticsInsights; setup: AdsSetup | null; onSetup: (s: AdsSetup) => void }) {
  const [copied, copy] = useCopy();
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const suffix = suffixState(insights.ads);
  // With no ad visitors in the range there is nothing to judge the suffix by.
  const suffixKnown = insights.ads.visitors > 0;
  const synced = !!setup?.lastSyncAt;
  const complete = synced && suffixKnown && suffix === "full";
  const [open, setOpen] = useState(!complete);
  useEffect(() => setOpen(!complete), [complete]);

  const rotate = async () => {
    if (!window.confirm("Make a new key? The script already in Google Ads will stop working until you paste the new one.")) return;
    setRotating(true);
    setError(null);
    try {
      onSetup(await rotateAdsKey());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not make a new key");
    } finally {
      setRotating(false);
    }
  };

  return (
    <Card className="mt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PanelHead
          title="Google Ads setup"
          subtitle={complete ? "Both steps are working." : "Two one-time steps in Google Ads, so this page can show keywords and what people really typed."}
        />
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          icon={<ChevronDown size={15} className={cn("transition-transform", open && "rotate-180")} aria-hidden="true" />}
        >
          {open ? "Hide" : "Show steps"}
        </Button>
      </div>

      {open ? (
        <div className="mt-3 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))" }}>
          <Step
            n={1}
            title="Keyword on every ad click"
            state={!suffixKnown ? "No ad clicks to check yet" : suffix === "full" ? "Working" : suffix === "basic" ? "Update for match type" : "Not set"}
            tone={!suffixKnown ? "neutral" : suffix === "full" ? "success" : "warning"}
          >
            <p className="mt-2 text-ui leading-[1.55] text-muted">
              In Google Ads open <b className="text-ink">Admin → Account settings → Tracking → Final URL suffix</b>, paste this and save. From then on each ad
              visitor here shows their keyword, match type, campaign and ad. Clicks from before it was set stay blank.
            </p>
            <div className="mt-3 break-all rounded-control border border-line bg-panel p-3 font-mono text-caption text-ink" dir="ltr">
              {ADS_URL_SUFFIX}
            </div>
            <div className="mt-3">
              <Button variant="primary" icon={copied === "suffix" ? <Check size={15} /> : <Copy size={15} />} onClick={() => copy("suffix", ADS_URL_SUFFIX)}>
                {copied === "suffix" ? "Copied" : "Copy suffix"}
              </Button>
            </div>
          </Step>

          <Step
            n={2}
            title="What people really typed"
            state={synced ? `Last sync ${when(setup!.lastSyncAt!)}` : "Not connected"}
            tone={synced ? "success" : "warning"}
          >
            <p className="mt-2 text-ui leading-[1.55] text-muted">
              Google never tells a website the words someone typed, only its own Search terms report has them. This script sends that report here once a day.
              It only reads; it cannot change your campaigns.
            </p>
            <ol className="mt-2 list-decimal space-y-1 ps-5 text-ui leading-[1.55] text-muted">
              <li>Copy the script below.</li>
              <li>
                In Google Ads open <b className="text-ink">Tools → Bulk actions → Scripts</b>, press <b className="text-ink">+</b>, choose New script and paste it over
                what is there.
              </li>
              <li>
                Press <b className="text-ink">Save</b>, then <b className="text-ink">Authorise</b>, then <b className="text-ink">Run</b>.
              </li>
              <li>
                Back in the Scripts list set its <b className="text-ink">Frequency</b> to Daily.
              </li>
            </ol>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                disabled={!setup}
                icon={copied === "script" ? <Check size={15} /> : <Copy size={15} />}
                onClick={() => setup && copy("script", adsScript(ADS_SYNC_ENDPOINT, setup.key))}
              >
                {copied === "script" ? "Copied" : "Copy script"}
              </Button>
              <Button variant="ghost" size="sm" loading={rotating} disabled={!setup} icon={<RefreshCw size={14} />} onClick={rotate}>
                New key
              </Button>
            </div>
            {synced ? (
              <p className="mt-2 text-caption text-faint">
                {setup!.account?.name ? `${setup!.account.name} · ` : ""}
                {(setup!.lastRows ?? 0).toLocaleString()} rows in the last run.
              </p>
            ) : null}
            {error ? <Callout tone="danger" className="mt-3">{error}</Callout> : null}
          </Step>
        </div>
      ) : null}
    </Card>
  );
}

/* ------------------------------ Search terms ------------------------------ */

type Filter = "all" | "wasted" | "excluded";
type Sort = "cost" | "clicks" | "impressions" | "conversions";

const STATUS: Record<string, { label: string; tone: "success" | "danger" | "neutral" }> = {
  added: { label: "Your keyword", tone: "success" },
  excluded: { label: "Negative", tone: "danger" },
  added_excluded: { label: "Negative", tone: "danger" },
};

const rowKey = (r: SearchTermRow) => `${r.term}\u0001${r.keyword}\u0001${r.matchType ?? ""}\u0001${r.campaign}\u0001${r.adGroup}`;

/** Clicks that cost money, converted nobody, and are not excluded yet: the candidates for negatives. */
const isWasted = (r: SearchTermRow) => r.clicks > 0 && r.conversions === 0 && r.status !== "excluded" && r.status !== "added_excluded";

/**
 * What people typed before clicking an ad, from the account's Search terms
 * report: the table negative keywords are chosen from. Tick the terms that
 * should not have triggered an ad and copy them in Google Ads' own format.
 */
export function SearchTermsCard({ days, reload = 0 }: { days: number; reload?: number }) {
  const [report, setReport] = useState<SearchTermsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("cost");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [match, setMatch] = useState<"exact" | "phrase">("exact");
  const [copied, copy] = useCopy();

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetchSearchTerms(days)
      .then((r) => !cancelled && setReport(r))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load search terms"));
    return () => {
      cancelled = true;
    };
  }, [days, reload]);

  const rows = useMemo(() => {
    const all = report?.rows ?? [];
    const kept = filter === "wasted" ? all.filter(isWasted) : filter === "excluded" ? all.filter((r) => r.status === "excluded" || r.status === "added_excluded") : all;
    return [...kept].sort((a, b) => b[sort] - a[sort] || b.cost - a.cost || b.clicks - a.clicks);
  }, [report, filter, sort]);

  if (error) return <Callout tone="danger" className="mt-4">{error}</Callout>;
  if (!report) {
    return (
      <Card className="mt-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-2 h-3 w-64 max-w-full" />
        <div className="mt-5 h-[180px] animate-pulse rounded-control bg-hover" />
      </Card>
    );
  }

  const currency = report.account?.currency;
  const wasted = report.rows.filter(isWasted);
  const wastedCost = wasted.reduce((s, r) => s + r.cost, 0);
  const visible = new Set(rows.map(rowKey));
  const selected = rows.filter((r) => picked.has(rowKey(r)));
  const allPicked = rows.length > 0 && selected.length === rows.length;
  const toggle = (k: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  const toggleAll = () =>
    setPicked((prev) => {
      const next = new Set(prev);
      for (const k of visible) {
        if (allPicked) next.delete(k);
        else next.add(k);
      }
      return next;
    });
  const th = "font-mono sticky top-0 z-[1] border-b border-line bg-panel px-2 py-2 text-label tracking-[.08em] text-faint";
  const sortHead = (key: Sort, label: string) => (
    <th className={cn(th, "text-right")} aria-sort={sort === key ? "descending" : undefined}>
      <button type="button" onClick={() => setSort(key)} className={cn("uppercase", sort === key ? "text-ink underline" : "hover:text-ink")}>
        {label}
      </button>
    </th>
  );

  return (
    <Card className="mt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PanelHead
          title="Search terms"
          subtitle="The exact words people typed before clicking your ad, from Google Ads' own report. Pick the ones you don't want and copy them as negative keywords."
        />
        {report.lastSyncAt ? <span className="font-mono text-caption text-faint">synced {when(report.lastSyncAt)}</span> : null}
      </div>

      {!report.synced ? (
        <div className="mt-3 rounded-control border border-dashed border-line-strong bg-raised p-4 text-ui text-muted">
          <b className="text-ink">Not connected yet.</b> Do step 2 in “Google Ads setup” above: paste the script into Google Ads and run it once. The terms
          appear here a minute later.
        </div>
      ) : !report.rows.length ? (
        <div className="mt-3 rounded-control border border-dashed border-line-strong bg-raised p-4 text-ui text-muted">
          <b className="text-ink">No search terms in this range yet.</b> Google lists a term once enough people have searched it, usually a day or two after
          the first clicks.
        </div>
      ) : (
        <>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-ui text-muted">
            <span><b className="text-ink">{report.totals.terms.toLocaleString()}</b> terms</span>
            <span><b className="text-ink">{report.totals.clicks.toLocaleString()}</b> clicks</span>
            <span><b className="text-ink">{money(report.totals.cost, currency)}</b> spent</span>
            <span><b className="text-ink">{report.totals.conversions.toLocaleString()}</b> conversions</span>
            {wasted.length ? (
              <span>
                <b className="text-danger">{money(wastedCost, currency)}</b> on {wasted.length.toLocaleString()} terms with no conversion
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl<Filter>
              aria-label="Which search terms to show"
              size="sm"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: `All (${report.rows.length})` },
                { value: "wasted", label: `Clicks, no conversion (${wasted.length})` },
                { value: "excluded", label: "Already negative" },
              ]}
            />
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl<"exact" | "phrase">
                aria-label="Negative keyword match type"
                size="sm"
                value={match}
                onChange={setMatch}
                options={[
                  { value: "exact", label: "[exact]" },
                  { value: "phrase", label: "“phrase”" },
                ]}
              />
              <Button
                variant="primary"
                size="sm"
                disabled={!selected.length}
                icon={copied === "neg" ? <Check size={14} /> : <Copy size={14} />}
                onClick={() => copy("neg", negativeList(selected.map((r) => r.term), match))}
              >
                {copied === "neg" ? "Copied" : `Copy ${selected.length || ""} as negatives`.replace("  ", " ")}
              </Button>
            </div>
          </div>
          {copied === "neg" ? (
            <p className="mt-2 text-caption text-muted">
              Paste them in Google Ads → <b className="text-ink">Campaigns → Audiences, keywords and content → Search keywords → Negative search keywords → +</b>.
            </p>
          ) : null}

          <div className="kf-tw mt-3 max-h-[440px] overflow-auto">
            <table className="w-full min-w-[720px] border-collapse text-ui">
              <thead>
                <tr>
                  <th className={cn(th, "w-8 text-left")}>
                    <input type="checkbox" checked={allPicked} onChange={toggleAll} aria-label="Select every term shown" />
                  </th>
                  <th className={cn(th, "text-left")}>SEARCH TERM</th>
                  <th className={cn(th, "text-left")}>MATCHED KEYWORD</th>
                  <th className={cn(th, "text-left")}>CAMPAIGN</th>
                  {sortHead("impressions", "Impr.")}
                  {sortHead("clicks", "Clicks")}
                  {sortHead("cost", "Cost")}
                  {sortHead("conversions", "Conv.")}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const k = rowKey(r);
                  const st = STATUS[r.status];
                  return (
                    <tr key={k} className={cn("border-b border-line", picked.has(k) && "bg-hover")}>
                      <td className="px-2 py-2 align-top">
                        <input type="checkbox" checked={picked.has(k)} onChange={() => toggle(k)} aria-label={`Select ${r.term}`} />
                      </td>
                      <td className="px-2 py-2 align-top text-ink">
                        <span className="break-words font-semibold">{isolate(r.term)}</span>
                        {st ? <Pill tone={st.tone} className="ms-2 align-middle">{st.label}</Pill> : null}
                      </td>
                      <td className="px-2 py-2 align-top text-muted">
                        {r.keyword ? isolate(r.keyword) : "—"}
                        {r.matchType ? <span className="ms-1.5 font-mono text-caption text-faint">{MATCH_LABEL[r.matchType]}</span> : null}
                      </td>
                      <td className="px-2 py-2 align-top text-muted">
                        {isolate(r.campaign)}
                        <span className="block text-caption text-faint">{isolate(r.adGroup)}</span>
                      </td>
                      <td className="px-2 py-2 text-right align-top font-mono tabular-nums text-ink">{r.impressions.toLocaleString()}</td>
                      <td className="px-2 py-2 text-right align-top font-mono tabular-nums text-ink">{r.clicks.toLocaleString()}</td>
                      <td className="px-2 py-2 text-right align-top font-mono tabular-nums text-ink">{money(r.cost, currency)}</td>
                      <td className={cn("px-2 py-2 text-right align-top font-mono tabular-nums", r.conversions ? "text-success" : "text-faint")}>
                        {r.conversions.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!rows.length ? <p className="py-6 text-center text-ui text-faint">No terms in this filter.</p> : null}
          </div>
          <p className="mt-3 text-caption text-faint">
            Conversions are the ones Google Ads counts. Google hides terms only a few people searched, so these totals can be below the campaign's.
            Performance Max campaigns do not report search terms here.
          </p>
        </>
      )}
    </Card>
  );
}
