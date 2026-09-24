import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  FileText,
  Globe,
  Mail,
  MessageCircle,
  MousePointerClick,
  Phone,
  ShieldCheck,
  StickyNote,
  Trash2,
} from "lucide-react";
import {
  bookings as bookingsApi,
  crm,
  quotes as quotesApi,
  STAGES,
  type Activity,
  type Booking,
  type ContactDetail,
  type JourneyEvent,
  type Quote,
  type Stage,
} from "@/services/crm";
import {
  CHANNEL_LABEL,
  SOURCE_LABEL,
  STAGE_META,
  ago,
  contactName,
  countryName,
  dateTime,
  flagOf,
  money,
  whatsappLink,
} from "@/lib/crm";
import { Avatar, Button, Callout, Card, ConfirmDialog, EmptyState, Field, Input, LoadingState, Pill, SegmentedControl, Select, Textarea } from "@/components/ui";

export const Route = createFileRoute("/contacts/$id")({ component: ContactPage });

type Tab = "timeline" | "journey" | "consent" | "deals";

const ACTIVITY_ICON: Record<string, React.ReactNode> = {
  lead: <Mail size={14} />,
  chat_started: <MessageCircle size={14} />,
  chat_resumed: <MessageCircle size={14} />,
  booking: <CalendarClock size={14} />,
  booking_status: <CalendarClock size={14} />,
  quote_sent: <FileText size={14} />,
  quote_viewed: <FileText size={14} />,
  quote_accepted: <Check size={14} />,
  quote_declined: <FileText size={14} />,
  note: <StickyNote size={14} />,
  stage_change: <MousePointerClick size={14} />,
  contact_created: <Globe size={14} />,
};

/** A `datetime-local` value for an ISO date, in the browser's zone. */
function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ContactPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<ContactDetail | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("timeline");
  const [erasing, setErasing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [detail, qs, bs] = await Promise.all([
        crm.contact(id),
        quotesApi.list({ contactId: id }).catch(() => []),
        bookingsApi.list({ contactId: id }).catch(() => []),
      ]);
      setData(detail);
      setQuotes(qs);
      setBookings(bs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load contact");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <div className="kf-scr">
        <Callout tone="danger" className="mb-4">{error}</Callout>
        <Link to="/contacts" className="text-ui text-muted">← All contacts</Link>
      </div>
    );
  }
  if (!data) return <div className="kf-scr"><LoadingState variant="skeleton" skeleton="form" rows={5} /></div>;

  const c = data.contact;
  const name = contactName(c);
  const phone = c.phones[0];

  return (
    <div className="kf-scr">
      <Link to="/contacts" className="mb-4 inline-flex items-center gap-1.5 text-ui text-muted hover:text-ink">
        <ArrowLeft size={15} /> All contacts
      </Link>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display truncate text-title">{name}</h1>
              <Pill tone={STAGE_META[c.stage].tone}>{STAGE_META[c.stage].label}</Pill>
              {c.value ? <span className="font-mono text-ui text-muted">{money(c.value, c.currency)}</span> : null}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted">
              {c.company ? <span>{c.company}</span> : null}
              {c.country ? <span>{flagOf(c.country)} {countryName(c.country)}</span> : null}
              <span>Since {new Date(c.createdAt).toLocaleDateString()}</span>
              <span>via {c.sources.map((s) => SOURCE_LABEL[s] ?? s).join(", ")}</span>
            </div>
            {c.tags.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.tags.map((t) => <span key={t} className="rounded-full border border-line px-2.5 py-0.5 text-caption text-muted">#{t}</span>)}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {phone ? (
              <>
                <a href={whatsappLink(phone, `Hi ${c.name ?? ""}, this is KF Tech Solutions.`)} target="_blank" rel="noreferrer">
                  <Button size="sm" icon={<MessageCircle size={14} />}>WhatsApp</Button>
                </a>
                <a href={`tel:${phone}`}><Button size="sm" icon={<Phone size={14} />}>Call</Button></a>
              </>
            ) : null}
            {c.emails[0] ? <a href={`mailto:${c.emails[0]}`}><Button size="sm" icon={<Mail size={14} />}>Email</Button></a> : null}
            <Button size="sm" variant="primary" icon={<FileText size={14} />} onClick={() => navigate({ to: "/quotes/$id", params: { id: "new" }, search: { contact: c.id } })}>
              New quote
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <SegmentedControl
            aria-label="Contact sections"
            semantics="tabs"
            size="sm"
            scroll
            className="mb-4"
            value={tab}
            onChange={setTab}
            options={[
              { value: "timeline", label: `Timeline ${data.activities.length}` },
              { value: "journey", label: `Journey ${data.journey.filter((e) => e.type === "pageview").length}` },
              { value: "consent", label: "Consent" },
              { value: "deals", label: `Quotes & calls ${quotes.length + bookings.length}` },
            ]}
          />
          {tab === "timeline" && <Timeline contactId={c.id} activities={data.activities} onAdded={load} />}
          {tab === "journey" && <Journey data={data} />}
          {tab === "consent" && <ConsentTab data={data} />}
          {tab === "deals" && <Deals quotes={quotes} bookings={bookings} leads={data.leads} threads={data.threads} />}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <DealCard data={data} onSaved={load} />
          <DetailsCard data={data} onSaved={load} />
          <Card>
            <div className="mb-1 text-ui font-semibold">Delete contact</div>
            <p className="mb-3 text-caption text-muted">
              Erases this person completely — their record, timeline, leads, chats, quotes, bookings and browsing history. Use it when someone asks you to delete their data.
            </p>
            <Button size="sm" variant="danger" icon={<Trash2 size={14} />} onClick={() => setErasing(true)}>
              Delete everything
            </Button>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={erasing}
        title={`Delete ${name}?`}
        body="This permanently removes the contact and all their data, including chats and browsing history. It cannot be undone."
        confirmLabel="Delete permanently"
        onCancel={() => setErasing(false)}
        onConfirm={async () => {
          setErasing(false);
          await crm.eraseContact(c.id);
          navigate({ to: "/contacts" });
        }}
      />
    </div>
  );
}

function Timeline({ contactId, activities, onAdded }: { contactId: string; activities: Activity[]; onAdded: () => void }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const add = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await crm.addNote(contactId, note.trim());
      setNote("");
      onAdded();
    } finally {
      setSaving(false);
    }
  };
  return (
    <Card>
      <div className="mb-5 flex flex-col gap-2">
        <Textarea rows={2} placeholder="Add a note — a call summary, what they asked for, next step…" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex justify-end">
          <Button size="sm" variant="primary" loading={saving} disabled={!note.trim()} onClick={() => void add()}>
            Add note
          </Button>
        </div>
      </div>
      <ol className="relative flex flex-col gap-4 border-l border-line pl-5">
        {activities.map((a) => (
          <li key={a.id} className="relative">
            <span className="absolute -left-[31px] top-0 grid size-[22px] place-items-center rounded-full border border-line bg-raised text-muted">
              {ACTIVITY_ICON[a.type] ?? <Globe size={13} />}
            </span>
            <div className="whitespace-pre-wrap text-ui">{a.text}</div>
            <div className="mt-0.5 text-caption text-faint">
              {dateTime(a.at)} · {a.by === "system" ? "automatic" : a.by}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Journey({ data }: { data: ContactDetail }) {
  const sessions = useMemo(() => {
    const map = new Map<string, JourneyEvent[]>();
    for (const e of data.journey) {
      const key = e.sessionId ?? `${e.visitorId}-${new Date(e.ts).toDateString()}`;
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return [...map.values()].reverse();
  }, [data.journey]);

  if (!data.visitors.length) {
    return <EmptyState icon={<Globe size={22} />} title="No browsing recorded" body="This contact reached out without a linked browser — for example, added by hand." />;
  }
  const first = [...data.visitors].sort((a, b) => a.firstSeenAt.localeCompare(b.firstSeenAt))[0];
  const touch = first.firstTouch;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat label="First visit" value={new Date(first.firstSeenAt).toLocaleDateString()} />
        <MiniStat label="Visits" value={String(data.visitors.reduce((s, v) => s + (v.sessions || 0), 0))} />
        <MiniStat label="Pages viewed" value={String(data.visitors.reduce((s, v) => s + (v.pageviews || 0), 0))} />
        <MiniStat label="Came from" value={CHANNEL_LABEL[first.channel ?? ""] ?? first.channel ?? "Direct"} />
      </div>
      {touch && (touch.utmSource || touch.utmCampaign || touch.referrer) ? (
        <Card padding="compact">
          <div className="label mb-2 text-faint">First touch</div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-caption">
            {touch.referrer ? <span>Referrer: <b>{touch.referrer.replace(/^https?:\/\//, "")}</b></span> : null}
            {touch.utmSource ? <span>Source: <b>{touch.utmSource}</b></span> : null}
            {touch.utmMedium ? <span>Medium: <b>{touch.utmMedium}</b></span> : null}
            {touch.utmCampaign ? <span>Campaign: <b>{touch.utmCampaign}</b></span> : null}
            {touch.landingPath ? <span>Landed on: <b className="font-mono">{touch.landingPath}</b></span> : null}
            {touch.gclid ? <Pill tone="info">Google Ads click</Pill> : null}
            {touch.fbclid ? <Pill tone="info">Meta ad click</Pill> : null}
          </div>
        </Card>
      ) : null}
      <Card padding="compact">
        <div className="label mb-2 text-faint">Devices</div>
        <div className="flex flex-col gap-1.5">
          {data.visitors.map((v) => (
            <div key={v.visitorId} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption">
              <span className="font-semibold capitalize">{v.device ?? "unknown"}</span>
              <span className="text-muted">{[v.browser, v.os].filter(Boolean).join(" on ")}</span>
              {v.country ? <span>{flagOf(v.country)} {v.timezone}</span> : null}
              <span className="text-faint">last seen {ago(v.lastSeenAt)}</span>
            </div>
          ))}
        </div>
      </Card>
      {sessions.map((events, i) => (
        <Card key={i} padding="compact">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-ui font-semibold">{dateTime(events[0].ts)}</span>
            <span className="text-caption text-faint capitalize">{events[0].device} · {events.filter((e) => e.type === "pageview").length} pages</span>
          </div>
          <ol className="flex flex-col gap-1">
            {events.map((e, j) => (
              <li key={j} className="flex items-center gap-2 text-caption">
                <span className="font-mono w-[44px] shrink-0 text-faint">{new Date(e.ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</span>
                {e.type === "pageview" ? (
                  <span className="font-mono truncate">{e.path}</span>
                ) : (
                  <span className="truncate text-muted">clicked <b>{e.label}</b> on {e.path}</span>
                )}
              </li>
            ))}
          </ol>
        </Card>
      ))}
      <p className="text-caption text-faint">Page-by-page history is kept for 180 days; the totals above are kept with the contact.</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card padding="compact">
      <div className="text-caption text-muted">{label}</div>
      <div className="font-display mt-1 text-section">{value}</div>
    </Card>
  );
}

function ConsentTab({ data }: { data: ContactDetail }) {
  const latest = data.visitors.find((v) => v.consent)?.consent;
  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <ShieldCheck size={20} className="text-muted" />
        <div>
          <div className="text-ui font-semibold">
            {latest ? (latest.status === "granted" ? "Accepted cookies" : "Declined cookies") : "No cookie choice recorded"}
          </div>
          <div className="text-caption text-faint">
            {latest ? `on ${dateTime(latest.at)}` : "The banner only shows when marketing tags are configured and consent is required."}
          </div>
        </div>
      </div>
      {data.consent.length ? (
        <table className="w-full text-caption">
          <thead>
            <tr className="text-left text-faint">
              <th className="py-1.5 font-medium">When</th>
              <th className="py-1.5 font-medium">Choice</th>
              <th className="py-1.5 font-medium">Where</th>
              <th className="py-1.5 font-medium">Policy</th>
            </tr>
          </thead>
          <tbody>
            {data.consent.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="py-2">{dateTime(r.at)}</td>
                <td className="py-2"><Pill tone={r.status === "granted" ? "success" : "neutral"}>{r.status === "granted" ? "Accepted" : "Declined"}</Pill></td>
                <td className="py-2">{r.source === "banner" ? "Banner" : "Cookie settings"}</td>
                <td className="font-mono py-2">{r.policyVersion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </Card>
  );
}

function Deals({ quotes, bookings, leads, threads }: { quotes: Quote[]; bookings: Booking[]; leads: ContactDetail["leads"]; threads: ContactDetail["threads"] }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="mb-3 text-ui font-semibold">Quotes</div>
        {quotes.length ? (
          <div className="flex flex-col gap-2">
            {quotes.map((q) => (
              <Link key={q.id} to="/quotes/$id" params={{ id: q.id }} search={{}} className="flex items-center justify-between gap-3 rounded-control border border-line px-3 py-2.5 hover:bg-hover">
                <span className="min-w-0">
                  <span className="font-mono text-caption text-faint">{q.number}</span>
                  <span className="block truncate text-ui font-semibold">{q.title}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-ui tabular-nums">{money(q.total, q.currency)}</span>
                  <Pill tone={q.status === "accepted" ? "success" : q.status === "declined" || q.status === "expired" ? "danger" : "neutral"}>{q.status}</Pill>
                </span>
              </Link>
            ))}
          </div>
        ) : <p className="text-caption text-faint">No quotes yet.</p>}
      </Card>
      <Card>
        <div className="mb-3 text-ui font-semibold">Booked calls</div>
        {bookings.length ? (
          <div className="flex flex-col gap-2">
            {bookings.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line px-3 py-2.5">
                <span className="text-ui font-semibold">{dateTime(b.start)}</span>
                <span className="min-w-0 flex-1 truncate text-caption text-muted">{b.topic}</span>
                <Pill tone={b.status === "completed" ? "success" : b.status === "confirmed" ? "info" : "neutral"}>{b.status.replace("_", "-")}</Pill>
              </div>
            ))}
          </div>
        ) : <p className="text-caption text-faint">No calls booked.</p>}
      </Card>
      <Card>
        <div className="mb-3 text-ui font-semibold">Form messages & chats</div>
        {leads.map((l) => (
          <div key={l.id} className="mb-3 rounded-control border border-line p-3">
            <div className="mb-1 flex flex-wrap gap-2 text-caption text-faint">
              <span>{dateTime(l.createdAt)}</span>
              <span>{SOURCE_LABEL[l.source] ?? l.source}</span>
              {l.projectType ? <span>· {l.projectType}</span> : null}
              {l.budget ? <span>· {l.budget}</span> : null}
            </div>
            <div className="whitespace-pre-wrap text-ui">{l.message}</div>
          </div>
        ))}
        {threads.map((t) => (
          <Link key={t.visitorId} to="/chat" search={{ visitor: t.visitorId }} className="mb-2 flex items-center justify-between rounded-control border border-line px-3 py-2.5 hover:bg-hover">
            <span className="flex items-center gap-2 text-ui"><MessageCircle size={15} /> Live chat</span>
            <span className="text-caption text-faint">last message {ago(t.lastMessageAt)}</span>
          </Link>
        ))}
        {!leads.length && !threads.length ? <p className="text-caption text-faint">Nothing yet.</p> : null}
      </Card>
    </div>
  );
}

function DealCard({ data, onSaved }: { data: ContactDetail; onSaved: () => void }) {
  const c = data.contact;
  const [stage, setStage] = useState<Stage>(c.stage);
  const [value, setValue] = useState(c.value?.toString() ?? "");
  const [currency, setCurrency] = useState(c.currency || "EGP");
  const [follow, setFollow] = useState(toLocalInput(c.nextFollowUpAt));
  const [tags, setTags] = useState(c.tags.join(", "));
  const [lostReason, setLostReason] = useState(c.lostReason ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setStage(c.stage);
    setValue(c.value?.toString() ?? "");
    setCurrency(c.currency || "EGP");
    setFollow(toLocalInput(c.nextFollowUpAt));
    setTags(c.tags.join(", "));
    setLostReason(c.lostReason ?? "");
  }, [c]);

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      await crm.updateContact(c.id, {
        stage,
        value: value.trim() === "" ? null : Number(value),
        currency,
        nextFollowUpAt: follow ? new Date(follow).toISOString() : null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        lostReason: stage === "lost" ? lostReason : "",
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="mb-3 text-ui font-semibold">Deal</div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {STAGES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStage(s)}
            aria-pressed={stage === s}
            className="min-w-[88px] flex-1 rounded-control border px-2 py-2 text-caption font-semibold transition-colors"
            style={{
              borderColor: stage === s ? STAGE_META[s].color : "var(--color-line)",
              background: stage === s ? `color-mix(in srgb, ${STAGE_META[s].color} 16%, transparent)` : "transparent",
              color: stage === s ? "var(--color-ink)" : "var(--color-muted)",
            }}
          >
            {STAGE_META[s].label}
          </button>
        ))}
      </div>
      {stage === "lost" ? (
        <Field label="Why was it lost?">
          <Input value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="Price, timing, chose another vendor…" />
        </Field>
      ) : null}
      <div className="grid grid-cols-[1fr_96px] gap-2">
        <Field label="Deal value">
          <Input type="number" min={0} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Currency">
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {["EGP", "USD", "EUR", "SAR", "AED", "GBP"].map((cur) => <option key={cur}>{cur}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Follow up on" hint="You'll get an alert when it's due.">
        <Input type="datetime-local" value={follow} onChange={(e) => setFollow(e.target.value)} />
      </Field>
      <Field label="Tags" hint="Comma separated, e.g. pos, retail, vip">
        <Input value={tags} onChange={(e) => setTags(e.target.value)} />
      </Field>
      {err ? <Callout tone="danger" className="mb-3">{err}</Callout> : null}
      <div className="flex items-center gap-3">
        <Button variant="primary" loading={saving} onClick={() => void save()}>Save</Button>
        {saved ? <span className="flex items-center gap-1 text-ui text-success"><Check size={15} /> Saved</span> : null}
      </div>
    </Card>
  );
}

function DetailsCard({ data, onSaved }: { data: ContactDetail; onSaved: () => void }) {
  const c = data.contact;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", phones: "", emails: "" });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const start = () => {
    setForm({ name: c.name ?? "", company: c.company ?? "", phones: c.phones.join("\n"), emails: c.emails.join("\n") });
    setErr(null);
    setEditing(true);
  };
  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      await crm.updateContact(c.id, {
        name: form.name,
        company: form.company,
        phones: form.phones.split(/\n|,/).map((s) => s.trim()).filter(Boolean),
        emails: form.emails.split(/\n|,/).map((s) => s.trim()).filter(Boolean),
      });
      setEditing(false);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-ui font-semibold">Details</span>
        {!editing ? <Button size="sm" variant="ghost" onClick={start}>Edit</Button> : null}
      </div>
      {editing ? (
        <>
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Company"><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
          <Field label="Phones" hint="One per line, with the country code."><Textarea rows={2} dir="ltr" value={form.phones} onChange={(e) => setForm({ ...form, phones: e.target.value })} /></Field>
          <Field label="Emails" hint="One per line."><Textarea rows={2} value={form.emails} onChange={(e) => setForm({ ...form, emails: e.target.value })} /></Field>
          {err ? <Callout tone="danger" className="mb-3">{err}</Callout> : null}
          <div className="flex gap-2">
            <Button variant="primary" loading={saving} onClick={() => void save()}>Save</Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </>
      ) : (
        <dl className="flex flex-col gap-2.5 text-ui">
          <Row label="Phones">{c.phones.length ? c.phones.map((p) => <div key={p} className="font-mono">{p}</div>) : "—"}</Row>
          <Row label="Emails">{c.emails.length ? c.emails.map((e) => <div key={e} className="truncate">{e}</div>) : "—"}</Row>
          <Row label="Browsers">{c.visitorIds.length}</Row>
          <Row label="Last activity">{ago(c.lastActivityAt)}</Row>
        </dl>
      )}
    </Card>
  );
}

function Row({ label, children }: React.PropsWithChildren<{ label: string }>) {
  return (
    <div className="grid grid-cols-[92px_1fr] gap-2">
      <dt className="text-caption text-faint">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
