import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FileText, Plus } from "lucide-react";
import { quotes as api, type Quote, type QuoteStatus } from "@/services/crm";
import { QUOTE_STATUS, ago, money } from "@/lib/crm";
import { Button, Callout, DataTable, EmptyState, LoadingState, PageHeader, Pill, SegmentedControl, StatTile } from "@/components/ui";

export const Route = createFileRoute("/quotes/")({ component: QuotesPage });

function QuotesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Quote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<QuoteStatus | "all" | "open">("all");

  useEffect(() => {
    api.list().then(setRows).catch((e) => setError(e instanceof Error ? e.message : "Failed to load quotes"));
  }, []);

  const visible = (rows ?? []).filter((q) =>
    filter === "all" ? true : filter === "open" ? ["sent", "viewed"].includes(q.status) : q.status === filter,
  );

  const stats = useMemo(() => {
    const list = rows ?? [];
    const answered = list.filter((q) => q.status === "accepted" || q.status === "declined");
    const won = list.filter((q) => q.status === "accepted");
    const sum = (qs: Quote[]) => {
      const cur = qs[0]?.currency ?? "EGP";
      return money(qs.filter((q) => q.currency === cur).reduce((s, q) => s + q.total, 0), cur);
    };
    return {
      open: list.filter((q) => q.status === "sent" || q.status === "viewed"),
      won,
      winRate: answered.length ? Math.round((won.length / answered.length) * 100) : 0,
      sum,
    };
  }, [rows]);

  return (
    <div className="kf-scr">
      <PageHeader
        title="Quotes"
        subtitle="Priced proposals your clients open from a link, accept by typing their name, or print as a PDF."
        actions={
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => navigate({ to: "/quotes/$id", params: { id: "new" }, search: {} })}>
            New quote
          </Button>
        }
      />
      {error ? <Callout tone="danger" className="mb-4">{error}</Callout> : null}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Waiting on clients" value={String(stats.open.length)} caption={stats.open.length ? stats.sum(stats.open) : undefined} />
        <StatTile label="Accepted" value={String(stats.won.length)} caption={stats.won.length ? stats.sum(stats.won) : undefined} tone="success" />
        <StatTile label="Win rate" value={`${stats.winRate}%`} caption="of answered quotes" />
        <StatTile label="All quotes" value={String(rows?.length ?? "—")} />
      </div>

      <SegmentedControl
        aria-label="Filter quotes"
        size="sm"
        scroll
        className="mb-4"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All" },
          { value: "draft", label: "Drafts" },
          { value: "open", label: "Waiting" },
          { value: "accepted", label: "Accepted" },
          { value: "declined", label: "Declined" },
          { value: "expired", label: "Expired" },
        ]}
      />

      {!rows ? (
        <LoadingState variant="skeleton" skeleton="table" rows={5} />
      ) : !visible.length ? (
        <EmptyState
          icon={<FileText size={22} />}
          title={rows.length ? "No quotes in this view" : "No quotes yet"}
          body="Create one from here or from a contact's page. The client gets a private link to view, accept or print it."
        />
      ) : (
        <DataTable
          columns={[
            { label: "Quote", w: "2fr", hideOnMobile: true },
            { label: "Client", w: "1.3fr" },
            { label: "Total", w: "130px" },
            { label: "Status", w: "110px" },
            { label: "Updated", w: "110px" },
          ]}
          rowKey={(i) => visible[i].id}
          rows={visible.map((q) => [
            <Link key="q" to="/quotes/$id" params={{ id: q.id }} search={{}} className="block min-w-0">
              <span className="font-mono block text-caption text-faint">{q.number}</span>
              <span className="block truncate text-ui font-semibold">{q.title}</span>
            </Link>,
            q.contactId ? (
              <Link key="c" to="/contacts/$id" params={{ id: q.contactId }} className="block truncate text-ui text-muted hover:text-ink">{q.contactName ?? "Contact"}</Link>
            ) : (
              <span key="c" className="text-caption text-faint">—</span>
            ),
            <span key="t" className="text-ui tabular-nums">{money(q.total, q.currency)}</span>,
            <Pill key="s" tone={QUOTE_STATUS[q.status].tone}>{QUOTE_STATUS[q.status].label}</Pill>,
            <span key="u" className="text-caption text-faint">{ago(q.acceptedAt ?? q.viewedAt ?? q.sentAt ?? q.updatedAt)}</span>,
          ])}
        />
      )}
    </div>
  );
}
