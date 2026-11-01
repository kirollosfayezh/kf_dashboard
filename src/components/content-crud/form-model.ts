import type { ContentItem } from "@/services/domain-types";

/**
 * The content editor's form model: the shape the form edits, and the two pure
 * mappings between it and the API's `ContentItem`.
 *
 * Kept free of React so the rules that protect production data — above all the
 * read-merge-write of `meta` in `toPayload` — are unit-tested directly
 * (`form-model.test.ts`).
 */

/** Only used to show an editor a real URL; a missing value degrades to a
 *  relative path rather than to a broken absolute one. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL?.trim() || "").replace(/\/+$/, "");

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

export type LangCode = (typeof CMS_LANGS)[number]["code"];
export type Translated = Record<LangCode, string>;

const emptyTranslated = (): Translated => ({ en: "", ar: "", de: "", fr: "" });
const readTranslated = (v: Partial<Record<LangCode, string>> | undefined): Translated => ({
  en: v?.en ?? "",
  ar: v?.ar ?? "",
  de: v?.de ?? "",
  fr: v?.fr ?? "",
});

/** The `meta` keys this form exposes as their own inputs, beyond tag/result/points. */
export const META_TEXT_FIELDS = [
  "demoUrl", "repoUrl", "client", "year", "duration",
  "badge", "ctaLabel", "ctaUrl", "startsAt", "endsAt", "delaySeconds",
  "authorRole", "company", "rating", "sourceUrl",
] as const;
export type MetaTextField = (typeof META_TEXT_FIELDS)[number];

export interface FormState {
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

export const EMPTY_FORM: FormState = {
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

export function toForm(item: ContentItem): FormState {
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

export function toPayload(form: FormState) {
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

/** The singular noun used in the editor heading, the empty state and the add
 *  button: an explicit override, else "Question" for the FAQ, else the label
 *  with one trailing "s" dropped ("Projects" → "Project"). */
export function singularFor(label: string, override?: string): string {
  return override ?? (label === "FAQ" ? "Question" : label.replace(/s$/, ""));
}

/** The public page an item becomes, shown in the editor so the URL is never a
 *  guess. A blank slug shows a placeholder rather than a dangling `/`. */
export function sitePageUrl(section: "projects" | "services", slug: string, siteUrl = SITE_URL): string {
  return `${siteUrl}/${section}/${slug.trim() || "your-slug"}`;
}
