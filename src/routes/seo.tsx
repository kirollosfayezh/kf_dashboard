import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ExternalLink, FileText, Info, RotateCcw, Search } from "lucide-react";
import { api } from "@/services/http";
import type { ContentItem } from "@/services/domain-types";
import { CMS_LANGS } from "@/components/content-crud/ContentCrudScreen";
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

type LangCode = (typeof CMS_LANGS)[number]["code"];
type Translated = Record<LangCode, string>;

/**
 * A row of `/admin/seo`. `title` and `description` are per language; the API
 * normalises legacy rows on read, but a plain string is still accepted here and
 * treated as English so an older backend cannot blank the screen.
 */
interface SeoOverride {
  key: string;
  title?: Partial<Translated> | string;
  description?: Partial<Translated> | string;
  keywords?: string;
  image?: string;
  noindex?: boolean | null;
  updatedAt?: string;
}

/**
 * The nine entries the site's own `PAGES` table defines. The backend rejects
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

type Group = "pages" | "services" | "articles" | "projects";

/** The site's built-in copy per page key, from its build-time `seo-defaults.json`. */
type Defaults = Record<string, { title: Partial<Translated>; description: Partial<Translated> }>;

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

interface Draft {
  title: Translated;
  description: Translated;
  keywords: string;
  image: string;
  noindex: boolean | null;
}

const emptyTranslated = (): Translated => ({ en: "", ar: "", de: "", fr: "" });

const blankDraft = (): Draft => ({
  title: emptyTranslated(),
  description: emptyTranslated(),
  keywords: "",
  image: "",
  noindex: null,
});

/** A legacy string is English; missing languages read as blank. */
const readTranslated = (v: Partial<Translated> | string | undefined): Translated => {
  if (typeof v === "string") return { ...emptyTranslated(), en: v };
  return { en: v?.en ?? "", ar: v?.ar ?? "", de: v?.de ?? "", fr: v?.fr ?? "" };
};

const fromRow = (r: SeoOverride | undefined): Draft => ({
  title: readTranslated(r?.title),
  description: readTranslated(r?.description),
  keywords: r?.keywords ?? "",
  image: r?.image ?? "",
  noindex: typeof r?.noindex === "boolean" ? r.noindex : null,
});

const hasText = (t: Translated) => CMS_LANGS.some((l) => t[l.code].trim().length > 0);

/** The site's own fallback: this language's text, else the English override. */
const shownIn = (t: Translated, lang: LangCode) => t[lang].trim() || t.en.trim();

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
  dir,
  fallbackNote,
  defaultTitle,
  defaultDescription,
}: {
  origin: string;
  path: string;
  title: string;
  description: string;
  dir?: "ltr" | "rtl";
  fallbackNote?: string;
  /** What a blank field falls back to, shown dimmed so it reads as inherited. */
  defaultTitle?: string;
  defaultDescription?: string;
}) {
  const shown = (s: string, limit: number) => (s.length > limit ? `${s.slice(0, limit - 1)}…` : s);
  const url = `${origin.replace(/^https?:\/\//, "")}${path === "/" ? "" : path}`;
  const placeholder = fallbackNote ?? "Using the site default";
  const inherited = (!title && !!defaultTitle) || (!description && !!defaultDescription);
  return (
    <div className="rounded-control border border-line bg-raised p-4">
      <div className="label mb-2 flex items-center gap-1.5 text-faint">
        <Search size={12} />
        Search preview
        {inherited ? (
          <span className="ml-auto rounded-full border border-line px-2 py-0.5 text-[10px] normal-case tracking-normal">
            Site default
          </span>
        ) : null}
      </div>
      <div className="font-mono text-caption text-muted">{url}</div>
      <div className="mt-0.5 text-[16px] leading-[1.3] text-info" dir={dir}>
        {shown(title, TITLE_LIMIT) ||
          (defaultTitle ? shown(defaultTitle, TITLE_LIMIT) : <span className="text-faint" dir="ltr">{placeholder}</span>)}
      </div>
      <div className="mt-1 text-caption text-muted" dir={dir}>
        {shown(description, DESC_LIMIT) ||
          (defaultDescription ? (
            shown(defaultDescription, DESC_LIMIT)
          ) : (
            <span className="text-faint" dir="ltr">{placeholder}</span>
          ))}
      </div>
    </div>
  );
}

function SeoPage() {
  const [rows, setRows] = useState<SeoOverride[] | null>(null);
  const [articles, setArticles] = useState<ContentItem[]>([]);
  const [projects, setProjects] = useState<ContentItem[]>([]);
  const [services, setServices] = useState<ContentItem[]>([]);
  const [defaults, setDefaults] = useState<Defaults>({});
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const [group, setGroup] = useState<Group>("pages");
  const [selected, setSelected] = useState<string>("home");
  const [query, setQuery] = useState("");
  // Kept across pages on purpose: a translator working through every page in
  // Arabic should not be bounced back to English on each click.
  const [activeLang, setActiveLang] = useState<LangCode>("en");

  const origin = import.meta.env.VITE_SITE_URL?.trim() || "https://your-site.com";

  // The live site's built-in titles and descriptions, so a blank field shows
  // what it actually falls back to. Missing (an older deploy, offline) just
  // means the preview says "Using the site default" as before.
  useEffect(() => {
    let cancelled = false;
    fetch(`${origin.replace(/\/+$/, "")}/seo-defaults.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Defaults>) : {}))
      .then((d) => {
        if (!cancelled) setDefaults(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [origin]);

  useEffect(() => {
    (async () => {
      try {
        // Articles and case studies are listed so this screen shows every
        // indexable URL, not just the nine the override table covers.
        const [data, posts, projs, svcs] = await Promise.all([
          api.get<SeoOverride[]>("/admin/seo"),
          api.get<ContentItem[]>("/admin/content/blogPosts").catch(() => []),
          api.get<ContentItem[]>("/admin/content/projects").catch(() => []),
          api.get<ContentItem[]>("/admin/content/services").catch(() => []),
        ]);
        setRows(data);
        setArticles(posts);
        setProjects(projs);
        setServices(svcs);
        const next: Record<string, Draft> = {};
        for (const p of PAGES) next[p.key] = fromRow(data.find((x) => x.key === p.key));
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
    // A service landing page carries its own SEO title and description in
    // meta (from its Markdown source); the card title/summary are the fallback.
    const en = (v: unknown) =>
      v && typeof v === "object" && typeof (v as { en?: unknown }).en === "string" ? (v as { en: string }).en.trim() : "";
    const serviceRow = (item: ContentItem): Entry => ({
      ...contentRow(item, "services", "/services", "/services"),
      derivedTitle: en(item.meta?.seoTitle) || `${en(item.meta?.headline) || item.title?.en || ""} | KF Tech Solutions`,
      derivedDesc: en(item.meta?.seoDescription) || en(item.meta?.lede) || item.summary?.en,
    });
    return [
      ...pageRows,
      ...services.map(serviceRow),
      ...articles.map((a) => contentRow(a, "articles", "/blog", "/blogPosts")),
      ...projects.map((p) => contentRow(p, "projects", "/projects", "/projects")),
    ];
  }, [articles, projects, services]);

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

  const setText = (key: string, name: "title" | "description", lang: LangCode, value: string) =>
    setDraft((d) => ({ ...d, [key]: { ...d[key], [name]: { ...d[key][name], [lang]: value } } }));

  const setField = (key: string, name: "keywords" | "image" | "noindex", value: string | boolean | null) =>
    setDraft((d) => ({ ...d, [key]: { ...d[key], [name]: value } }));

  /** Sends the whole draft: a blank language clears that language on the server. */
  const save = async (key: string) => {
    setSavingKey(key);
    setError(null);
    try {
      const updated = await api.patch<SeoOverride>(`/admin/seo/${key}`, draft[key]);
      setRows((prev) => [...(prev ?? []).filter((r) => r.key !== key), updated]);
      setDraft((d) => ({ ...d, [key]: fromRow(updated) }));
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

  const d = current?.overridable ? (draft[current.id] ?? blankDraft()) : blankDraft();
  const overridden =
    current?.overridable &&
    (hasText(d.title) || hasText(d.description) || !!d.keywords || !!d.image || typeof d.noindex === "boolean");
  const lang = CMS_LANGS.find((l) => l.code === activeLang) ?? CMS_LANGS[0];

  const counts = {
    pages: PAGES.length,
    services: services.length,
    articles: articles.length,
    projects: projects.length,
  };

  return (
    <div className="kf-scr">
      <PageHeader
        title="SEO"
        subtitle="What each page tells Google and the AI assistants, in every language the site speaks. Pick a page on the left; leave a field blank to use the site's built-in default."
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
              { value: "services", label: `Services ${counts.services}` },
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
                      onClick={() => setDraft((x) => ({ ...x, [current.id]: blankDraft() }))}
                      title="Clear every field, in every language, so this page falls back to the site's built-in values"
                    >
                      Reset
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-x-5 lg:grid-cols-2">
                <div className="min-w-0">
                  {/*
                    One tab per language, as on the content editor. The dot says
                    whether that language has its own title, so an untranslated
                    page is visible without opening every tab.
                  */}
                  <div
                    className="mb-3 flex overflow-hidden rounded-control border border-line"
                    role="tablist"
                    aria-label="Override language"
                  >
                    {CMS_LANGS.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        role="tab"
                        aria-selected={activeLang === l.code}
                        onClick={() => setActiveLang(l.code)}
                        className="flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-caption font-semibold"
                        style={{
                          background: activeLang === l.code ? "rgba(255,106,0,.12)" : "transparent",
                          color: activeLang === l.code ? "var(--text)" : "var(--text2)",
                        }}
                      >
                        {l.label}
                        <span
                          aria-hidden="true"
                          title={d.title[l.code].trim() ? "Has its own title" : "Empty"}
                          className="h-[6px] w-[6px] shrink-0 rounded-full"
                          style={{
                            background: d.title[l.code].trim() ? "#4ADE80" : "var(--bstrong)",
                          }}
                        />
                      </button>
                    ))}
                  </div>

                  <div key={lang.code}>
                    <Field
                      label="Title"
                      hint={
                        lang.code === "en"
                          ? "The clickable headline in search results and on the browser tab. Leave blank to use the site default."
                          : `Leave blank to show the English text to ${lang.label} readers.`
                      }
                    >
                      <Input
                        dir={lang.dir}
                        value={d.title[lang.code]}
                        onChange={(e) => setText(current.id, "title", lang.code, e.target.value)}
                        placeholder={
                          (lang.code !== "en" && d.title.en) ||
                          defaults[current.id]?.title?.[lang.code] ||
                          "Leave blank to use the site default"
                        }
                      />
                      <div className="mt-1.5 text-right">
                        <Counter value={d.title[lang.code]} limit={TITLE_LIMIT} />
                      </div>
                    </Field>

                    <Field
                      label="Meta description"
                      hint={
                        lang.code === "en"
                          ? "The grey summary under the headline. Leave blank to use the site default."
                          : `Leave blank to show the English text to ${lang.label} readers.`
                      }
                    >
                      <Textarea
                        rows={3}
                        dir={lang.dir}
                        value={d.description[lang.code]}
                        onChange={(e) => setText(current.id, "description", lang.code, e.target.value)}
                        placeholder={
                          (lang.code !== "en" && d.description.en) ||
                          defaults[current.id]?.description?.[lang.code] ||
                          "Leave blank to use the site default"
                        }
                      />
                      <div className="mt-1.5 text-right">
                        <Counter value={d.description[lang.code]} limit={DESC_LIMIT} />
                      </div>
                    </Field>
                  </div>

                  <Field
                    label="Keywords"
                    hint="Comma separated, all languages. Google ignores these; they stay for other engines and your own reference."
                  >
                    <Input
                      value={d.keywords}
                      onChange={(e) => setField(current.id, "keywords", e.target.value)}
                      placeholder="Leave blank to use the site default"
                    />
                  </Field>

                  <Field label="Share image URL" hint="1200×630 works everywhere, for social and chat previews. Shared by every language.">
                    <Input
                      value={d.image}
                      onChange={(e) => setField(current.id, "image", e.target.value)}
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
                      onChange={() => setField(current.id, "noindex", d.noindex !== true)}
                      label={`Hide ${current.label} from search engines`}
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <SerpPreview
                    origin={origin}
                    path={lang.code === "en" ? current.path : `/${lang.code}${current.path === "/" ? "" : current.path}`}
                    title={shownIn(d.title, lang.code)}
                    description={shownIn(d.description, lang.code)}
                    defaultTitle={defaults[current.id]?.title?.[lang.code]}
                    defaultDescription={defaults[current.id]?.description?.[lang.code]}
                    dir={lang.dir}
                  />
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
                {current.group === "services"
                  ? "This landing page's search title and description come from the service itself — its SEO title and description in each language, written with the page's text — so there is nothing to override here. Edit the service and the search result follows after a redeploy."
                  : `This page's search title and description come from the ${current.group === "articles" ? "article" : "project"} itself — its title and summary — so there is nothing to override here. Edit the content and the search result follows automatically.`}
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
                  Edit this {current.group === "articles" ? "article" : current.group === "services" ? "service" : "project"}
                </Button>
              </Link>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
