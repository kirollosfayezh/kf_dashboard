import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { crmSettings, type CrmSettings, type TimeWindow } from "@/services/crm";
import { Button, Callout, Card, Field, IconButton, Input, LoadingState, PageHeader, SegmentedControl, Select, Textarea, Toggle } from "@/components/ui";

export const Route = createFileRoute("/crm-settings")({ component: CrmSettingsPage });

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ZONES = ["Africa/Cairo", "Asia/Riyadh", "Asia/Dubai", "Europe/Berlin", "Europe/Paris", "Europe/London", "UTC"];

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
  const [b, setB] = useState(s.booking);
  const [blocked, setBlocked] = useState("");
  const { saving, msg, save } = useSaver(onSaved);
  const setDay = (i: number, windows: TimeWindow[]) => setB({ ...b, weekly: b.weekly.map((d, j) => (j === i ? { windows } : d)) });

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
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
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {windows.length ? (
                    windows.map((w, k) => (
                      <div key={k} className="flex items-center gap-2">
                        <Input type="time" className="w-[120px]" value={w.start} onChange={(e) => setDay(i, windows.map((x, j) => (j === k ? { ...x, start: e.target.value } : x)))} />
                        <span className="text-faint">–</span>
                        <Input type="time" className="w-[120px]" value={w.end} onChange={(e) => setDay(i, windows.map((x, j) => (j === k ? { ...x, end: e.target.value } : x)))} />
                        <IconButton label="Remove window" icon={<Trash2 size={14} />} tone="danger" onClick={() => setDay(i, windows.filter((_, j) => j !== k))} />
                        {k === windows.length - 1 ? (
                          <IconButton label="Add another window" icon={<Plus size={14} />} onClick={() => setDay(i, [...windows, { start: "19:00", end: "21:00" }])} />
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <span className="pt-2 text-caption text-faint">Closed</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
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
            <Field label="Days ahead"><Input type="number" min={1} max={90} value={b.daysAhead} onChange={(e) => setB({ ...b, daysAhead: Number(e.target.value) })} /></Field>
          </div>
        </Card>
        <Card>
          <div className="mb-2 text-ui font-semibold">Days off</div>
          <div className="mb-3 flex gap-2">
            <Input type="date" value={blocked} onChange={(e) => setBlocked(e.target.value)} />
            <Button onClick={() => { if (blocked) setB({ ...b, blockedDates: [...new Set([...b.blockedDates, blocked])].sort() }); setBlocked(""); }} disabled={!blocked}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {b.blockedDates.length ? b.blockedDates.map((d) => (
              <button key={d} type="button" onClick={() => setB({ ...b, blockedDates: b.blockedDates.filter((x) => x !== d) })} className="rounded-full border border-line px-2.5 py-1 text-caption hover:border-danger" title="Remove">
                {d} ×
              </button>
            )) : <span className="text-caption text-faint">None — holidays and travel days go here.</span>}
          </div>
        </Card>
        {msg ? <Callout tone={msg.tone}>{msg.text}</Callout> : null}
        <Button variant="primary" loading={saving} onClick={() => void save({ booking: b })}>Save booking hours</Button>
      </div>
    </div>
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
