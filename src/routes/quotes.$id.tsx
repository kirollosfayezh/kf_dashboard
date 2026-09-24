import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Copy, ExternalLink, MessageCircle, Plus, Trash2 } from "lucide-react";
import { crm, quotes as api, quoteLink, crmSettings, type Contact, type Quote, type QuoteLine } from "@/services/crm";
import { QUOTE_STATUS, contactName, dateTime, money, whatsappLink } from "@/lib/crm";
import { Button, Callout, Card, ConfirmDialog, Field, IconButton, Input, LoadingState, Pill, Select, Textarea } from "@/components/ui";

export const Route = createFileRoute("/quotes/$id")({
  component: QuoteEditor,
  validateSearch: (s: Record<string, unknown>): { contact?: string } => ({
    contact: typeof s.contact === "string" ? s.contact : undefined,
  }),
});

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Mirrors kf_backend `shared/quote-math.ts`, for the live preview. The server's figure is the one saved. */
function totalsOf(lines: QuoteLine[], discountType: "percent" | "amount", discountValue: number, taxRate: number) {
  const each = lines.map((l) => r2((Number(l.qty) || 0) * (Number(l.unitPrice) || 0)));
  const subtotal = r2(each.reduce((a, b) => a + b, 0));
  const dv = Math.max(0, Number(discountValue) || 0);
  const discount = r2(Math.min(subtotal, discountType === "percent" ? (subtotal * Math.min(dv, 100)) / 100 : dv));
  const taxable = r2(subtotal - discount);
  const tax = r2((taxable * Math.max(0, Number(taxRate) || 0)) / 100);
  return { each, subtotal, discount, tax, total: r2(taxable + tax) };
}

interface Draft {
  title: string;
  contactId: string;
  language: string;
  currency: string;
  lineItems: QuoteLine[];
  discountType: "percent" | "amount";
  discountValue: number;
  taxRate: number;
  notes: string;
  validUntil: string;
}

const blankLine = (): QuoteLine => ({ description: "", qty: 1, unitPrice: 0 });

function QuoteEditor() {
  const { id } = Route.useParams();
  const { contact: presetContact } = Route.useSearch();
  const navigate = useNavigate();
  const isNew = id === "new";
  const [quote, setQuote] = useState<Quote | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    crm.contacts({ limit: "1000" }).then(setContacts).catch(() => {});
    if (isNew) {
      crmSettings
        .get()
        .then((s) => {
          const valid = new Date(Date.now() + (s.quotes.defaultValidDays || 14) * 86400000);
          setDraft({
            title: "",
            contactId: presetContact ?? "",
            language: "en",
            currency: s.quotes.defaultCurrency || "EGP",
            lineItems: [blankLine()],
            discountType: "percent",
            discountValue: 0,
            taxRate: s.quotes.defaultTaxRate || 0,
            notes: "",
            validUntil: valid.toISOString().slice(0, 10),
          });
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load settings"));
      return;
    }
    api
      .get(id)
      .then((q) => {
        setQuote(q);
        setDraft({
          title: q.title,
          contactId: q.contactId ?? "",
          language: q.language,
          currency: q.currency,
          lineItems: q.lineItems.length ? q.lineItems : [blankLine()],
          discountType: q.discountType,
          discountValue: q.discountValue,
          taxRate: q.taxRate,
          notes: q.notes ?? "",
          validUntil: q.validUntil ? q.validUntil.slice(0, 10) : "",
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load quote"));
  }, [id, isNew, presetContact]);

  const totals = useMemo(
    () => (draft ? totalsOf(draft.lineItems, draft.discountType, draft.discountValue, draft.taxRate) : null),
    [draft],
  );

  if (error && !draft) return <div className="kf-scr"><Callout tone="danger">{error}</Callout></div>;
  if (!draft || !totals) return <div className="kf-scr"><LoadingState variant="skeleton" skeleton="form" rows={5} /></div>;

  const locked = quote?.status === "accepted" || quote?.status === "declined";
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const setLine = (i: number, patch: Partial<QuoteLine>) =>
    set("lineItems", draft.lineItems.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const contact = contacts.find((c) => c.id === draft.contactId);

  const body = () => ({
    ...draft,
    contactId: draft.contactId || null,
    lineItems: draft.lineItems.filter((l) => l.description.trim()),
    validUntil: draft.validUntil ? new Date(`${draft.validUntil}T23:59:59`).toISOString() : null,
  });

  const save = async (): Promise<Quote | null> => {
    setSaving(true);
    setError(null);
    try {
      const saved = isNew ? await api.create(body()) : await api.update(id, body());
      setQuote(saved);
      if (isNew) navigate({ to: "/quotes/$id", params: { id: saved.id }, search: {}, replace: true });
      return saved;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the quote");
      return null;
    } finally {
      setSaving(false);
    }
  };

  /** Saves, marks it sent, and returns the saved quote for the share action. */
  const saveAndSend = async () => {
    const saved = locked ? quote : await save();
    if (!saved) return null;
    const sent = await api.markSent(saved.id).catch(() => saved);
    setQuote(sent);
    return sent;
  };

  const copyLink = async () => {
    const q = await saveAndSend();
    if (!q) return;
    await navigator.clipboard?.writeText(quoteLink(q)).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const sendWhatsApp = async () => {
    const phone = contact?.phones[0];
    // Opened before the await, so the browser treats it as a user action and does not block it.
    const win = window.open("about:blank", "_blank");
    const q = await saveAndSend();
    if (!q) {
      win?.close();
      return;
    }
    const text = `Hi ${contact?.name ?? ""}, here is your quote from KF Tech Solutions (${q.number}): ${quoteLink(q)}`;
    const url = phone ? whatsappLink(phone, text) : `https://wa.me/?text=${encodeURIComponent(text)}`;
    if (win) win.location.href = url;
    else window.location.href = url;
  };

  return (
    <div className="kf-scr">
      <Link to="/quotes" className="mb-4 inline-flex items-center gap-1.5 text-ui text-muted hover:text-ink">
        <ArrowLeft size={15} /> All quotes
      </Link>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-title">{isNew ? "New quote" : quote?.number}</h1>
        {quote ? <Pill tone={QUOTE_STATUS[quote.status].tone}>{QUOTE_STATUS[quote.status].label}</Pill> : null}
        <div className="ml-auto flex flex-wrap gap-2">
          {!locked ? (
            <Button variant="primary" loading={saving} onClick={() => void save()} icon={<Check size={14} />}>
              Save
            </Button>
          ) : null}
          <Button icon={copied ? <Check size={14} /> : <Copy size={14} />} onClick={() => void copyLink()} disabled={!draft.title.trim()}>
            {copied ? "Link copied" : "Copy client link"}
          </Button>
          <Button icon={<MessageCircle size={14} />} onClick={() => void sendWhatsApp()} disabled={!draft.title.trim()}>
            Send on WhatsApp
          </Button>
          {quote ? (
            <a href={quoteLink(quote)} target="_blank" rel="noreferrer">
              <Button icon={<ExternalLink size={14} />}>Preview</Button>
            </a>
          ) : null}
        </div>
      </div>

      {error ? <Callout tone="danger" className="mb-4">{error}</Callout> : null}
      {locked ? (
        <Callout tone={quote?.status === "accepted" ? "success" : "neutral"} className="mb-4">
          {quote?.status === "accepted"
            ? `Accepted by ${quote.acceptedBy} on ${dateTime(quote.acceptedAt)}. Answered quotes are locked — create a new one to change the terms.`
            : `Declined on ${dateTime(quote?.declinedAt)}${quote?.declineReason ? `: “${quote.declineReason}”` : ""}.`}
        </Callout>
      ) : quote?.viewedAt ? (
        <Callout tone="info" className="mb-4">The client opened this quote on {dateTime(quote.viewedAt)}.</Callout>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0">
          <fieldset disabled={locked} className="min-w-0">
            <Field label="Title" hint="What the client sees at the top, e.g. “POS system for 3 branches”.">
              <Input dir="auto" value={draft.title} onChange={(e) => set("title", e.target.value)} />
            </Field>

            <div className="label mb-2 text-faint">Line items</div>
            <div className="mb-3 flex flex-col gap-2">
              {draft.lineItems.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_70px_110px_36px] items-start gap-2 max-md:grid-cols-[1fr_1fr_36px]">
                  <Textarea
                    rows={1}
                    className="max-md:col-span-3"
                    dir="auto"
                    placeholder="Description"
                    value={l.description}
                    onChange={(e) => setLine(i, { description: e.target.value })}
                  />
                  <Input type="number" min={0} aria-label="Quantity" value={l.qty} onChange={(e) => setLine(i, { qty: Number(e.target.value) })} />
                  <Input type="number" min={0} aria-label="Unit price" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: Number(e.target.value) })} />
                  <IconButton
                    label="Remove line"
                    tone="danger"
                    icon={<Trash2 size={14} />}
                    onClick={() => set("lineItems", draft.lineItems.length > 1 ? draft.lineItems.filter((_, j) => j !== i) : [blankLine()])}
                  />
                </div>
              ))}
            </div>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => set("lineItems", [...draft.lineItems, blankLine()])}>
              Add line
            </Button>

            <div className="mt-5 grid gap-x-4 md:grid-cols-3">
              <Field label="Discount">
                <div className="flex gap-2">
                  <Input type="number" min={0} value={draft.discountValue} onChange={(e) => set("discountValue", Number(e.target.value))} />
                  <Select className="w-[84px]" aria-label="Discount type" value={draft.discountType} onChange={(e) => set("discountType", e.target.value as "percent" | "amount")}>
                    <option value="percent">%</option>
                    <option value="amount">{draft.currency}</option>
                  </Select>
                </div>
              </Field>
              <Field label="Tax %">
                <Input type="number" min={0} max={100} value={draft.taxRate} onChange={(e) => set("taxRate", Number(e.target.value))} />
              </Field>
              <Field label="Valid until">
                <Input type="date" value={draft.validUntil} onChange={(e) => set("validUntil", e.target.value)} />
              </Field>
            </div>
            <Field label="Notes for the client" hint="Payment terms, timeline, what's included. Shown under the totals.">
              <Textarea dir="auto" rows={4} value={draft.notes} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </fieldset>
        </Card>

        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <fieldset disabled={locked}>
              <Field label="Client">
                <Select value={draft.contactId} onChange={(e) => set("contactId", e.target.value)}>
                  <option value="">— No contact —</option>
                  {contacts.map((c) => <option key={c.id} value={c.id}>{contactName(c)}{c.company ? ` · ${c.company}` : ""}</option>)}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Language" hint="The client's page.">
                  <Select value={draft.language} onChange={(e) => set("language", e.target.value)}>
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                    <option value="de">Deutsch</option>
                    <option value="fr">Français</option>
                  </Select>
                </Field>
                <Field label="Currency">
                  <Select value={draft.currency} onChange={(e) => set("currency", e.target.value)}>
                    {["EGP", "USD", "EUR", "SAR", "AED", "GBP", "KWD", "QAR"].map((c) => <option key={c}>{c}</option>)}
                  </Select>
                </Field>
              </div>
            </fieldset>
          </Card>
          <Card>
            <div className="mb-3 text-ui font-semibold">Totals</div>
            <dl className="flex flex-col gap-2 text-ui">
              <TotalRow label="Subtotal" value={money(totals.subtotal, draft.currency)} />
              {totals.discount ? <TotalRow label="Discount" value={`− ${money(totals.discount, draft.currency)}`} /> : null}
              {draft.taxRate ? <TotalRow label={`Tax (${draft.taxRate}%)`} value={money(totals.tax, draft.currency)} /> : null}
              <div className="mt-1 border-t border-line pt-2">
                <TotalRow label="Total" value={money(totals.total, draft.currency)} strong />
              </div>
            </dl>
            <p className="mt-3 text-caption text-faint">Sending moves the client to Proposal; acceptance marks the deal Won with this total.</p>
          </Card>
          {quote && !locked ? (
            <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setDeleting(true)}>Delete quote</Button>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={deleting}
        title="Delete this quote?"
        body="The client's link will stop working."
        onCancel={() => setDeleting(false)}
        onConfirm={async () => {
          setDeleting(false);
          if (quote) await api.remove(quote.id);
          navigate({ to: "/quotes" });
        }}
      />
    </div>
  );
}

function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "text-body font-semibold" : ""}`}>
      <dt className={strong ? "" : "text-muted"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
