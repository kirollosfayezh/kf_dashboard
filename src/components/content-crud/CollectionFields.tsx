import { Field, Input, Toggle } from "@/components/ui";
import { sitePageUrl, type FormState, type MetaTextField } from "./form-model";

/**
 * The editor sections that only one collection shows. Every other collection
 * would just carry empty keys, and the site reads each group from one kind of
 * item only. All of them write into `meta` (via `links`), never top-level
 * fields: the backend's schema silently drops unknown top-level keys.
 */

interface SectionProps {
  form: FormState;
  setLink: (key: MetaTextField, value: string) => void;
}

/** Offers only: the popup's badge, its button and when it runs. */
export function PromoFields({ form, setLink }: SectionProps) {
  return (
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
  );
}

/** Testimonials only: who said it and where it can be checked. */
export function TestimonialFields({ form, setLink }: SectionProps) {
  return (
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
  );
}

/** Projects only: links, credits, the sample flag and the case-study URL. */
export function ProjectFields({
  form,
  setForm,
  setLink,
}: SectionProps & { setForm: (next: FormState) => void }) {
  return (
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
          {sitePageUrl("projects", form.slug)}
        </span>
        <br />
        Built from the fields above — the body becomes the write-up. It goes live with
        the project itself, so nothing extra to publish.
      </div>
    </>
  );
}

/** Services only: where the landing page lives and how its body is used. */
export function ServicePageNote({ slug }: { slug: string }) {
  return (
    <div className="mb-4 rounded-control border px-[14px] py-3 text-caption border-line bg-raised text-faint">
      Landing page:{" "}
      <span className="font-mono text-muted">
        {sitePageUrl("services", slug)}
      </span>
      <br />
      Title and summary are the card on /services. The body is the full landing page in
      Markdown (## headings, lists, links); a &quot;## Frequently asked questions&quot; section
      with ### questions becomes FAQ data for Google. A language appears once its body is
      written. Redeploy the site after editing so search engines see the change.
    </div>
  );
}
