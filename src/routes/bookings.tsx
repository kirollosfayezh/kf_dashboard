import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, ChevronLeft, ChevronRight, MessageCircle, Settings } from "lucide-react";
import { bookings as api, type Booking, type BookingStatus } from "@/services/crm";
import { dateTime, whatsappLink } from "@/lib/crm";
import { Button, Callout, Card, EmptyState, LoadingState, PageHeader, Pill, SegmentedControl, Select } from "@/components/ui";

export const Route = createFileRoute("/bookings")({ component: BookingsPage });

const STATUS: Record<BookingStatus, { label: string; tone: "neutral" | "info" | "success" | "danger" }> = {
  confirmed: { label: "Confirmed", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  no_show: { label: "No-show", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

/** Monday-first week containing `d`, at local midnight. */
function weekStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

/**
 * Calls booked from the site's /book page. Shown in this browser's time zone;
 * the opening hours themselves are set in CRM settings.
 */
function BookingsPage() {
  const [view, setView] = useState<"week" | "upcoming" | "past">("week");
  const [anchor, setAnchor] = useState(() => weekStart(new Date()));
  const [rows, setRows] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    if (view === "week") return { from: anchor.toISOString(), to: new Date(anchor.getTime() + 7 * 86400000).toISOString() };
    if (view === "upcoming") return { from: new Date().toISOString() };
    return { to: new Date().toISOString() };
  }, [view, anchor]);

  useEffect(() => {
    setRows(null);
    api.list(range).then((r) => setRows(view === "past" ? [...r].reverse() : r)).catch((e) => setError(e instanceof Error ? e.message : "Failed to load bookings"));
  }, [range, view]);

  const setStatus = async (b: Booking, status: BookingStatus) => {
    setRows((prev) => (prev ?? []).map((x) => (x.id === b.id ? { ...x, status } : x)));
    try {
      await api.update(b.id, { status });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update");
    }
  };

  const days = Array.from({ length: 7 }, (_, i) => new Date(anchor.getTime() + i * 86400000));
  const today = new Date().toDateString();

  return (
    <div className="kf-scr">
      <PageHeader
        title="Bookings"
        subtitle="Calls booked from the website. You call each person on WhatsApp at the time they picked — you'll get an alert 15 minutes before."
        actions={
          <Link to="/crm-settings">
            <Button size="sm" icon={<Settings size={14} />}>Opening hours</Button>
          </Link>
        }
      />
      {error ? <Callout tone="danger" className="mb-4">{error}</Callout> : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SegmentedControl
          aria-label="Bookings view"
          semantics="tabs"
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: "week", label: "Week" },
            { value: "upcoming", label: "Upcoming" },
            { value: "past", label: "Past" },
          ]}
        />
        {view === "week" ? (
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="ghost" aria-label="Previous week" icon={<ChevronLeft size={15} />} onClick={() => setAnchor(new Date(anchor.getTime() - 7 * 86400000))} />
            <Button size="sm" onClick={() => setAnchor(weekStart(new Date()))}>This week</Button>
            <Button size="sm" variant="ghost" aria-label="Next week" icon={<ChevronRight size={15} />} onClick={() => setAnchor(new Date(anchor.getTime() + 7 * 86400000))} />
            <span className="text-ui text-muted">
              {anchor.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – {days[6].toLocaleDateString(undefined, { day: "numeric", month: "short" })}
            </span>
          </div>
        ) : null}
      </div>

      {!rows ? (
        <LoadingState variant="skeleton" skeleton="cards" rows={4} />
      ) : view === "week" ? (
        <div className="grid gap-3 md:grid-cols-7">
          {days.map((d) => {
            const list = rows.filter((b) => new Date(b.start).toDateString() === d.toDateString());
            return (
              <div key={d.toISOString()} className={`min-h-[120px] rounded-card border bg-panel p-2 ${d.toDateString() === today ? "border-brand-edge" : "border-line"}`}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <span className="text-caption font-semibold">{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
                  <span className="text-caption text-faint">{d.getDate()}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {list.map((b) => <BookingChip key={b.id} b={b} onStatus={setStatus} />)}
                  {!list.length ? <div className="px-1 text-caption text-faint max-md:hidden">—</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : !rows.length ? (
        <EmptyState icon={<CalendarClock size={22} />} title="No bookings" body="Share the /book page or add it to your WhatsApp replies — bookings appear here instantly." />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((b) => (
            <Card key={b.id} padding="compact" className="flex flex-wrap items-center gap-3">
              <div className="w-[150px] shrink-0 text-ui font-semibold">{dateTime(b.start)}</div>
              <div className="min-w-0 flex-1">
                {b.contactId ? (
                  <Link to="/contacts/$id" params={{ id: b.contactId }} className="text-ui font-semibold hover:underline">{b.contactName ?? b.name ?? b.phone}</Link>
                ) : (
                  <span className="text-ui font-semibold">{b.name ?? b.phone}</span>
                )}
                <div className="truncate text-caption text-muted">{b.topic || "No topic given"}</div>
              </div>
              <a href={whatsappLink(b.phone)} target="_blank" rel="noreferrer" className="font-mono flex items-center gap-1.5 text-caption text-muted hover:text-ink">
                <MessageCircle size={14} /> {b.phone}
              </a>
              <Select className="w-[140px]" aria-label="Status" value={b.status} onChange={(e) => void setStatus(b, e.target.value as BookingStatus)}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function BookingChip({ b, onStatus }: { b: Booking; onStatus: (b: Booking, s: BookingStatus) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-control border border-line bg-raised p-2 text-caption ${b.status === "cancelled" ? "opacity-50" : ""}`}>
      <button type="button" className="w-full text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <div className="flex items-center justify-between gap-1">
          <b className="tabular-nums">{new Date(b.start).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</b>
          <Pill tone={STATUS[b.status].tone}>{STATUS[b.status].label}</Pill>
        </div>
        <div className="mt-1 truncate font-semibold">{b.contactName ?? b.name ?? b.phone}</div>
      </button>
      {open ? (
        <div className="mt-2 flex flex-col gap-1.5">
          {b.topic ? <div className="text-muted">{b.topic}</div> : null}
          <a href={whatsappLink(b.phone)} target="_blank" rel="noreferrer" className="font-mono flex items-center gap-1 text-brand-2">
            <MessageCircle size={12} /> {b.phone}
          </a>
          {b.contactId ? <Link to="/contacts/$id" params={{ id: b.contactId }} className="underline">Open contact</Link> : null}
          <select
            aria-label="Status"
            value={b.status}
            onChange={(e) => onStatus(b, e.target.value as BookingStatus)}
            className="rounded-xs border border-line bg-panel px-1.5 py-1"
          >
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      ) : null}
    </div>
  );
}
