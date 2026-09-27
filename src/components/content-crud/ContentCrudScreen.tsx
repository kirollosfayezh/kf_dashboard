import { useEffect, useState } from "react";
import { api } from "@/services/http";
import type { ContentCollection, ContentItem } from "@/services/domain-types";
import { MediaPicker } from "@/components/MediaPicker";
import { mediaPreviewUrl } from "@/lib/utils";
import {
  AddButton,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  Drawer,
  EmptyState,
  ErrorBanner,
  Field,
  GradientButton,
  Input,
  PanelHead,
  Pill,
  toneForStatus,
  RowActions,
  SectionHead,
  Spinner,
  Textarea,
  Toggle,
} from "@/components/ui";

/** How the mockup lays each collection out: a row table, a card grid, or the
 * numbered FAQ accordion list. */
export type CrudLayout = "table" | "cards" | "faq";

/** Only used to show an editor a real URL; a missing value degrades to a
 *  relative path rather than to a broken absolute one. */
const SITE_URL = (import.meta.env.VITE_SITE_URL?.trim() || "").replace(/\/+$/, "");

/**
 * The languages the CMS stores. All four, not the two it used to: German and
 * French text typed into the dashboard was accepted, saved and then silently
 * discarded by the Mongoose schema, so `de`/`fr` readers only ever saw whatever
 * the site's own dictionary happened to contain.
 */
export const CMS_LANGS = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "de", label: "Deutsch", dir: "ltr" },
  { code: "fr", label: "Français", dir: "ltr" },
] as const;

type LangCode = (typeof CMS_LANGS)[number]["code"];
type Translated = Record<LangCode, string>;

const emptyTranslated = (): Translated => ({ en: "", ar: "", de: "", fr: "" });
const readTranslated = (v: Partial<Record<LangCode, string>> | undefined): Translated => ({
  en: v?.en ?? "",
  ar: v?.ar ?? "",
  de: v?.de ?? "",
  fr: v?.fr ?? "",
});

/** The `meta` keys this form exposes as their own inputs, beyond tag/result/points. */
const META_TEXT_FIELDS = [
  "demoUrl", "repoUrl", "client", "year", "duration",
  "badge", "ctaLabel", "ctaUrl", "startsAt", "endsAt", "delaySeconds",
  "authorRole", "company", "rating", "sourceUrl",
] as const;
type MetaTextField = (typeof META_TEXT_FIELDS)[number];

interface FormState {
  id?: string;
  slug: string;
  published: boolean;
  order: number;
  title: Translated;
  summary: Translated;
  body: Translated;
  media: string[];
  /** The item's existing `meta` bag, carried through untouched so a save cannot
   *  drop keys this form does not expose. */
  meta: Record<string, unknown>;
  tag: string;
  result: string;
  points: string;
  links: Record<MetaTextField, string>;
}

const emptyLinks = () =>
  Object.fromEntries(META_TEXT_FIELDS.map((k) => [k, ""])) as Record<MetaTextField, string>;

const EMPTY_FORM: FormState = {
  slug: "",
  published: false,
  order: 0,
  title: emptyTranslated(),
  summary: emptyTranslated(),
  body: emptyTranslated(),
  media: [],
  meta: {},
  tag: "",
  result: "",
  points: "",
  links: emptyLinks(),
};

function toForm(item: ContentItem): FormState {
  return {
    id: item.id,
    slug: item.slug,
    published: item.published,
    order: item.order,
    title: readTranslated(item.title),
    summary: readTranslated(item.summary),
    body: readTranslated(item.body),
    media: item.media ?? [],
    meta: item.meta ?? {},
    tag: typeof item.meta?.tag === "string" ? item.meta.tag : "",
    result: typeof item.meta?.result === "string" ? item.meta.result : "",
    points: Array.isArray(item.meta?.points)
      ? (item.meta.points as unknown[]).filter((x): x is string => typeof x === "string").join("\n")
      : "",
    // `rating` is stored as a number; everything else as text.
    links: Object.fromEntries(
      META_TEXT_FIELDS.map((k) => {
        const v = item.meta?.[k];
        return [k, typeof v === "string" ? v : typeof v === "number" ? String(v) : ""];
      }),
    ) as Record<MetaTextField, string>,
  };
}

function toPayload(form: FormState) {
  const points = form.points
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  /**
   * `meta` is spread from the item's existing bag before the edited keys are
   * applied.
   *
   * The API PATCHes with `findByIdAndUpdate`, which `$set`s the whole `meta`
   * path rather than merging it — so sending only the fields this form knows
   * about would silently wipe every other key the seeder wrote (`alt`, and
   * anything added later). Read-merge-write is the only safe shape here.
   */
  const meta: Record<string, unknown> = { ...form.meta, points };
  if (form.tag.trim()) meta.tag = form.tag.trim();
  else delete meta.tag;
  if (form.result.trim()) meta.result = form.result.trim();
  else delete meta.result;
  // An empty input clears the key rather than storing "" — the site tests these
  // for presence to decide whether to render a button at all.
  for (const k of META_TEXT_FIELDS) {
    const v = form.links[k].trim();
    if (v) meta[k] = v;
    else delete meta[k];
  }
  // A star rating is a number 1–5 on the site, not the "5" the input gives us.
  if (typeof meta.rating === "string") {
    const n = Math.round(Number(meta.rating));
    if (Number.isFinite(n) && n >= 1 && n <= 5) meta.rating = n;
    else delete meta.rating;
  }
  // A placeholder project carries `sample: true`; a real one carries no key at
  // all, so the site's "is this a sample?" check is a plain `=== true`.
  if (form.meta.sample === true) meta.sample = true;
  else delete meta.sample;

  return {
    slug: form.slug.trim(),
    published: form.published,
    order: Number(form.order) || 0,
    title: form.title,
    summary: form.summary,
    body: form.body,
    media: form.media,
    meta,
  };
}

export function ContentCrudScreen({
  collection,
  label,
  description,
  layout = "table",
  addLabel,
  singularLabel,
}: {
  collection: ContentCollection;
  label: string;
  description: string;
  layout?: CrudLayout;
  /** Overrides the derived "Add <singular>" wording (e.g. "Add question"). */
  addLabel?: string;
  /** Overrides the singular used in the editor heading and empty state. */
  singularLabel?: string;
}) {
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [activeLang, setActiveLang] = useState<LangCode>("en");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<ContentItem | null>(null);

  const load = async () => {
    setError(null);
    try {
      const data = await api.get<ContentItem[]>(`/admin/content/${collection}`);
      setItems([...data].sort((a, b) => a.order - b.order));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load content");
    }
  };

  useEffect(() => {
    setItems(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection]);

  const setLink = (key: MetaTextField, value: string) =>
    setForm((f) => (f ? { ...f, links: { ...f.links, [key]: value } } : f));

  const openForm = (next: FormState) => {
    setActiveLang("en");
    setForm(next);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(form);
      if (form.id) {
        await api.patch(`/admin/content/${collection}/${form.id}`, payload);
      } else {
        await api.post(`/admin/content/${collection}`, payload);
      }
      setForm(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (item: ContentItem) => {
    try {
      await api.patch(`/admin/content/${collection}/${item.id}`, { published: !item.published });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update item");
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/admin/content/${collection}/${toDelete.id}`);
      setToDelete(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete item");
    }
  };

  const singular = singularLabel ?? (label === "FAQ" ? "Question" : label.replace(/s$/, ""));

  return (
    <div className="kf-scr">
      <SectionHead
        title={label}
        subtitle={description}
        action={
          <AddButton onClick={() => openForm(EMPTY_FORM)}>
            {addLabel ?? `Add ${singular.toLowerCase()}`}
          </AddButton>
        }
      />
      {error ? <ErrorBanner message={error} /> : null}

      {!items && !error ? (
        <div className="grid place-items-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : null}

      {items && items.length === 0 ? (
        <EmptyState
          title={`No ${label.toLowerCase()} yet`}
          body={`Add the first ${singular.toLowerCase()} and it will appear here — and on the site as soon as you publish it.`}
        />
      ) : null}

      {items && items.length > 0 && layout === "table" ? (
        <DataTable
          columns={[
            { label: "Order", w: "0.5fr" },
            { label: "Title", w: "2.2fr" },
            { label: "Slug", w: "1.2fr" },
            { label: "Status", w: "1fr" },
            { label: "", w: "90px", hideOnMobile: true },
          ]}
          rowKey={(i) => items[i].id}
          rows={items.map((item) => [
            <span className="font-mono text-caption text-faint">
              {item.order}
            </span>,
            <span className="block truncate font-semibold">{item.title?.en || "(untitled)"}</span>,
            <span className="font-mono block truncate text-caption text-faint">
              {item.slug}
            </span>,
            <div className="flex items-center gap-2">
              <Toggle
                checked={item.published}
                onChange={() => void togglePublished(item)}
                label={`${item.published ? "Unpublish" : "Publish"} ${item.title?.en || "item"}`}
              />
              <Pill tone={toneForStatus(item.published ? "published" : "draft")}>{item.published ? "published" : "draft"}</Pill>
            </div>,
            <RowActions onEdit={() => openForm(toForm(item))} onDelete={() => setToDelete(item)} />,
          ])}
        />
      ) : null}

      {items && items.length > 0 && layout === "cards" ? (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))" }}
        >
          {items.map((item, i) => (
            <Card
              key={item.id}
              className="!p-4"
              style={{
                animation: "kfIn .5s cubic-bezier(.22,1,.36,1) both",
                animationDelay: `${Math.min(i, 8) * 0.05}s`,
              }}
            >
              {/* The mockup's `imgBox`: the item's first media file, or a dashed
                  placeholder that says where an image would go. */}
              <div
                className="relative overflow-hidden rounded-control border border-dashed"
                style={{ aspectRatio: "16/9", background: "var(--panel2)", borderColor: "var(--bstrong)" }}
              >
                {item.media?.[0] ? (
                  <>
                    <img src={mediaPreviewUrl(item.media[0])} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    {item.media.length > 1 ? (
                      <span
                        className="font-mono absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-label"
                        style={{ background: "rgba(0,0,0,.6)", color: "#fff" }}
                        title={`${item.media.length} images`}
                      >
                        +{item.media.length - 1}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <div
                    className="absolute inset-0 grid place-items-center px-3 text-center text-caption text-faint"
                  >
                    No image yet
                  </div>
                )}
              </div>
              <div className="mt-3.5 flex items-center gap-2.5">
                <h3 className="font-display min-w-0 flex-1 truncate text-section font-semibold">
                  {item.title?.en || "(untitled)"}
                </h3>
                <Pill tone={toneForStatus(item.published ? "published" : "draft")}>{item.published ? "published" : "draft"}</Pill>
              </div>
              <div className="font-mono mt-1.5 truncate text-caption text-faint">
                /{item.slug}
              </div>
              <p
                className="mt-2 line-clamp-3 min-h-[60px] text-ui leading-[1.55] text-muted"
              >
                {item.summary?.en || item.body?.en || "No summary yet."}
              </p>
              <div className="mt-3.5 flex items-center gap-2">
                <Button className="flex-1" onClick={() => openForm(toForm(item))}>
                  Edit
                </Button>
                <Toggle
                checked={item.published}
                onChange={() => void togglePublished(item)}
                label={`${item.published ? "Unpublish" : "Publish"} ${item.title?.en || "item"}`}
              />
                <RowActions onEdit={() => openForm(toForm(item))} onDelete={() => setToDelete(item)} />
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {items && items.length > 0 && layout === "faq" ? (
        <div className="flex flex-col gap-3">
          {items.map((item, i) => (
            <Card
              key={item.id}
              className="!p-[18px]"
              style={{
                animation: "kfIn .45s cubic-bezier(.22,1,.36,1) both",
                animationDelay: `${Math.min(i, 8) * 0.05}s`,
              }}
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="font-mono w-[22px] shrink-0 text-label text-faint">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="min-w-0 flex-1 text-body font-semibold">
                  {item.title?.en || "(untitled)"}
                </div>
                <Toggle
                checked={item.published}
                onChange={() => void togglePublished(item)}
                label={`${item.published ? "Unpublish" : "Publish"} ${item.title?.en || "item"}`}
              />
                <Pill tone={toneForStatus(item.published ? "published" : "draft")}>{item.published ? "published" : "draft"}</Pill>
                <RowActions onEdit={() => openForm(toForm(item))} onDelete={() => setToDelete(item)} />
              </div>
              <p
                className="mt-2.5 text-ui leading-[1.6] sm:pl-[34px] text-muted"
              >
                {item.summary?.en || item.body?.en || "No answer yet."}
              </p>
            </Card>
          ))}
        </div>
      ) : null}

      {/* The editor is a sheet, not a card appended after the list. It used to
          render below every item with no scroll or focus change, so on a long
          collection tapping Edit appeared to do nothing at all. */}
      <Drawer
        open={!!form}
        onClose={() => setForm(null)}
        width="lg"
        title={form?.id ? `Edit ${singular.toLowerCase()}` : `New ${singular.toLowerCase()}`}
        subtitle="Changes apply everywhere this item appears on the site."
        footer={
          <div className="flex gap-2.5">
            <GradientButton type="submit" form="kf-content-form" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </GradientButton>
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>
              Cancel
            </Button>
          </div>
        }
      >
        {form ? (
          <form id="kf-content-form" onSubmit={save}>
            <div
              className="grid gap-x-5"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))" }}
            >
              <Field label="Slug" hint="The URL segment. Lowercase, dashes, no spaces.">
                <Input
                  required
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="my-item-slug"
                />
              </Field>
              <Field label="Order" hint="Lower numbers appear first.">
                <Input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                />
              </Field>
            </div>

            {/*
              One tab per language instead of eight stacked inputs. The old form
              showed English and Arabic side by side, which already overflowed a
              phone; four languages that way would be unusable. The dot on a tab
              says whether that language has a title yet, so an untranslated
              item is visible without opening every tab.
            */}
            <div className="mb-1.5 text-caption font-semibold text-muted">
              Content
            </div>
            <div
              className="mb-3 flex overflow-hidden rounded-control border border-line"
              role="tablist"
              aria-label="Content language"
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
                    title={form.title[l.code].trim() ? "Translated" : "Empty"}
                    className="h-[6px] w-[6px] shrink-0 rounded-full"
                    style={{
                      background: form.title[l.code].trim() ? "#4ADE80" : "var(--bstrong)",
                    }}
                  />
                </button>
              ))}
            </div>

            {(() => {
              const l = CMS_LANGS.find((x) => x.code === activeLang) ?? CMS_LANGS[0];
              const set = (key: "title" | "summary" | "body", value: string) =>
                setForm({ ...form, [key]: { ...form[key], [l.code]: value } });
              return (
                <div key={l.code}>
                  <Field
                    label="Title"
                    hint={
                      l.code === "en"
                        ? "Required. Every other language falls back to this one."
                        : `Leave blank to show the English title to ${l.label} readers.`
                    }
                  >
                    <Input
                      required={l.code === "en"}
                      dir={l.dir}
                      value={form.title[l.code]}
                      onChange={(e) => set("title", e.target.value)}
                    />
                  </Field>
                  <Field label="Summary" hint="The short line on cards and in search results.">
                    <Textarea
                      rows={3}
                      dir={l.dir}
                      value={form.summary[l.code]}
                      onChange={(e) => set("summary", e.target.value)}
                    />
                  </Field>
                  <Field label="Body">
                    <Textarea
                      rows={8}
                      dir={l.dir}
                      value={form.body[l.code]}
                      onChange={(e) => set("body", e.target.value)}
                    />
                  </Field>
                </div>
              );
            })()}

            <MediaPicker
              value={form.media}
              onChange={(media) => setForm({ ...form, media })}
              devices={collection === "projects"}
              hint={
                collection === "projects"
                  ? "Add as many as you like: the site swipes through them every 2 seconds, in this order. Mark screenshots Desktop or Mobile and the site shows the whole capture inside a browser window or a phone; Photo fills the box. The first image is also the one shown when the page is shared."
                  : undefined
              }
            />

            {/* These three drive real layout on the site — the eyebrow chip, the
                bullet/tech list and the result badge — and were previously only
                settable by re-running the seeder. */}
            <div
              className="grid gap-x-5"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))" }}
            >
              <Field label="Tag" hint="The small label above the title on cards.">
                <Input
                  value={form.tag}
                  onChange={(e) => setForm({ ...form, tag: e.target.value })}
                  placeholder="e.g. POS System"
                />
              </Field>
              <Field label="Result" hint="The short outcome line on a project card.">
                <Input
                  value={form.result}
                  onChange={(e) => setForm({ ...form, result: e.target.value })}
                  placeholder="e.g. 30% less stock waste"
                />
              </Field>
            </div>
            <Field label="Bullet points" hint="One per line — the tech stack on a project, the feature list elsewhere.">
              <Textarea
                rows={4}
                value={form.points}
                onChange={(e) => setForm({ ...form, points: e.target.value })}
                placeholder={"React\nNode.js\nPostgreSQL"}
              />
            </Field>

            {/*
              Projects only. Every other collection would just carry five empty
              keys, and the site reads these solely from a project.
            */}
            {/* Offers only: the popup's badge, its button and when it runs. */}
            {collection === "promos" ? (
              <>
                <div
                  className="mb-2 mt-1 border-t pt-4 text-caption font-semibold text-muted"
                  style={{ borderColor: "var(--border)" }}
                >
                  Offer details
                </div>
                <div
                  className="grid gap-x-5"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))" }}
                >
                  <Field label="Badge" hint="The small chip over the photo, e.g. “Limited offer”.">
                    <Input
                      value={form.links.badge}
                      onChange={(e) => setLink("badge", e.target.value)}
                      placeholder="Limited offer"
                    />
                  </Field>
                  <Field label="Button label" hint="Defaults to “Claim this offer”.">
                    <Input
                      value={form.links.ctaLabel}
                      onChange={(e) => setLink("ctaLabel", e.target.value)}
                      placeholder="Claim this offer"
                    />
                  </Field>
                  <Field label="Button goes to" hint="A page on your site like /contact, or a full https:// link.">
                    <Input
                      value={form.links.ctaUrl}
                      onChange={(e) => setLink("ctaUrl", e.target.value)}
                      placeholder="/contact"
                    />
                  </Field>
                  <Field label="Starts" hint="Leave blank to start immediately.">
                    <Input
                      type="date"
                      value={form.links.startsAt}
                      onChange={(e) => setLink("startsAt", e.target.value)}
                    />
                  </Field>
                  <Field label="Ends" hint="Runs to the end of this day, then stops on its own.">
                    <Input
                      type="date"
                      value={form.links.endsAt}
                      onChange={(e) => setLink("endsAt", e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Show after (seconds)"
                    hint="Counted from when the page loads, not from when the offer downloads. 0 shows it immediately; blank means 1.5."
                  >
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      step={0.5}
                      value={form.links.delaySeconds}
                      onChange={(e) => setLink("delaySeconds", e.target.value)}
                      placeholder="1.5"
                    />
                  </Field>
                </div>
                <div className="mb-4 rounded-control border border-line bg-raised px-3.5 py-3 text-caption text-faint">
                  Only the first published offer inside its window is shown, so publishing a second one
                  queues it rather than showing both. A visitor who dismisses it does not see it again.
                </div>
              </>
            ) : null}

            {/* Testimonials only: who said it and where it can be checked. */}
            {collection === "testimonials" ? (
              <>
                <div
                  className="mb-2 mt-1 border-t pt-4 text-caption font-semibold text-muted"
                  style={{ borderColor: "var(--border)" }}
                >
                  Client details
                </div>
                <div
                  className="grid gap-x-5"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))" }}
                >
                  <Field label="Role" hint="Their job title, e.g. Operations Manager.">
                    <Input
                      value={form.links.authorRole}
                      onChange={(e) => setLink("authorRole", e.target.value)}
                      placeholder="Operations Manager"
                    />
                  </Field>
                  <Field label="Company" hint="Shown after the role.">
                    <Input
                      value={form.links.company}
                      onChange={(e) => setLink("company", e.target.value)}
                      placeholder="Cairo Bistro Group"
                    />
                  </Field>
                  <Field label="Rating" hint="1–5, shown as stars. Leave blank for none.">
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      step={1}
                      inputMode="numeric"
                      value={form.links.rating}
                      onChange={(e) => setLink("rating", e.target.value)}
                      placeholder="5"
                    />
                  </Field>
                  <Field label="Source link" hint="The LinkedIn post or Google review this came from — shown as 'View review'.">
                    <Input
                      type="url"
                      inputMode="url"
                      value={form.links.sourceUrl}
                      onChange={(e) => setLink("sourceUrl", e.target.value)}
                      placeholder="https://www.linkedin.com/posts/…"
                    />
                  </Field>
                </div>
                <div className="mb-4 rounded-control border border-line bg-raised px-3.5 py-3 text-caption text-faint">
                  Title = the client's name. Summary = the quote (one or two sentences, translated per
                  language). Photo = their portrait. Rows seeded earlier keep "Role, Company" in the Tag
                  field until you fill these in.
                </div>
              </>
            ) : null}

            {collection === "projects" ? (
              <>
                <div
                  className="mb-2 mt-1 border-t pt-4 text-caption font-semibold border-line text-muted"
                >
                  Project details
                </div>
                <div
                  className="grid gap-x-5"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))" }}
                >
                  <Field label="Live demo URL" hint="Shown as a 'Live demo' button. Leave blank to hide it.">
                    <Input
                      type="url"
                      inputMode="url"
                      value={form.links.demoUrl}
                      onChange={(e) => setLink("demoUrl", e.target.value)}
                      placeholder="https://demo.example.com"
                    />
                  </Field>
                  <Field label="Repository URL" hint="GitHub, GitLab — shown as a 'Source' button.">
                    <Input
                      type="url"
                      inputMode="url"
                      value={form.links.repoUrl}
                      onChange={(e) => setLink("repoUrl", e.target.value)}
                      placeholder="https://github.com/you/project"
                    />
                  </Field>
                  <Field label="Client" hint="Who it was built for. Leave blank if it is under NDA.">
                    <Input
                      value={form.links.client}
                      onChange={(e) => setLink("client", e.target.value)}
                      placeholder="e.g. Cairo Bistro Group"
                    />
                  </Field>
                  <Field label="Year">
                    <Input
                      inputMode="numeric"
                      value={form.links.year}
                      onChange={(e) => setLink("year", e.target.value)}
                      placeholder="2026"
                    />
                  </Field>
                  <Field label="Duration">
                    <Input
                      value={form.links.duration}
                      onChange={(e) => setLink("duration", e.target.value)}
                      placeholder="e.g. 10 weeks"
                    />
                  </Field>
                </div>
                {/* The six seeded placeholders carry this flag so the site can
                    label them; a delivered project must never be tagged. */}
                <div className="mb-4 flex items-center justify-between gap-4 rounded-control border border-line px-3.5 py-3">
                  <div>
                    <div className="text-ui font-semibold">Illustrative sample (not a delivered project)</div>
                    <div className="mt-0.5 text-caption text-faint">
                      {form.meta.sample === true
                        ? "Labelled “Illustrative example” on the site. Switch off once real screenshots are in."
                        : "Shown as real, delivered work."}
                    </div>
                  </div>
                  <Toggle
                    checked={form.meta.sample === true}
                    onChange={() =>
                      setForm({ ...form, meta: { ...form.meta, sample: form.meta.sample !== true } })
                    }
                    label="Illustrative sample (not a delivered project)"
                  />
                </div>
                <div
                  className="mb-4 rounded-control border px-[14px] py-3 text-caption border-line bg-raised text-faint"
                >
                  Case study page:{" "}
                  <span className="font-mono text-muted">
                    {`${SITE_URL}/projects/${form.slug.trim() || "your-slug"}`}
                  </span>
                  <br />
                  Built from the fields above — the body becomes the write-up. It goes live with
                  the project itself, so nothing extra to publish.
                </div>
              </>
            ) : null}

            {collection === "services" ? (
              <div className="mb-4 rounded-control border px-[14px] py-3 text-caption border-line bg-raised text-faint">
                Landing page:{" "}
                <span className="font-mono text-muted">
                  {`${SITE_URL}/services/${form.slug.trim() || "your-slug"}`}
                </span>
                <br />
                Title and summary are the card on /services. The body is the full landing page in
                Markdown (## headings, lists, links); a &quot;## Frequently asked questions&quot; section
                with ### questions becomes FAQ data for Google. A language appears once its body is
                written. Redeploy the site after editing so search engines see the change.
              </div>
            ) : null}

            <label className="flex items-center gap-2.5 text-ui font-medium">
              <Toggle
                checked={form.published}
                onChange={() => setForm({ ...form, published: !form.published })}
                label="Published"
              />
              Published
            </label>
          </form>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete "${toDelete?.title?.en ?? ""}"?`}
        body="This cannot be undone."
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
