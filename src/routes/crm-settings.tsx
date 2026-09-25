import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { crmSettings, type CrmSettings, type TimeWindow } from "@/services/crm";
import { Button, Callout, Card, Field, IconButton, Input, LoadingState, PageHeader, SegmentedControl, Select, Textarea, Toggle } from "@/components/ui";

export const Route = createFileRoute("/crm-settings")({ component: CrmSettingsPage });

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ZONES = ["Africa/Cairo", "Asia/Riyadh", "Asia/Dubai", "Europe/Berlin", "Europe/Paris", "Europe/London", "UTC"];

type Booking = CrmSettings["booking"];

/** "YYYY-MM-DD" from calendar parts, no time zones involved. */
const dayKey = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const todayKey = () => {
  const n = new Date();
  return dayKey(n.getFullYear(), n.getMonth(), n.getDate());
};

/** What the calendar shows for one date: where its hours come from. */
type DayStatus = "weekly" | "closed" | "custom";
function statusOf(b: Booking, key: string): DayStatus {
  if (b.blockedDates.includes(key)) return "closed";
  const o = b.dateOverrides?.[key];
  if (o) return o.windows.length ? "custom" : "closed";
  return "weekly";
}

/** A shared rows-of-windows editor, used for weekdays and for dated exceptions. */
function WindowsEditor({ windows, onChange }: { windows: TimeWindow[]; onChange: (w: TimeWindow[]) => void }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      {windows.map((w, k) => (
        <div key={k} className="flex items-center gap-2">
          <Input type="time" className="w-[120px]" value={w.start} onChange={(e) => onChange(windows.map((x, j) => (j === k ? { ...x, start: e.target.value } : x)))} />
          <span className="text-faint">–</span>
          <Input type="time" className="w-[120px]" value={w.end} onChange={(e) => onChange(windows.map((x, j) => (j === k ? { ...x, end: e.target.value } : x)))} />
          <IconButton label="Remove window" icon={<Trash2 size={14} />} tone="danger" onClick={() => onChange(windows.filter((_, j) => j !== k))} />
          {k === windows.length - 1 ? <IconButton label="Add another window" icon={<Plus size={14} />} onClick={() => onChange([...windows, { start: "19:00", end: "21:00" }])} /> : null}
        </div>
      ))}
    </div>
  );
}

function CrmSettingsPage() {
  const [tab, setTab] = useState<"booking" | "quotes">("booking");
  const [s, setS] = useState<CrmSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    crmSettings.get().then(setS).catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  return (
    <div className="kf-scr">
      <PageHeader title="CRM settings" subtitle="When people can book calls with you, and the company details printed on quotes." />
      {error ? <Callout tone="danger" className="mb-4">{error}</Callout> : null}
      <SegmentedControl
        aria-label="Settings section"
        semantics="tabs"
        size="sm"
        className="mb-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: "booking", label: "Booking hours" },
          { value: "quotes", label: "Quote details" },
        ]}
      />
      {!s ? <LoadingState variant="skeleton" skeleton="form" rows={4} /> : tab === "booking" ? <BookingHours s={s} onSaved={setS} /> : <QuoteDetails s={s} onSaved={setS} />}
    </div>
  );
}

function useSaver(onSaved: (s: CrmSettings) => void) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const save = async (body: Record<string, unknown>) => {
    setSaving(true);
    setMsg(null);
    try {
      onSaved(await crmSettings.update(body));
      setMsg({ tone: "success", text: "Saved." });
    } catch (e) {
      setMsg({ tone: "danger", text: e instanceof Error ? e.message : "Could not save" });
    } finally {
      setSaving(false);
    }
  };
  return { saving, msg, save };
}

function BookingHours({ s, onSaved }: { s: CrmSettings; onSaved: (s: CrmSettings) => void }) {
  const [b, setB] = useState<Booking>({ ...s.booking, dateOverrides: s.booking.dateOverrides ?? {} });
  const { saving, msg, save } = useSaver(onSaved);
  const setDay = (i: number, windows: TimeWindow[]) => setB({ ...b, weekly: b.weekly.map((d, j) => (j === i ? { windows } : d)) });

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-5">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-ui font-semibold">Weekly hours</div>
              <div className="text-caption text-muted">In {b.timezone.replace(/_/g, " ")}. Visitors see these converted to their own time zone.</div>
            </div>
            <Toggle checked={b.enabled} onChange={() => setB({ ...b, enabled: !b.enabled })} label="Accept bookings" />
          </div>
          <div className="flex flex-col divide-y divide-[var(--color-line)]">
            {DAYS.map((name, i) => {
              const windows = b.weekly[i]?.windows ?? [];
              return (
                <div key={name} className="flex flex-wrap items-start gap-3 py-3">
                  <label className="flex w-[130px] items-center gap-2 pt-2 text-ui">
                    <input
                      type="checkbox"
                      checked={windows.length > 0}
                      onChange={(e) => setDay(i, e.target.checked ? [{ start: "10:00", end: "18:00" }] : [])}
                      className="size-4 accent-[var(--color-brand-1)]"
                    />
                    {name}
                  </label>
                  {windows.length ? <WindowsEditor windows={windows} onChange={(w) => setDay(i, w)} /> : <span className="pt-2 text-caption text-faint">Closed</span>}
                </div>
              );
            })}
          </div>
        </Card>
        <DateExceptions b={b} onChange={setB} />
      </div>
      <div className="flex flex-col gap-5">
        <Card>
          <Field label="Time zone">
            <Select value={b.timezone} onChange={(e) => setB({ ...b, timezone: e.target.value })}>
              {[...new Set([b.timezone, ...ZONES])].map((z) => <option key={z} value={z}>{z}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Call length (min)"><Input type="number" min={10} max={240} value={b.slotMinutes} onChange={(e) => setB({ ...b, slotMinutes: Number(e.target.value) })} /></Field>
            <Field label="Gap between (min)"><Input type="number" min={0} max={120} value={b.bufferMinutes} onChange={(e) => setB({ ...b, bufferMinutes: Number(e.target.value) })} /></Field>
            <Field label="Minimum notice (h)"><Input type="number" min={0} max={336} value={b.minNoticeHours} onChange={(e) => setB({ ...b, minNoticeHours: Number(e.target.value) })} /></Field>
            <Field label="Days ahead" hint="How far into the future the site's calendar lets people book (max 90).">
              <Input type="number" min={1} max={90} value={b.daysAhead} onChange={(e) => setB({ ...b, daysAhead: Number(e.target.value) })} />
            </Field>
          </div>
        </Card>
        {msg ? <Callout tone={msg.tone}>{msg.text}</Callout> : null}
        <Button variant="primary" loading={saving} onClick={() => void save({ booking: b })}>Save booking hours</Button>
        <p className="text-caption text-muted">Saving publishes straight to the site's booking calendar.</p>
      </div>
    </div>
  );
}

/**
 * The month calendar for dated exceptions: click a day, then decide whether it
 * follows the weekly hours, is closed (a holiday, a trip), or has hours of its
 * own (a shorter Friday, an extra evening). Closed days are stored as
 * `blockedDates`, custom hours as `dateOverrides`.
 */
function DateExceptions({ b, onChange }: { b: Booking; onChange: (b: Booking) => void }) {
  const today = todayKey();
  const [view, setView] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [picked, setPicked] = useState<string | null>(null);

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1).getDay();
    const count = new Date(view.y, view.m + 1, 0).getDate();
    const out: (string | null)[] = Array.from({ length: first }, () => null);
    for (let d = 1; d <= count; d++) out.push(dayKey(view.y, view.m, d));
    while (out.length % 7) out.push(null);
    return out;
  }, [view]);

  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const exceptions = useMemo(
    () =>
      [...new Set([...b.blockedDates, ...Object.keys(b.dateOverrides ?? {})])]
        .filter((d) => d >= today)
        .sort(),
    [b.blockedDates, b.dateOverrides, today],
  );

  const setStatus = (key: string, status: DayStatus) => {
    const overrides = { ...(b.dateOverrides ?? {}) };
    delete overrides[key];
    const blocked = b.blockedDates.filter((d) => d !== key);
    if (status === "closed") blocked.push(key);
    if (status === "custom") {
      const weekday = new Date(`${key}T12:00:00`).getDay();
      const base = b.dateOverrides?.[key]?.windows.length ? b.dateOverrides[key].windows : b.weekly[weekday]?.windows ?? [];
      overrides[key] = { windows: base.length ? base : [{ start: "10:00", end: "18:00" }] };
    }
    onChange({ ...b, blockedDates: blocked.sort(), dateOverrides: overrides });
  };
  const setWindows = (key: string, windows: TimeWindow[]) => onChange({ ...b, dateOverrides: { ...(b.dateOverrides ?? {}), [key]: { windows } } });

  const pickedStatus = picked ? statusOf(b, picked) : null;
  const pickedWeekday = picked ? DAYS[new Date(`${picked}T12:00:00`).getDay()] : "";

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-ui font-semibold">Specific dates</div>
          <div className="text-caption text-muted">Click a day to close it or give it its own hours. Everything else follows the weekly hours above.</div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" aria-label="Previous month" icon={<ChevronLeft size={15} />} onClick={() => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))} />
          <span className="min-w-[150px] text-center text-ui font-semibold">{monthLabel}</span>
          <Button size="sm" variant="ghost" aria-label="Next month" icon={<ChevronRight size={15} />} onClick={() => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div className="grid grid-cols-7 gap-1 text-center text-caption text-faint">
            {DAYS.map((d) => <div key={d} className="py-1">{d.slice(0, 3)}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`Exceptions, ${monthLabel}`}>
            {cells.map((key, i) => {
              if (!key) return <div key={`blank-${i}`} aria-hidden="true" />;
              const status = statusOf(b, key);
              const weekday = new Date(`${key}T12:00:00`).getDay();
              const weeklyClosed = !(b.weekly[weekday]?.windows.length);
              const past = key < today;
              const isPicked = key === picked;
              const tone =
                status === "closed" ? "border-danger/50 bg-danger/10" : status === "custom" ? "border-brand-edge bg-brand-1/10" : weeklyClosed ? "border-line/60 text-faint" : "border-line";
              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  aria-selected={isPicked}
                  disabled={past}
                  onClick={() => setPicked(key)}
                  title={status === "closed" ? "Closed" : status === "custom" ? "Custom hours" : weeklyClosed ? "Closed (weekly)" : "Weekly hours"}
                  className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-control border text-ui transition ${tone} ${
                    isPicked ? "ring-2 ring-[var(--color-brand-1)]" : ""
                  } ${past ? "cursor-not-allowed opacity-35" : "hover:border-ink/40"} ${key === today ? "font-bold underline underline-offset-4" : ""}`}
                >
                  <span className="tabular-nums">{Number(key.slice(-2))}</span>
                  {status !== "weekly" ? <span className={`size-1.5 rounded-full ${status === "closed" ? "bg-danger" : "bg-brand-1"}`} aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-danger" /> Closed</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-brand-1" /> Custom hours</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full border border-line" /> Weekly hours</span>
          </div>
        </div>

        <div className="rounded-card border border-line bg-raised p-3">
          {!picked ? (
            <div className="text-caption text-muted">
              <div className="mb-2 text-ui font-semibold text-ink">Pick a day</div>
              {exceptions.length ? (
                <>
                  <div className="mb-1">Upcoming exceptions:</div>
                  <ul className="flex flex-col gap-1">
                    {exceptions.slice(0, 8).map((d) => (
                      <li key={d}>
                        <button type="button" className="underline-offset-2 hover:underline" onClick={() => { setPicked(d); setView({ y: Number(d.slice(0, 4)), m: Number(d.slice(5, 7)) - 1 }); }}>
                          {d}
                        </button>{" "}
                        — {statusOf(b, d) === "closed" ? "closed" : "custom hours"}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                "No exceptions yet — holidays, travel days and one-off hours go here."
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <div className="text-ui font-semibold">{new Date(`${picked}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</div>
                <div className="text-caption text-muted">Normally: {b.weekly[new Date(`${picked}T12:00:00`).getDay()]?.windows.map((w) => `${w.start}–${w.end}`).join(", ") || `closed on ${pickedWeekday}s`}</div>
              </div>
              <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Hours for this date">
                {(
                  [
                    ["weekly", "Weekly hours", "As every " + pickedWeekday],
                    ["closed", "Closed", "Day off — no times offered"],
                    ["custom", "Custom hours", "Its own opening windows"],
                  ] as const
                ).map(([value, label, hint]) => (
                  <label key={value} className={`flex cursor-pointer items-start gap-2 rounded-control border px-2.5 py-2 ${pickedStatus === value ? "border-brand-edge bg-brand-1/10" : "border-line"}`}>
                    <input type="radio" name="date-status" className="mt-0.5 accent-[var(--color-brand-1)]" checked={pickedStatus === value} onChange={() => setStatus(picked, value)} />
                    <span>
                      <span className="block text-ui font-semibold">{label}</span>
                      <span className="block text-caption text-muted">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
              {pickedStatus === "custom" ? <WindowsEditor windows={b.dateOverrides?.[picked]?.windows ?? []} onChange={(w) => setWindows(picked, w)} /> : null}
              <Button size="sm" variant="ghost" onClick={() => setPicked(null)}>Done</Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function QuoteDetails({ s, onSaved }: { s: CrmSettings; onSaved: (s: CrmSettings) => void }) {
  const [q, setQ] = useState(s.quotes);
  const { saving, msg, save } = useSaver(onSaved);
  const set = (k: keyof CrmSettings["quotes"]) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setQ({ ...q, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value });
  return (
    <Card className="max-w-[760px]">
      <div className="grid gap-x-4 md:grid-cols-2">
        <Field label="Company name"><Input value={q.companyName} onChange={set("companyName")} /></Field>
        <Field label="Tax / registration ID"><Input value={q.taxId ?? ""} onChange={set("taxId")} /></Field>
        <Field label="Email"><Input value={q.email ?? ""} onChange={set("email")} /></Field>
        <Field label="Phone"><Input value={q.phone ?? ""} onChange={set("phone")} dir="ltr" /></Field>
      </div>
      <Field label="Address"><Textarea rows={2} value={q.address ?? ""} onChange={set("address")} /></Field>
      <Field label="Footer" hint="Printed at the bottom of every quote — bank details, payment terms, thank-you line."><Textarea rows={3} value={q.footer ?? ""} onChange={set("footer")} /></Field>
      <div className="grid gap-x-4 md:grid-cols-3">
        <Field label="Default currency">
          <Select value={q.defaultCurrency} onChange={set("defaultCurrency")}>
            {["EGP", "USD", "EUR", "SAR", "AED", "GBP", "KWD", "QAR"].map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Default tax %"><Input type="number" min={0} max={100} value={q.defaultTaxRate} onChange={set("defaultTaxRate")} /></Field>
        <Field label="Valid for (days)"><Input type="number" min={1} max={365} value={q.defaultValidDays} onChange={set("defaultValidDays")} /></Field>
      </div>
      {msg ? <Callout tone={msg.tone} className="mb-3">{msg.text}</Callout> : null}
      <Button variant="primary" loading={saving} onClick={() => void save({ quotes: q })}>Save quote details</Button>
    </Card>
  );
}
