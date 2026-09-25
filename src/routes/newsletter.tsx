import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Mail, Search } from "lucide-react";
import { newsletter as api } from "@/services/newsletter";
import type { Subscriber } from "@/services/domain-types";
import { dateTime, downloadCsv } from "@/lib/crm";
import {
  Button,
  Callout,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Input,
  LoadingState,
  PageHeader,
  Pill,
  RowActions,
  StatTile,
} from "@/components/ui";

export const Route = createFileRoute("/newsletter")({ component: NewsletterPage });

const SOURCE: Record<string, { label: string; tone: "neutral" | "info" | "success" }> = {
  footer: { label: "Footer", tone: "neutral" },
  article: { label: "Article", tone: "info" },
  popup: { label: "Popup", tone: "success" },
};

/**
 * Everyone who subscribed from the site's newsletter forms. The backend only
 * stores the list — there is no sending yet — so the one job of this screen is
 * to get the addresses out into whatever tool does send.
 */
function NewsletterPage() {
  const [rows, setRows] = useState<Subscriber[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");
  const [toDelete, setToDelete] = useState<Subscriber | null>(null);

  // Debounced so a typed email does not fire a request per keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => setQ(query.trim()), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await api.list(q || undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load subscribers");
    }
  }, [q]);

  // A new search shows the skeleton; a reload after a delete keeps the table up.
  useEffect(() => {
    setRows(null);
    void load();
  }, [load]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await api.remove(toDelete.id);
      setToDelete(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete subscriber");
    }
  };

  const active = rows?.filter((s) => !s.unsubscribedAt) ?? [];

  const exportCsv = () =>
    downloadCsv(
      `kf-newsletter-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Email", "Language", "Source", "Subscribed", "Contact"],
      active.map((s) => [s.email, s.lang ?? "", s.source, s.consentAt, s.contactId ?? ""]),
    );

  return (
    <div className="kf-scr">
      <PageHeader
        title="Newsletter"
        subtitle="Everyone who subscribed from the site. Nothing is sent automatically yet — export the list to your email tool."
        actions={
          <Button size="sm" icon={<Download size={14} />} onClick={exportCsv} disabled={!active.length}>
            Export CSV
          </Button>
        }
      />
      {error ? <Callout tone="danger" className="mb-4">{error}</Callout> : null}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label={q ? "Matching" : "Subscribers"}
          value={String(rows ? active.length : "—")}
          caption={rows && rows.length > active.length ? `${rows.length - active.length} unsubscribed` : undefined}
        />
        <div className="relative col-span-2 self-center md:col-span-3">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <Input
            className="pl-9"
            placeholder="Search by email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search subscribers"
          />
        </div>
      </div>

      {!rows ? (
        <LoadingState variant="skeleton" skeleton="table" rows={6} />
      ) : !rows.length ? (
        <EmptyState
          icon={<Mail size={22} />}
          title={q ? "No subscribers match" : "No subscribers yet"}
          body={
            q
              ? "Nobody's email contains that text. Clear the search to see the whole list."
              : "The signup form sits in the site footer and at the end of every article. New addresses appear here the moment someone subscribes."
          }
        />
      ) : (
        <DataTable
          columns={[
            { label: "Email", w: "2fr" },
            { label: "Language", w: "90px" },
            { label: "Source", w: "110px" },
            { label: "Subscribed", w: "1.1fr" },
            { label: "Contact", w: "1fr" },
            { label: "", w: "60px", hideOnMobile: true },
          ]}
          rowKey={(i) => rows[i].id}
          rows={rows.map((s) => [
            <span key="e" className={`font-mono block truncate text-caption ${s.unsubscribedAt ? "text-faint line-through" : ""}`}>
              {s.email}
            </span>,
            <span key="l" className="text-caption uppercase text-muted">{s.lang ?? "—"}</span>,
            <Pill key="s" tone={SOURCE[s.source]?.tone ?? "neutral"}>{SOURCE[s.source]?.label ?? s.source}</Pill>,
            s.unsubscribedAt ? (
              <span key="d" className="text-caption text-faint">unsubscribed {dateTime(s.unsubscribedAt)}</span>
            ) : (
              <span key="d" className="text-caption">{dateTime(s.consentAt)}</span>
            ),
            s.contactId ? (
              <Link key="c" to="/contacts/$id" params={{ id: s.contactId }} className="text-caption font-semibold hover:underline">
                Open contact →
              </Link>
            ) : (
              <span key="c" className="text-caption text-faint">—</span>
            ),
            <RowActions key="a" onDelete={() => setToDelete(s)} />,
          ])}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        title={`Remove ${toDelete?.email ?? ""}?`}
        body="They are taken off the list for good. If they subscribe again from the site, a new row is created."
        confirmLabel="Remove"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
