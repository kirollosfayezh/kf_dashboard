import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Download, Info, Languages, Plus, RotateCcw, Upload } from "lucide-react";
import { api } from "@/services/http";
import {
  Button,
  Callout,
  Card,
  EmptyState,
  Field,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Pill,
  SegmentedControl,
  Textarea,
} from "@/components/ui";

export const Route = createFileRoute("/translations")({ component: TranslationsPage });

type Lang = "en" | "ar" | "de" | "fr";
const LANGS: { code: Lang; label: string; dir: "ltr" | "rtl" }[] = [
  { code: "ar", label: "Arabic", dir: "rtl" },
  { code: "de", label: "German", dir: "ltr" },
  { code: "fr", label: "French", dir: "ltr" },
  { code: "en", label: "English wording", dir: "ltr" },
];
const TRANSLATED: Exclude<Lang, "en">[] = ["ar", "de", "fr"];

/** One row of the site's shipped dictionary, from `/i18n/catalog.json`. */
interface CatalogEntry {
  key: string;
  ar: string;
  de: string;
  fr: string;
}

/** A saved override, from `/admin/translations`. Blank = use the shipped copy. */
interface Override {
  key: string;
  en?: string;
  ar?: string;
  de?: string;
  fr?: string;
  updatedAt?: string;
}

interface Row {
  key: string;
  shipped: Partial<Record<Lang, string>>;
  override?: Override;
  /** Languages with neither shipped copy nor an override — shown in English on the site. */
  missing: Exclude<Lang, "en">[];
}

type Filter = "all" | "missing" | "edited";

const SITE_URL = (import.meta.env.VITE_SITE_URL?.trim() || "").replace(/\/+$/, "");
const PAGE = 60;

const blankDraft = (): Record<Lang, string> => ({ en: "", ar: "", de: "", fr: "" });

/**
 * Every piece of interface copy on the public site — buttons, headings, the AI
 * workflow demo, form errors, the chat widget — in all four languages.
 *
 * The site ships a complete dictionary and publishes it as
 * `/i18n/catalog.json`; this screen lists it and saves corrections as
 * overrides in the backend. The site lays those over its shipped copy on the
 * next page load, so no redeploy is needed. Clearing a field (or "Reset")
 * returns that language to the shipped wording.
 *
 * Content you manage on the other screens (services, projects, articles…) has
 * its own per-language fields there and is not listed here.
 */
function TranslationsPage() {
  const [catalog, setCatalog] = useState<CatalogEntry[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Override[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<Lang, string>>(blankDraft);
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    api
      .get<Override[]>("/admin/translations")
      .then(setOverrides)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load translations"));

    if (!SITE_URL) {
      setCatalog([]);
      setCatalogError(
        "VITE_SITE_URL is not set, so the site's built-in wording can't be listed. Saved edits still show below, and you can add one by its English text.",
      );
      return;
    }
    fetch(`${SITE_URL}/i18n/catalog.json`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: { entries?: CatalogEntry[] }) => setCatalog(Array.isArray(data.entries) ? data.entries : []))
      .catch(() => {
        setCatalog([]);
        setCatalogError(
          `Couldn't load the site's built-in wording from ${SITE_URL}/i18n/catalog.json. Redeploy the site once so it publishes that file. Saved edits still show below.`,
        );
      });
  }, []);

  const rows = useMemo<Row[]>(() => {
    if (!catalog || !overrides) return [];
    const byKey = new Map<string, Row>();
    for (const c of catalog) {
      byKey.set(c.key, { key: c.key, shipped: { en: c.key, ar: c.ar, de: c.de, fr: c.fr }, missing: [] });
    }
    for (const o of overrides) {
      const row = byKey.get(o.key) ?? { key: o.key, shipped: { en: o.key }, missing: [] };
      row.override = o;
      byKey.set(o.key, row);
    }
    for (const row of byKey.values()) {
      row.missing = TRANSLATED.filter((l) => !row.shipped[l]?.trim() && !row.override?.[l]?.trim());
    }
    return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [catalog, overrides]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      missing: rows.filter((r) => r.missing.length).length,
      edited: rows.filter((r) => r.override).length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "missing" && !r.missing.length) return false;
      if (filter === "edited" && !r.override) return false;
      if (!q) return true;
      const texts = [r.key, ...Object.values(r.shipped), ...LANGS.map((l) => r.override?.[l.code] ?? "")];
      return texts.some((t) => t?.toLowerCase().includes(q));
    });
  }, [rows, filter, query]);

  const current = rows.find((r) => r.key === selected) ?? null;

  // Load the selected row into the editor. Fields hold the *override* only; the
  // shipped wording shows as the placeholder, so a blank field visibly means
  // "use the built-in copy".
  useEffect(() => {
    if (!current) return;
    setDraft({
      en: current.override?.en ?? "",
      ar: current.override?.ar ?? "",
      de: current.override?.de ?? "",
      fr: current.override?.fr ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.key]);

  const dirty =
    !!current && LANGS.some((l) => (draft[l.code] ?? "") !== (current.override?.[l.code] ?? ""));

  const replaceOverride = (key: string, next: Override | null) =>
    setOverrides((prev) => {
      const rest = (prev ?? []).filter((o) => o.key !== key);
      return next && LANGS.some((l) => next[l.code]?.trim()) ? [...rest, next] : rest;
    });

  const save = async (key: string, values: Record<Lang, string>) => {
    setSaving(true);
    setError(null);
    try {
      const saved = await api.put<Override>("/admin/translations", { key, ...values });
      replaceOverride(key, saved);
      setSavedKey(key);
      window.setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 2400);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const reset = async (key: string) => {
    setSaving(true);
    setError(null);
    try {
      await api.delete("/admin/translations", { key });
      replaceOverride(key, null);
      setDraft(blankDraft());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset");
    } finally {
      setSaving(false);
    }
  };

  /** Every row with its effective wording, for translating offline in a spreadsheet or tool. */
  const exportJson = () => {
    const out = rows.map((r) => ({
      key: r.key,
      ar: r.override?.ar || r.shipped.ar || "",
      de: r.override?.de || r.shipped.de || "",
      fr: r.override?.fr || r.shipped.fr || "",
    }));
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kf-site-translations.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!overrides || !catalog) {
    return (
      <div className="kf-scr">
        <PageHeader title="Translations" subtitle="The site's interface wording in every language." />
        {error ? <Callout tone="danger" className="mb-4">{error}</Callout> : null}
        {!error ? <LoadingState variant="skeleton" skeleton="form" rows={4} /> : null}
      </div>
    );
  }

  return (
    <div className="kf-scr">
      <PageHeader
        title="Translations"
        subtitle="Every button, heading and message on the public site, in Arabic, German and French. Pick a line, correct it, save — the site picks it up on the next page load."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon={<Download size={14} />} onClick={exportJson} disabled={!rows.length}>
              Export
            </Button>
            <Button size="sm" icon={<Upload size={14} />} onClick={() => setImporting(true)}>
              Import
            </Button>
            <Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => setAdding(true)}>
              Add by English text
            </Button>
          </div>
        }
      />

      {error ? <Callout tone="danger" className="mb-4">{error}</Callout> : null}
      {catalogError ? (
        <Callout tone="warning" icon={<Info size={14} />} className="mb-4">
          {catalogError}
        </Callout>
      ) : null}
      {counts.missing > 0 ? (
        <Callout tone="info" icon={<Languages size={14} />} className="mb-4">
          {counts.missing} line{counts.missing === 1 ? " is" : "s are"} missing at least one language and show
          in English there. Use the <strong>Missing</strong> filter to work through them.
        </Callout>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* ── list ─────────────────────────────────────────────────────── */}
        <div className="min-w-0">
          <SegmentedControl
            aria-label="Which lines to show"
            fill
            size="sm"
            className="mb-3"
            value={filter}
            onChange={(f) => {
              setFilter(f);
              setLimit(PAGE);
            }}
            options={[
              { value: "all", label: `All ${counts.all}` },
              { value: "missing", label: `Missing ${counts.missing}` },
              { value: "edited", label: `Edited ${counts.edited}` },
            ]}
          />
          <Input
            className="mb-3"
            placeholder="Search in any language…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
          />

          <div className="kf-scrollbar flex max-h-[620px] flex-col gap-1 overflow-y-auto">
            {visible.slice(0, limit).map((r) => {
              const isOn = current?.key === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setSelected(r.key)}
                  className={`rounded-control border px-3 py-2.5 text-left transition-colors ${
                    isOn ? "border-brand-edge bg-brand-tint" : "border-transparent hover:bg-hover"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="line-clamp-2 min-w-0 flex-1 text-ui font-semibold">{r.key}</span>
                    {r.override ? <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success" title="Edited" /> : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {r.missing.length ? (
                      r.missing.map((l) => (
                        <Pill key={l} tone="warning">
                          no {l.toUpperCase()}
                        </Pill>
                      ))
                    ) : (
                      <span dir="rtl" className="line-clamp-1 text-caption text-faint">
                        {r.override?.ar || r.shipped.ar}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            {visible.length > limit ? (
              <Button size="sm" className="mt-2" onClick={() => setLimit((n) => n + PAGE)}>
                Show more ({visible.length - limit} left)
              </Button>
            ) : null}
            {!visible.length ? (
              <p className="px-3 py-6 text-center text-caption text-faint">Nothing matches that filter.</p>
            ) : null}
          </div>
        </div>

        {/* ── editor ───────────────────────────────────────────────────── */}
        <Card className="min-w-0 self-start lg:sticky lg:top-4">
          {!current ? (
            <EmptyState
              icon={<Languages size={22} />}
              title="Pick a line to edit"
              body="Each line is keyed by its English text. Leave a language blank to keep the site's built-in wording."
            />
          ) : (
            <>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="label mb-1 text-faint">English (key)</div>
                  <h2 className="font-display text-section break-words">{current.key}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-caption text-faint">
                    {current.override?.updatedAt
                      ? `edited ${new Date(current.override.updatedAt).toLocaleDateString()}`
                      : "built-in wording"}
                  </span>
                  {current.override ? (
                    <Button
                      size="sm"
                      icon={<RotateCcw size={13} />}
                      onClick={() => void reset(current.key)}
                      disabled={saving}
                      title="Remove every edit on this line so the site uses its built-in wording"
                    >
                      Reset
                    </Button>
                  ) : null}
                </div>
              </div>

              {LANGS.map((l) => {
                const shipped = current.shipped[l.code] ?? "";
                const long = (shipped || current.key).length > 70;
                const Control = long ? Textarea : Input;
                return (
                  <Field
                    key={l.code}
                    label={l.label}
                    hint={
                      l.code === "en"
                        ? "Optional. Rewords the English site without changing the key."
                        : shipped
                          ? undefined
                          : "Not translated yet — the site shows English here."
                    }
                  >
                    <Control
                      dir={l.dir}
                      lang={l.code}
                      rows={long ? 3 : undefined}
                      value={draft[l.code]}
                      placeholder={shipped || (l.code === "en" ? current.key : "Type the translation")}
                      onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                        setDraft((d) => ({ ...d, [l.code]: e.target.value }))
                      }
                    />
                  </Field>
                );
              })}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  onClick={() => void save(current.key, draft)}
                  loading={saving}
                  disabled={!dirty}
                >
                  Save
                </Button>
                {savedKey === current.key ? (
                  <span className="flex items-center gap-1.5 text-ui text-success">
                    <Check size={15} /> Saved — live on the next page load
                  </span>
                ) : dirty ? (
                  <span className="text-caption text-faint">Unsaved changes</span>
                ) : null}
              </div>
            </>
          )}
        </Card>
      </div>

      <AddDialog
        open={adding}
        onClose={() => setAdding(false)}
        onAdd={(key) => {
          setAdding(false);
          if (!rows.some((r) => r.key === key)) {
            setOverrides((prev) => [...(prev ?? []), { key }]);
          }
          setFilter("all");
          setQuery(key);
          setSelected(key);
        }}
      />

      <ImportDialog
        open={importing}
        onClose={() => setImporting(false)}
        onDone={(fresh) => {
          setImporting(false);
          setOverrides(fresh);
        }}
      />
    </div>
  );
}

/**
 * For wording the catalog does not list — text inside content the site
 * translates by lookup, such as a project's tech list or a solution's tag.
 */
function AddDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (key: string) => void }) {
  const [key, setKey] = useState("");
  useEffect(() => {
    if (open) setKey("");
  }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a line by its English text"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!key.trim()} onClick={() => onAdd(key.trim())}>
            Continue
          </Button>
        </>
      }
    >
      <Field
        label="English text"
        hint="Exactly as it appears on the English site, including punctuation. Then fill in each language and save."
      >
        <Input autoFocus value={key} onChange={(e) => setKey(e.target.value)} />
      </Field>
    </Modal>
  );
}

/** Pastes back a file produced by Export (or any `[{ key, ar, de, fr }]` list). */
function ImportDialog({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (overrides: Override[]) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setText("");
      setErr(null);
    }
  }, [open]);

  const run = async () => {
    setErr(null);
    let rows: unknown;
    try {
      rows = JSON.parse(text);
    } catch {
      setErr("That isn't valid JSON.");
      return;
    }
    if (!Array.isArray(rows)) {
      setErr("Expected a list like [{ \"key\": \"Home\", \"ar\": \"…\" }].");
      return;
    }
    setBusy(true);
    try {
      await api.post("/admin/translations/import", { rows });
      onDone(await api.get<Override[]>("/admin/translations"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import translations"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} disabled={!text.trim()} onClick={() => void run()}>
            Import
          </Button>
        </>
      }
    >
      <p className="mb-3 text-caption text-muted">
        Paste the JSON from Export after editing it. Every row is saved as an edit; values identical to the
        built-in wording are harmless.
      </p>
      <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-caption" />
      {err ? <Callout tone="danger" className="mt-3">{err}</Callout> : null}
    </Modal>
  );
}
