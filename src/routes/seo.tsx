import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ExternalLink, FileText, Info, RotateCcw, Search } from "lucide-react";
import { api } from "@/services/http";
import type { ContentItem } from "@/services/domain-types";
import {
  Button,
  Callout,
  Card,
  Field,
  Input,
  LoadingState,
  PageHeader,
  SegmentedControl,
  Textarea,
  Toggle,
} from "@/components/ui";

export const Route = createFileRoute("/seo")({ component: SeoPage });

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
 * The eight entries the site's own `PAGES` table defines. The backend rejects
 * any other key, so this list and `KEYS` in
 * `kf_backend/src/shared/services/seo.service.ts` must stay in step.
 *
 * Only the label and path live here — never the default copy. The site owns its
 * defaults and applies them whenever a field is left blank, so duplicating the
 * text here would create two sources of truth that drift.
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
  { key: "book", label: "Book a call", path: "/book" },
];

/** Google truncates around these widths. Guidance, not validation. */
const TITLE_LIMIT = 60;
const DESC_LIMIT = 155;

type Group = "pages" | "articles" | "projects";

/** A row in the left-hand list: either an overridable page or a content item
 *  whose metadata is derived from the content itself. */
interface Entry {
  id: string;
  group: Group;
  label: string;
  path: string;
  /** Only `pages` can be overridden here; content rows link to their editor. */
  overridable: boolean;
  editRoute?: string;
  derivedTitle?: string;
  derivedDesc?: string;
}

function Counter({ value, limit }: { value: string; limit: number }) {
  const n = value.trim().length;
  return (
    <span
      className={`font-mono text-caption tabular-nums ${n > limit ? "text-danger" : "text-faint"}`}
      title={n > limit ? `Google usually truncates past about ${limit} characters` : undefined}
    >
      {n}/{limit}
    </span>
  );
}

/** A search result as Google would lay it out. */
function SerpPreview({
  origin,
  path,
  title,
  description,
  fallbackNote,
}: {
  origin: string;
  path: string;
  title: string;
  description: string;
  fallbackNote?: string;
}) {
  const shown = (s: string, limit: number) => (s.length > limit ? `${s.slice(0, limit - 1)}…` : s);
  const url = `${origin.replace(/^https?:\/\//, "")}${path === "/" ? "" : path}`;
  const placeholder = fallbackNote ?? "Using the site default";
  return (
    <div className="rounded-control border border-line bg-raised p-4">
      <div className="label mb-2 flex items-center gap-1.5 text-faint">
        <Search size={12} />
        Search preview
      </div>
      <div className="font-mono text-caption text-muted">{url}</div>
      <div className="mt-0.5 text-[16px] leading-[1.3] text-info">
        {shown(title, TITLE_LIMIT) || <span className="text-faint">{placeholder}</span>}
      </div>
      <div className="mt-1 text-caption text-muted">
        {shown(description, DESC_LIMIT) || <span className="text-faint">{placeholder}</span>}
      </div>
    </div>
  );
}

const BLANK = { title: "", description: "", keywords: "", image: "", noindex: null as boolean | null };

function SeoPage() {
  const [rows, setRows] = useState<SeoOverride[] | null>(null);
  const [articles, setArticles] = useState<ContentItem[]>([]);
  const [projects, setProjects] = useState<ContentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, typeof BLANK>>({});
  const [group, setGroup] = useState<Group>("pages");
  const [selected, setSelected] = useState<string>("home");
  const [query, setQuery] = useState("");

  const origin = import.meta.env.VITE_SITE_URL?.trim() || "https://your-site.com";

  useEffect(() => {
    (async () => {
      try {
        // Articles and case studies are listed so this screen shows every
        // indexable URL, not just the eight the override table covers.
        const [data, posts, projs] = await Promise.all([
          api.get<SeoOverride[]>("/admin/seo"),
          api.get<ContentItem[]>("/admin/content/blogPosts").catch(() => []),
          api.get<ContentItem[]>("/admin/content/projects").catch(() => []),
        ]);
        setRows(data);
        setArticles(posts);
        setProjects(projs);
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

  const entries = useMemo<Entry[]>(() => {
    const pageRows: Entry[] = PAGES.map((p) => ({
      id: p.key,
      group: "pages",
      label: p.label,
      path: p.path,
      overridable: true,
    }));
    const contentRow = (item: ContentItem, g: Group, base: string, route: string): Entry => ({
      id: `${g}:${item.id}`,
      group: g,
      label: item.title?.en || "(untitled)",
      path: `${base}/${item.slug}`,
      overridable: false,
      editRoute: route,
      derivedTitle: item.title?.en,
      derivedDesc: item.summary?.en,
    });
    return [
      ...pageRows,
      ...articles.map((a) => contentRow(a, "articles", "/blog", "/blogPosts")),
      ...projects.map((p) => contentRow(p, "projects", "/projects", "/projects")),
    ];
  }, [articles, projects]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(
      (e) => e.group === group && (!q || e.label.toLowerCase().includes(q) || e.path.includes(q)),
    );
  }, [entries, group, query]);

  const current = entries.find((e) => e.id === selected) ?? visible[0];

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
      setRows((prev) => [...(prev ?? []).filter((r) => r.key !== key), updated]);
      setSavedKey(key);
      window.setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 2400);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingKey(null);
    }
  };

  if (!rows) {
    return (
      <div className="kf-scr">
        <PageHeader title="SEO" subtitle="Per-page titles, descriptions and share cards." />
        {error ? <Callout tone="danger" className="mb-4">{error}</Callout> : null}
        {!error ? <LoadingState variant="skeleton" skeleton="form" rows={4} /> : null}
      </div>
    );
  }

  const d = current?.overridable ? (draft[current.id] ?? BLANK) : BLANK;
  const overridden =
    current?.overridable &&
    (!!d.title || !!d.description || !!d.keywords || !!d.image || typeof d.noindex === "boolean");

  const counts = {
    pages: PAGES.length,
    articles: articles.length,
    projects: projects.length,
  };

  return (
    <div className="kf-scr">
      <PageHeader
        title="SEO"
        subtitle="What each page tells Google and the AI assistants. Pick a page on the left; leave a field blank to use the site's built-in default."
      />

      {error ? <Callout tone="danger" className="mb-4">{error}</Callout> : null}

      <Callout tone="neutral" icon={<Info size={14} />} className="mb-4">
        Saving writes the override immediately, but the public site bakes these into its HTML at build
        time — redeploy the site for a change to reach search engines and social scrapers.
      </Callout>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        {/* ── list ─────────────────────────────────────────────────────── */}
        <div className="min-w-0">
          <SegmentedControl
            aria-label="Which pages to show"
            semantics="tabs"
            fill
            size="sm"
            className="mb-3"
            value={group}
            onChange={(g) => {
              setGroup(g);
              const first = entries.find((e) => e.group === g);
              if (first) setSelected(first.id);
            }}
            options={[
              { value: "pages", label: `Pages ${counts.pages}` },
              { value: "articles", label: `Articles ${counts.articles}` },
              { value: "projects", label: `Case studies ${counts.projects}` },
            ]}
          />

          <Input
            className="mb-3"
            placeholder="Filter by name or path…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="kf-scrollbar flex max-h-[520px] flex-col gap-1 overflow-y-auto">
            {visible.map((e) => {
              const isOn = current?.id === e.id;
              const edited = e.overridable && !!savedAtByKey[e.id];
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelected(e.id)}
                  className={`rounded-control border px-3 py-2.5 text-left transition-colors ${
                    isOn ? "border-brand-edge bg-brand-tint" : "border-transparent hover:bg-hover"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-ui font-semibold">{e.label}</span>
                    {edited ? <span className="size-1.5 shrink-0 rounded-full bg-success" /> : null}
                  </div>
                  <div className="font-mono mt-0.5 truncate text-caption text-faint">{e.path}</div>
                </button>
              );
            })}
            {!visible.length ? (
              <p className="px-3 py-6 text-center text-caption text-faint">Nothing matches that filter.</p>
            ) : null}
          </div>
        </div>

        {/* ── editor ───────────────────────────────────────────────────── */}
        <Card className="min-w-0">
          {!current ? (
            <p className="text-caption text-faint">Select a page.</p>
          ) : current.overridable ? (
            <>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-section">{current.label}</h2>
                  <p className="font-mono mt-1 text-caption text-faint">{current.path}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-caption text-faint">
                    {overridden
                      ? savedAtByKey[current.id]
                        ? `edited ${new Date(savedAtByKey[current.id] as string).toLocaleDateString()}`
                        : "unsaved changes"
                      : "using site defaults"}
                  </span>
                  {overridden ? (
                    <Button
                      size="sm"
                      icon={<RotateCcw size={13} />}
                      onClick={() => setDraft((x) => ({ ...x, [current.id]: { ...BLANK } }))}
                      title="Clear every field so this page falls back to the site's built-in values"
                    >
                      Reset
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-x-5 lg:grid-cols-2">
                <div className="min-w-0">
                  <Field label="Title" hint="The clickable headline in search results and on the browser tab.">
                    <Input
                      value={d.title}
                      onChange={(e) => field(current.id, "title", e.target.value)}
                      placeholder="Leave blank to use the site default"
                    />
                    <div className="mt-1.5 text-right">
                      <Counter value={d.title} limit={TITLE_LIMIT} />
                    </div>
                  </Field>

                  <Field label="Meta description" hint="The grey summary under the headline.">
                    <Textarea
                      rows={3}
                      value={d.description}
                      onChange={(e) => field(current.id, "description", e.target.value)}
                      placeholder="Leave blank to use the site default"
                    />
                    <div className="mt-1.5 text-right">
                      <Counter value={d.description} limit={DESC_LIMIT} />
                    </div>
                  </Field>

                  <Field
                    label="Keywords"
                    hint="Comma separated. Google ignores these; they stay for other engines and your own reference."
                  >
                    <Input
                      value={d.keywords}
                      onChange={(e) => field(current.id, "keywords", e.target.value)}
                      placeholder="Leave blank to use the site default"
                    />
                  </Field>

                  <Field label="Share image URL" hint="1200×630 works everywhere, for social and chat previews.">
                    <Input
                      value={d.image}
                      onChange={(e) => field(current.id, "image", e.target.value)}
                      placeholder="Leave blank to use the site default"
                    />
                  </Field>

                  <div className="mb-4 flex items-center justify-between gap-4 rounded-control border border-line px-3.5 py-3">
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
                      onChange={() => field(current.id, "noindex", d.noindex !== true)}
                      label={`Hide ${current.label} from search engines`}
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <SerpPreview origin={origin} path={current.path} title={d.title} description={d.description} />
                  {d.image ? (
                    <div className="mt-4">
                      <div className="mb-1.5 text-caption font-semibold text-muted">Share image</div>
                      <img
                        src={d.image}
                        alt=""
                        className="w-full rounded-control border border-line object-cover"
                        style={{ aspectRatio: "1200 / 630" }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="primary" onClick={() => void save(current.id)} loading={savingKey === current.id}>
                  Save
                </Button>
                {savedKey === current.id ? (
                  <span className="flex items-center gap-1.5 text-ui text-success">
                    <Check size={15} /> Saved
                  </span>
                ) : null}
              </div>
            </>
          ) : (
            /* Content-driven page: its metadata comes from the item itself, so
               editing it here would create a second source of truth that drifts
               out of step with the article. */
            <>
              <div className="mb-5">
                <h2 className="font-display text-section">{current.label}</h2>
                <p className="font-mono mt-1 text-caption text-faint">{current.path}</p>
              </div>

              <Callout tone="info" icon={<FileText size={14} />} className="mb-5">
                This page's search title and description come from the {current.group === "articles" ? "article" : "project"} itself
                — its title and summary — so there is nothing to override here. Edit the content and the
                search result follows automatically.
              </Callout>

              <SerpPreview
                origin={origin}
                path={current.path}
                title={current.derivedTitle ?? ""}
                description={current.derivedDesc ?? ""}
                fallbackNote="No summary yet — add one and it becomes the description"
              />

              <Link to={current.editRoute ?? "/"} className="mt-5 inline-block">
                <Button icon={<ExternalLink size={14} />}>
                  Edit this {current.group === "articles" ? "article" : "project"}
                </Button>
              </Link>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
