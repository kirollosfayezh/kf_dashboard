import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Download, Plus, Search, Users } from "lucide-react";
import { crm, STAGES, type Contact, type Stage } from "@/services/crm";
import { STAGE_META, SOURCE_LABEL, ago, contactName, downloadCsv, flagOf, money } from "@/lib/crm";
import { Avatar, Button, Callout, DataTable, EmptyState, Field, Input, LoadingState, Modal, PageHeader, Pill, SegmentedControl, Select } from "@/components/ui";

export const Route = createFileRoute("/contacts/")({ component: ContactsPage });

/**
 * Everyone who has told us who they are — through the chat, a form, a booking
 * or an accepted quote — one row per person, however many ways they reached
 * out. Matching is by phone (E.164) or email; see `resolveContact` in the
 * backend.
 */
function ContactsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Contact[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage | "all">("all");
  const [source, setSource] = useState("");
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => setQ(query.trim()), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    crm
      .contacts({ q: q || undefined, source: source || undefined })
      .then((data) => !cancelled && setRows(data))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load contacts"));
    return () => {
      cancelled = true;
    };
  }, [q, source]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows?.length ?? 0 };
    for (const r of rows ?? []) c[r.stage] = (c[r.stage] ?? 0) + 1;
    return c;
  }, [rows]);

  const visible = (rows ?? []).filter((r) => stage === "all" || r.stage === stage);

  const exportCsv = () =>
    downloadCsv(
      `kf-contacts-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Name", "Company", "Phones", "Emails", "Country", "Stage", "Value", "Currency", "Sources", "Tags", "Last activity", "Created"],
      visible.map((c) => [
        c.name,
        c.company,
        c.phones.join(" "),
        c.emails.join(" "),
        c.country,
        c.stage,
        c.value,
        c.currency,
        c.sources.join(" "),
        c.tags.join(" "),
        c.lastActivityAt,
        c.createdAt,
      ]),
    );

  return (
    <div className="kf-scr">
      <PageHeader
        title="Contacts"
        subtitle="Everyone who reached out — chat, forms, bookings and quotes — merged into one record per person, with what they browsed before."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon={<Download size={14} />} onClick={exportCsv} disabled={!visible.length}>
              Export CSV
            </Button>
            <Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => setAdding(true)}>
              Add contact
            </Button>
          </div>
        }
      />

      {error ? <Callout tone="danger" className="mb-4">{error}</Callout> : null}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <SegmentedControl
          aria-label="Filter by stage"
          size="sm"
          scroll
          className="lg:flex-1"
          value={stage}
          onChange={setStage}
          options={[
            { value: "all", label: `All ${counts.all}` },
            ...STAGES.map((s) => ({ value: s, label: `${STAGE_META[s].label} ${counts[s] ?? 0}` })),
          ]}
        />
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1 lg:w-[260px]">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <Input className="pl-9" placeholder="Name, phone, email, tag…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select aria-label="Source" className="w-[150px]" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">All sources</option>
            {Object.entries(SOURCE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
      </div>

      {!rows ? (
        <LoadingState variant="skeleton" skeleton="table" rows={6} />
      ) : !visible.length ? (
        <EmptyState
          icon={<Users size={22} />}
          title={q || stage !== "all" || source ? "No contacts match" : "No contacts yet"}
          body={
            q || stage !== "all" || source
              ? "Try another search or filter."
              : "When someone chats with a phone number, fills a form or books a call, they appear here automatically."
          }
        />
      ) : (
        <DataTable
          columns={[
            { label: "Contact", w: "2.2fr", hideOnMobile: true },
            { label: "Phone", w: "1.5fr" },
            { label: "Email", w: "1.6fr" },
            { label: "Stage", w: "110px" },
            { label: "Value", w: "110px" },
            { label: "Source", w: "1.1fr" },
            { label: "Last activity", w: "110px" },
          ]}
          rowKey={(i) => visible[i].id}
          rows={visible.map((c) => [
            <Link key="n" to="/contacts/$id" params={{ id: c.id }} className="flex min-w-0 items-center gap-2.5">
              <Avatar name={contactName(c)} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-ui font-semibold">{contactName(c)}</span>
                {c.company ? <span className="block truncate text-caption text-faint">{c.company}</span> : null}
              </span>
            </Link>,
            <span key="p" className="font-mono truncate text-caption">
              {c.phones[0] ? `${flagOf(c.country)} ${c.phones[0]}` : "—"}
              {c.phones.length > 1 ? <span className="text-faint"> +{c.phones.length - 1}</span> : null}
            </span>,
            <span key="e" className="block truncate text-caption text-muted">{c.emails[0] ?? "—"}</span>,
            <Pill key="s" tone={STAGE_META[c.stage].tone}>{STAGE_META[c.stage].label}</Pill>,
            <span key="v" className="text-ui tabular-nums">{c.value ? money(c.value, c.currency) : "—"}</span>,
            <span key="src" className="block truncate text-caption text-muted">{c.sources.map((s) => SOURCE_LABEL[s] ?? s).join(", ")}</span>,
            <span key="a" className="text-caption text-faint" title={new Date(c.lastActivityAt).toLocaleString()}>{ago(c.lastActivityAt)}</span>,
          ])}
        />
      )}

      <AddContactDialog
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(c) => {
          setAdding(false);
          navigate({ to: "/contacts/$id", params: { id: c.id } });
        }}
      />
    </div>
  );
}

function AddContactDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (c: Contact) => void }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", company: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setForm({ name: "", phone: "", email: "", company: "" });
      setErr(null);
    }
  }, [open]);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      onCreated(await crm.createContact({ ...form, phoneCountry: "EG" }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not add the contact");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a contact"
      description="For someone who reached you another way — a call, a referral, an event. If the phone or email already exists, you'll be taken to that contact."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} disabled={!form.phone.trim() && !form.email.trim()} onClick={() => void save()}>
            Add contact
          </Button>
        </>
      }
    >
      <Field label="Name">
        <Input value={form.name} onChange={set("name")} autoFocus />
      </Field>
      <Field label="Phone" hint="With the country code (+20 …). A number without one is read as Egyptian.">
        <Input value={form.phone} onChange={set("phone")} inputMode="tel" dir="ltr" />
      </Field>
      <Field label="Email">
        <Input value={form.email} onChange={set("email")} type="email" />
      </Field>
      <Field label="Company">
        <Input value={form.company} onChange={set("company")} />
      </Field>
      {err ? <Callout tone="danger">{err}</Callout> : null}
    </Modal>
  );
}
