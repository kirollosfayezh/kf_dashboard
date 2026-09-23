import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, RotateCcw, Search } from "lucide-react";
import { api } from "@/services/http";
import {
  Card,
  ErrorBanner,
  Field,
  GradientButton,
  Input,
  PanelHead,
  SectionHead,
  Spinner,
  Textarea,
  Toggle,
} from "@/components/ui";

export const Route = createFileRoute("/seo")({
  component: SeoPage,
});

interface SeoOverride {
  key: string;
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  noindex?: boolean | null;
  updatedAt?: string;
}

/**
 * The pages the site's own `PAGES` table defines, in the order they appear in
 * the navigation. The backend rejects any other key, so this list and
 * `KEYS` in `kf_backend/src/shared/services/seo.service.ts` must stay in step.
 *
 * Only the label and path live here — never the default copy. The site owns its
 * defaults and applies them whenever a field below is left blank, so
 * duplicating the text here would create two sources of truth that drift.
 */
const PAGES: { key: string; label: string; path: string }[] = [
  { key: "home", label: "Home", path: "/" },
  { key: "services", label: "Services", path: "/services" },
  { key: "solutions", label: "Solutions", path: "/solutions" },
  { key: "projects", label: "Our work", path: "/projects" },
  { key: "about", label: "About", path: "/about" },
  { key: "blog", label: "Insights", path: "/blog" },
  { key: "contact", label: "Contact", path: "/contact" },
  { key: "campaign", label: "Campaign (landing page)", path: "/campaign" },
];

/**
 * Google truncates around these widths. They are guidance, not validation — a
 * longer title is not rejected, it is just unlikely to be shown in full, so the
 * counter warns rather than blocks.
 */
const TITLE_LIMIT = 60;
const DESC_LIMIT = 155;

function Counter({ value, limit }: { value: string; limit: number }) {
  const n = value.trim().length;
  const over = n > limit;
  return (
    <span
      className="font-mono text-caption"
      style={{ color: over ? "#FF6A9E" : "var(--text3)", fontVariantNumeric: "tabular-nums" }}
      title={over ? `Google usually truncates past about ${limit} characters` : undefined}
    >
      {n}/{limit}
    </span>
  );
}

/** A search result as Google would lay it out, from whatever is in the form. */
function SerpPreview({
  origin,
  path,
  title,
  description,
}: {
  origin: string;
  path: string;
  title: string;
  description: string;
}) {
  const shown = (s: string, limit: number) => (s.length > limit ? `${s.slice(0, limit - 1)}…` : s);
  const url = `${origin.replace(/^https?:\/\//, "")}${path === "/" ? "" : path}`;
  return (
    <div
      className="rounded-control border p-[14px] border-line bg-raised"
    >
      <div className="mb-2 flex items-center gap-1.5 text-label text-faint">
        <Search size={12} />
        <span className="font-mono tracking-[.06em]">SEARCH PREVIEW</span>
      </div>
      <div className="font-mono text-caption text-muted">
        {url}
      </div>
      <div className="mt-0.5 text-section leading-[1.3]" style={{ color: "#8AB4F8" }}>
        {shown(title, TITLE_LIMIT) || <span className="text-faint">Using the site default</span>}
      </div>
      <div className="mt-1 text-ui leading-[1.45] text-muted">
        {shown(description, DESC_LIMIT) || (
          <span className="text-faint">Using the site default</span>
        )}
      </div>
    </div>
  );
}

const BLANK: Required<Pick<SeoOverride, "title" | "description" | "keywords" | "image">> & {
  noindex: boolean | null;
} = { title: "", description: "", keywords: "", image: "", noindex: null };

function SeoPage() {
  const [rows, setRows] = useState<SeoOverride[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, typeof BLANK>>({});

  const origin = import.meta.env.VITE_SITE_URL?.trim() || "https://your-site.com";

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<SeoOverride[]>("/admin/seo");
        setRows(data);
        const next: Record<string, typeof BLANK> = {};
        for (const p of PAGES) {
          const r = data.find((x) => x.key === p.key);
          next[p.key] = {
            title: r?.title ?? "",
            description: r?.description ?? "",
            keywords: r?.keywords ?? "",
            image: r?.image ?? "",
            noindex: typeof r?.noindex === "boolean" ? r.noindex : null,
          };
        }
        setDraft(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load SEO settings");
      }
    })();
  }, []);

  const savedAtByKey = useMemo(
    () => Object.fromEntries((rows ?? []).map((r) => [r.key, r.updatedAt])),
    [rows],
  );

  const field = (key: string, name: keyof typeof BLANK, value: string | boolean | null) =>
    setDraft((d) => ({ ...d, [key]: { ...d[key], [name]: value } }));

  const save = async (key: string) => {
    setSavingKey(key);
    setError(null);
    try {
      const updated = await api.patch<SeoOverride>(`/admin/seo/${key}`, draft[key]);
      setRows((prev) => {
        const rest = (prev ?? []).filter((r) => r.key !== key);
        return [...rest, updated];
      });
      setSavedKey(key);
      window.setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 2200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingKey(null);
    }
  };

  const reset = (key: string) => setDraft((d) => ({ ...d, [key]: { ...BLANK } }));

  if (!rows) {
    return (
      <div className="kf-scr">
        <SectionHead title="SEO" subtitle="Per-page titles, descriptions and share cards." />
        {error ? <ErrorBanner message={error} /> : null}
        <div className="grid place-items-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="kf-scr">
      <SectionHead
        title="SEO"
        subtitle="What each page tells Google and the AI assistants. Leave a field blank to use the site's built-in default."
      />

      {error ? <ErrorBanner message={error} /> : null}

      <Card className="mb-4 bg-raised">
        <PanelHead
          title="How these apply"
          subtitle="Saving writes the override immediately, but the public site bakes these into its HTML at build time — redeploy the site for a change to reach search engines and social scrapers."
        />
      </Card>

      <div className="flex flex-col gap-4">
        {PAGES.map((p) => {
          const d = draft[p.key] ?? BLANK;
          const overridden =
            !!d.title || !!d.description || !!d.keywords || !!d.image || typeof d.noindex === "boolean";
          return (
            <Card key={p.key}>
              <div className="mb-[18px] flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-section font-semibold tracking-[-.01em]">
                    {p.label}
                  </h2>
                  <p className="font-mono mt-[5px] text-caption text-faint">
                    {p.path}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-caption text-faint">
                    {overridden
                      ? savedAtByKey[p.key]
                        ? `edited ${new Date(savedAtByKey[p.key] as string).toLocaleDateString()}`
                        : "unsaved changes"
                      : "using site defaults"}
                  </span>
                  {overridden ? (
                    <button
                      type="button"
                      onClick={() => reset(p.key)}
                      title="Clear every field so this page falls back to the site's built-in values"
                      className="flex items-center gap-1.5 rounded-control border px-2.5 py-1.5 text-caption border-line text-muted"
                    >
                      <RotateCcw size={13} />
                      Reset
                    </button>
                  ) : null}
                </div>
              </div>

              <div
                className="grid gap-x-5"
                style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}
              >
                <div>
                  <Field
                    label="Title"
                    hint="Shown as the clickable headline in search results and on the browser tab."
                  >
                    <Input
                      value={d.title}
                      onChange={(e) => field(p.key, "title", e.target.value)}
                      placeholder="Leave blank to use the site default"
                    />
                  </Field>
                  <div className="-mt-3 mb-4 text-right">
                    <Counter value={d.title} limit={TITLE_LIMIT} />
                  </div>

                  <Field label="Meta description" hint="The grey summary under the headline.">
                    <Textarea
                      rows={3}
                      value={d.description}
                      onChange={(e) => field(p.key, "description", e.target.value)}
                      placeholder="Leave blank to use the site default"
                    />
                  </Field>
                  <div className="-mt-3 mb-4 text-right">
                    <Counter value={d.description} limit={DESC_LIMIT} />
                  </div>

                  <Field
                    label="Keywords"
                    hint="Comma separated. Google ignores these; they stay for other engines and your own reference."
                  >
                    <Input
                      value={d.keywords}
                      onChange={(e) => field(p.key, "keywords", e.target.value)}
                      placeholder="Leave blank to use the site default"
                    />
                  </Field>

                  <Field
                    label="Share image URL"
                    hint="1200×630 works everywhere. Used when the page is shared on social or in chat."
                  >
                    <Input
                      value={d.image}
                      onChange={(e) => field(p.key, "image", e.target.value)}
                      placeholder="Leave blank to use the site default"
                    />
                  </Field>

                  <div
                    className="mb-4 flex items-center justify-between rounded-control border px-[14px] py-3 border-line"
                  >
                    <div>
                      <div className="text-ui font-semibold">Hide from search engines</div>
                      <div className="mt-0.5 text-caption text-faint">
                        {d.noindex === null
                          ? "Following the site default for this page"
                          : d.noindex
                            ? "noindex — excluded from Google and dropped from the sitemap"
                            : "Indexed normally"}
                      </div>
                    </div>
                    <Toggle
                      checked={d.noindex === true}
                      onChange={() => field(p.key, "noindex", d.noindex === true ? false : true)}
                      label={`Hide ${p.label} from search engines`}
                    />
                  </div>
                </div>

                <div>
                  <SerpPreview
                    origin={origin}
                    path={p.path}
                    title={d.title}
                    description={d.description}
                  />
                  {d.image ? (
                    <div className="mt-4">
                      <div className="mb-1.5 text-caption font-semibold text-muted">
                        Share image
                      </div>
                      <img
                        src={d.image}
                        alt=""
                        className="w-full rounded-control border"
                        style={{ borderColor: "var(--border)", aspectRatio: "1200 / 630", objectFit: "cover" }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-1 flex items-center gap-3">
                <GradientButton onClick={() => save(p.key)} disabled={savingKey === p.key}>
                  {savingKey === p.key ? "Saving…" : "Save"}
                </GradientButton>
                {savedKey === p.key ? (
                  <span className="flex items-center gap-1.5 text-ui text-success">
                    <Check size={15} />
                    Saved
                  </span>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
