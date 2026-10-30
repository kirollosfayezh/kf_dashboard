import type { FormEvent } from "react";
import { MediaPicker } from "@/components/MediaPicker";
import type { ContentCollection } from "@/services/domain-types";
import { Field, Input, Textarea, Toggle } from "@/components/ui";
import { CMS_LANGS, type FormState, type LangCode, type MetaTextField } from "./form-model";
import { ProjectFields, PromoFields, ServicePageNote, TestimonialFields } from "./CollectionFields";

/** The `id` the Drawer's footer Save button submits by (`form="…"`). */
export const CONTENT_FORM_ID = "kf-content-form";

export function ContentEditorForm({
  collection,
  form,
  setForm,
  setLink,
  activeLang,
  setActiveLang,
  onSubmit,
}: {
  collection: ContentCollection;
  form: FormState;
  setForm: (next: FormState) => void;
  setLink: (key: MetaTextField, value: string) => void;
  activeLang: LangCode;
  setActiveLang: (lang: LangCode) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <form id={CONTENT_FORM_ID} onSubmit={onSubmit}>
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

      <LanguageFields key={activeLang} form={form} setForm={setForm} lang={activeLang} />

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

      {collection === "promos" ? <PromoFields form={form} setLink={setLink} /> : null}
      {collection === "testimonials" ? <TestimonialFields form={form} setLink={setLink} /> : null}
      {collection === "projects" ? <ProjectFields form={form} setForm={setForm} setLink={setLink} /> : null}
      {collection === "services" ? <ServicePageNote slug={form.slug} /> : null}

      <label className="flex items-center gap-2.5 text-ui font-medium">
        <Toggle
          checked={form.published}
          onChange={() => setForm({ ...form, published: !form.published })}
          label="Published"
        />
        Published
      </label>
    </form>
  );
}

/** Title, summary and body for one language. Keyed by language so switching
 *  tabs remounts the inputs rather than reusing them across scripts. */
function LanguageFields({
  form,
  setForm,
  lang,
}: {
  form: FormState;
  setForm: (next: FormState) => void;
  lang: LangCode;
}) {
  const l = CMS_LANGS.find((x) => x.code === lang) ?? CMS_LANGS[0];
  const set = (key: "title" | "summary" | "body", value: string) =>
    setForm({ ...form, [key]: { ...form[key], [l.code]: value } });
  return (
    <div>
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
}
