import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Radio, Search, ShieldCheck, UserRound } from "lucide-react";
import { crm, type ConsentRecord, type JourneyEvent, type Visitor } from "@/services/crm";
import { CHANNEL_LABEL, ago, countryName, dateTime, downloadCsv, flagOf } from "@/lib/crm";
import { Callout, Card, DataTable, Drawer, EmptyState, Input, LoadingState, PageHeader, Pill, SegmentedControl, Select, StatTile } from "@/components/ui";

export const Route = createFileRoute("/visitors")({ component: VisitorsPage });

type Tab = "visitors" | "consent";

/**
 * Every browser that visited the site — anonymous until they get in touch —
 * with where they came from and what they read, plus the cookie-consent log.
 */
function VisitorsPage() {
  const [tab, setTab] = useState<Tab>("visitors");
  return (
    <div className="kf-scr">
      <PageHeader
        title="Visitors"
        subtitle="Who is on the site, where they came from and what they read. A visitor becomes a contact the moment they chat with a phone, fill a form or book a call."
      />
      <SegmentedControl
        aria-label="Visitors or consent log"
        semantics="tabs"
        size="sm"
        className="mb-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: "visitors", label: "Visitors" },
          { value: "consent", label: "Cookie consent log" },
        ]}
      />
      {tab === "visitors" ? <VisitorList /> : <ConsentLog />}
    </div>
  );
}

function VisitorList() {
  const [rows, setRows] = useState<Visitor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [who, setWho] = useState<"all" | "identified" | "anonymous" | "online">("all");
  const [consent, setConsent] = useState("");
  const [days, setDays] = useState("30");
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setQ(query.trim()), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    crm
      .visitors({
        identified: who === "identified" ? "true" : who === "anonymous" ? "false" : undefined,
        online: who === "online" ? "true" : undefined,
        consent: consent || undefined,
        days: who === "online" ? undefined : days,
        q: q || undefined,
      })
      .then((d) => !cancelled && setRows(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load visitors"));
    return () => {
      cancelled = true;
    };
  }, [who, consent, days, q]);

  const online = rows?.filter((v) => v.online).length ?? 0;
  const identified = rows?.filter((v) => v.contactId).length ?? 0;

  return (
    <>
      {error ? <Callout tone="danger" className="mb-4">{error}</Callout> : null}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Visitors in view" value={String(rows?.length ?? "—")} />
        <StatTile label="On the site now" value={String(online)} caption="active in the last 5 min" tone={online ? "success" : "neutral"} />
        <StatTile label="Identified" value={String(identified)} caption="linked to a contact" />
        <StatTile label="Accepted cookies" value={String(rows?.filter((v) => v.consent?.status === "granted").length ?? 0)} />
      </div>
      <div className="mb-4 flex flex-col gap-2 lg:flex-row">
        <SegmentedControl
          aria-label="Which visitors"
          size="sm"
          scroll
          className="lg:flex-1"
          value={who}
          onChange={setWho}
          options={[
            { value: "all", label: "All" },
            { value: "online", label: "Online now" },
            { value: "identified", label: "Identified" },
            { value: "anonymous", label: "Anonymous" },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <Input className="pl-9" placeholder="Country, campaign, referrer…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select aria-label="Consent" className="w-[150px]" value={consent} onChange={(e) => setConsent(e.target.value)}>
            <option value="">Any consent</option>
            <option value="granted">Accepted</option>
            <option value="denied">Declined</option>
            <option value="none">Not asked</option>
          </Select>
          <Select aria-label="Period" className="w-[120px]" value={days} onChange={(e) => setDays(e.target.value)} disabled={who === "online"}>
            <option value="1">Today</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="400">All</option>
          </Select>
        </div>
      </div>

      {!rows ? (
        <LoadingState variant="skeleton" skeleton="table" rows={6} />
      ) : !rows.length ? (
        <EmptyState icon={<UserRound size={22} />} title="No visitors" body="Nobody matches this filter yet. Visits appear within seconds of someone opening the site." />
      ) : (
        <DataTable
          columns={[
            { label: "Visitor", w: "1.6fr", hideOnMobile: true },
            { label: "Came from", w: "1.3fr" },
            { label: "Visits", w: "70px" },
            { label: "Pages", w: "70px" },
            { label: "Device", w: "1.2fr" },
            { label: "Cookies", w: "100px" },
            { label: "Last seen", w: "100px" },
          ]}
          rowKey={(i) => rows[i].visitorId}
          rows={rows.map((v) => [
            <button key="v" type="button" onClick={() => setOpen(v.visitorId)} className="flex min-w-0 items-center gap-2 text-left">
              {v.online ? <Radio size={14} className="shrink-0 text-success" aria-label="Online now" /> : null}
              <span className="min-w-0">
                <span className="block truncate text-ui font-semibold">
                  {v.contactName ?? `${flagOf(v.country)} ${countryName(v.country) || "Visitor"}`}
                </span>
                <span className="font-mono block truncate text-caption text-faint">{v.contactId ? "contact" : "anonymous"} · {v.visitorId.slice(0, 8)}</span>
              </span>
            </button>,
            <span key="c" className="block truncate text-caption">
              <b>{CHANNEL_LABEL[v.channel ?? ""] ?? "Direct"}</b>
              <span className="text-muted"> {v.firstTouch?.utmCampaign ?? v.firstTouch?.referrer?.replace(/^https?:\/\//, "") ?? ""}</span>
            </span>,
            <span key="s" className="tabular-nums">{v.sessions}</span>,
            <span key="p" className="tabular-nums">{v.pageviews}</span>,
            <span key="d" className="block truncate text-caption capitalize text-muted">{[v.device, v.browser, v.os].filter(Boolean).join(" · ") || "—"}</span>,
            v.consent ? (
              <Pill key="k" tone={v.consent.status === "granted" ? "success" : "neutral"}>{v.consent.status === "granted" ? "Accepted" : "Declined"}</Pill>
            ) : (
              <span key="k" className="text-caption text-faint">—</span>
            ),
            <span key="l" className="text-caption text-faint">{ago(v.lastSeenAt)}</span>,
          ])}
        />
      )}
      <VisitorDrawer visitorId={open} onClose={() => setOpen(null)} />
    </>
  );
}

function VisitorDrawer({ visitorId, onClose }: { visitorId: string | null; onClose: () => void }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof crm.visitor>> | null>(null);
  useEffect(() => {
    setData(null);
    if (visitorId) crm.visitor(visitorId).then(setData).catch(() => setData(null));
  }, [visitorId]);
  const v = data?.visitor;
  return (
    <Drawer open={!!visitorId} onClose={onClose} title={v ? (data?.contact?.name ?? (countryName(v.country) || "Visitor")) : "Visitor"} subtitle={visitorId ?? undefined}>
      {!data || !v ? (
        <LoadingState variant="skeleton" skeleton="form" rows={3} />
      ) : (
        <div className="flex flex-col gap-4">
          {data.contact ? (
            <Link to="/contacts/$id" params={{ id: data.contact.id }} className="rounded-control border border-brand-edge bg-brand-tint px-3 py-2.5 text-ui font-semibold">
              Open contact: {data.contact.name ?? data.contact.phones[0] ?? data.contact.emails[0]} →
            </Link>
          ) : (
            <Callout tone="neutral">Anonymous — they have not chatted, filled a form or booked yet.</Callout>
          )}
          <dl className="grid grid-cols-2 gap-3 text-ui">
            <Info label="First visit">{dateTime(v.firstSeenAt)}</Info>
            <Info label="Last seen">{ago(v.lastSeenAt)}</Info>
            <Info label="Visits / pages">{v.sessions} / {v.pageviews}</Info>
            <Info label="Country">{flagOf(v.country)} {countryName(v.country) || "—"}</Info>
            <Info label="Device">{[v.device, v.browser, v.os].filter(Boolean).join(" · ") || "—"}</Info>
            <Info label="Language">{v.lang?.toUpperCase() ?? "—"}</Info>
            <Info label="Came from">{CHANNEL_LABEL[v.channel ?? ""] ?? "Direct"}</Info>
            <Info label="Campaign">{v.firstTouch?.utmCampaign ?? "—"}</Info>
          </dl>
          <div>
            <div className="label mb-2 text-faint">Cookie choices</div>
            {data.consent.length ? (
              data.consent.map((r) => (
                <div key={r.id} className="text-caption">{dateTime(r.at)} — {r.status === "granted" ? "Accepted" : "Declined"} ({r.source}, policy {r.policyVersion})</div>
              ))
            ) : (
              <div className="text-caption text-faint">None recorded.</div>
            )}
          </div>
          <div>
            <div className="label mb-2 text-faint">Path through the site</div>
            <JourneyList events={data.journey} />
          </div>
        </div>
      )}
    </Drawer>
  );
}

function JourneyList({ events }: { events: JourneyEvent[] }) {
  if (!events.length) return <div className="text-caption text-faint">No page views in the last 180 days.</div>;
  return (
    <ol className="flex flex-col gap-1">
      {events.map((e, i) => (
        <li key={i} className="flex gap-2 text-caption">
          <span className="font-mono w-[92px] shrink-0 text-faint">{dateTime(e.ts)}</span>
          {e.type === "pageview" ? <span className="font-mono truncate">{e.path}</span> : <span className="truncate text-muted">clicked <b>{e.label}</b></span>}
        </li>
      ))}
    </ol>
  );
}

function Info({ label, children }: React.PropsWithChildren<{ label: string }>) {
  return (
    <div>
      <dt className="text-caption text-faint">{label}</dt>
      <dd className="truncate">{children}</dd>
    </div>
  );
}

function ConsentLog() {
  const [days, setDays] = useState("30");
  const [status, setStatus] = useState("");
  const [data, setData] = useState<{ records: ConsentRecord[]; totals: { granted: number; denied: number } } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    crm.consent({ days, status: status || undefined }).then(setData).catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [days, status]);

  const total = (data?.totals.granted ?? 0) + (data?.totals.denied ?? 0);
  const rate = total ? Math.round(((data?.totals.granted ?? 0) / total) * 100) : 0;

  return (
    <>
      {error ? <Callout tone="danger" className="mb-4">{error}</Callout> : null}
      <Callout tone="neutral" icon={<ShieldCheck size={14} />} className="mb-4">
        Each choice is stored with the time, where it was made and the version of the cookie policy shown — the record you can produce if anyone asks how consent was collected.
      </Callout>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label="Accepted" value={String(data?.totals.granted ?? "—")} tone="success" caption={`${rate}% acceptance`} />
        <StatTile label="Declined" value={String(data?.totals.denied ?? "—")} />
        <Card className="col-span-2 flex flex-col justify-center gap-2 md:col-span-1">
          <div className="flex gap-2">
            <Select aria-label="Period" value={days} onChange={(e) => setDays(e.target.value)}>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
              <option value="3650">All time</option>
            </Select>
            <Select aria-label="Choice" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Both</option>
              <option value="granted">Accepted</option>
              <option value="denied">Declined</option>
            </Select>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 text-caption text-muted hover:text-ink"
            disabled={!data?.records.length}
            onClick={() =>
              downloadCsv(
                `kf-consent-log-${new Date().toISOString().slice(0, 10)}.csv`,
                ["Time", "Choice", "Where", "Policy version", "Visitor id", "User agent"],
                (data?.records ?? []).map((r) => [r.at, r.status, r.source, r.policyVersion, r.visitorId, r.userAgent]),
              )
            }
          >
            <Download size={14} /> Export CSV
          </button>
        </Card>
      </div>
      {!data ? (
        <LoadingState variant="skeleton" skeleton="table" rows={5} />
      ) : !data.records.length ? (
        <EmptyState
          icon={<ShieldCheck size={22} />}
          title="No cookie choices yet"
          body="The banner appears only when a marketing tag is set and “Ask for cookie consent” is on in Marketing."
        />
      ) : (
        <DataTable
          columns={[
            { label: "Time", w: "1.2fr" },
            { label: "Choice", w: "110px" },
            { label: "Where", w: "130px" },
            { label: "Policy", w: "90px" },
            { label: "Visitor", w: "1fr" },
          ]}
          rowKey={(i) => data.records[i].id}
          rows={data.records.map((r) => [
            <span key="t" className="text-caption">{dateTime(r.at)}</span>,
            <Pill key="s" tone={r.status === "granted" ? "success" : "neutral"}>{r.status === "granted" ? "Accepted" : "Declined"}</Pill>,
            <span key="w" className="text-caption">{r.source === "banner" ? "Banner" : "Cookie settings"}</span>,
            <span key="p" className="font-mono text-caption">{r.policyVersion}</span>,
            <span key="v" className="font-mono truncate text-caption text-faint">{r.visitorId?.slice(0, 13) ?? "—"}</span>,
          ])}
        />
      )}
    </>
  );
}
