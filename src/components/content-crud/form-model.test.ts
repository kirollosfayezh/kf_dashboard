import { describe, expect, it } from "vitest";
import type { ContentItem } from "@/services/domain-types";
import { EMPTY_FORM, singularFor, sitePageUrl, toForm, toPayload, type FormState } from "./form-model";

/** A project as the seeder writes it: localized text in two languages and a
 *  `meta` bag with keys the form does not expose (`alt`, `seedMedia`). */
const seeded = (): ContentItem => ({
  id: "p1",
  slug: "gentrack",
  published: true,
  order: 2,
  title: { en: "GenTrack", ar: "جين تراك" },
  summary: { en: "Fleet tracking", ar: "" },
  media: ["/projects/gentrack.webp"],
  meta: {
    tag: "Logistics",
    result: "30% faster dispatch",
    points: ["React", "Node.js"],
    alt: "Map with vehicles",
    seedMedia: ["/projects/gentrack.webp"],
    demoUrl: "https://demo.example.com",
    rating: 5,
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const form = (overrides: Partial<FormState> = {}): FormState => ({ ...EMPTY_FORM, ...overrides });

describe("toForm", () => {
  it("fills every language, defaulting missing ones to empty strings", () => {
    const f = toForm(seeded());
    expect(f.title).toEqual({ en: "GenTrack", ar: "جين تراك", de: "", fr: "" });
    expect(f.body).toEqual({ en: "", ar: "", de: "", fr: "" });
  });

  it("lifts tag, result and points out of meta, points one per line", () => {
    const f = toForm(seeded());
    expect(f.tag).toBe("Logistics");
    expect(f.result).toBe("30% faster dispatch");
    expect(f.points).toBe("React\nNode.js");
  });

  it("drops non-string points and ignores non-string tag/result", () => {
    const item = seeded();
    item.meta = { tag: 7, result: { x: 1 }, points: ["React", 3, null, "Go"] };
    const f = toForm(item);
    expect(f.tag).toBe("");
    expect(f.result).toBe("");
    expect(f.points).toBe("React\nGo");
  });

  it("stringifies a numeric rating for the input and blanks unknown fields", () => {
    const f = toForm(seeded());
    expect(f.links.rating).toBe("5");
    expect(f.links.demoUrl).toBe("https://demo.example.com");
    expect(f.links.repoUrl).toBe("");
  });

  it("carries the whole meta bag so a save can preserve it", () => {
    expect(toForm(seeded()).meta).toEqual(seeded().meta);
  });

  it("handles an item with no meta or media", () => {
    const item = seeded();
    delete item.meta;
    delete item.media;
    const f = toForm(item);
    expect(f.meta).toEqual({});
    expect(f.media).toEqual([]);
    expect(f.points).toBe("");
  });
});

describe("toPayload", () => {
  // The regression that matters: the API $sets `meta` wholesale on PATCH, so
  // any key the form forgets to send is deleted from production.
  it("keeps seeded meta keys the form does not expose (read-merge-write)", () => {
    const payload = toPayload(toForm(seeded()));
    expect(payload.meta).toMatchObject({
      tag: "Logistics",
      result: "30% faster dispatch",
      points: ["React", "Node.js"],
      alt: "Map with vehicles",
      seedMedia: ["/projects/gentrack.webp"],
      demoUrl: "https://demo.example.com",
      rating: 5,
    });
  });

  it("round-trips an untouched item without changing its content", () => {
    const item = seeded();
    const payload = toPayload(toForm(item));
    expect(payload).toEqual({
      slug: item.slug,
      published: item.published,
      order: item.order,
      title: { en: "GenTrack", ar: "جين تراك", de: "", fr: "" },
      summary: { en: "Fleet tracking", ar: "", de: "", fr: "" },
      body: { en: "", ar: "", de: "", fr: "" },
      media: item.media,
      meta: item.meta,
    });
  });

  it("removes a key when its input is cleared instead of storing an empty string", () => {
    const f = toForm(seeded());
    const payload = toPayload({ ...f, tag: "  ", result: "", links: { ...f.links, demoUrl: " " } });
    expect(payload.meta).not.toHaveProperty("tag");
    expect(payload.meta).not.toHaveProperty("result");
    expect(payload.meta).not.toHaveProperty("demoUrl");
    expect(payload.meta.alt).toBe("Map with vehicles");
  });

  it("trims text fields and splits points on lines, dropping blanks", () => {
    const payload = toPayload(
      form({
        slug: "  my-slug ",
        tag: " Web ",
        points: " React \n\n  Node.js\n ",
        links: { ...EMPTY_FORM.links, ctaUrl: " /contact " },
      }),
    );
    expect(payload.slug).toBe("my-slug");
    expect(payload.meta).toMatchObject({ tag: "Web", points: ["React", "Node.js"], ctaUrl: "/contact" });
  });

  it("always sends points, as an empty list when there are none", () => {
    expect(toPayload(form()).meta).toEqual({ points: [] });
  });

  it.each([
    ["4", 4],
    ["4.6", 5],
    ["1", 1],
  ])("stores rating %s as the number %d", (input, expected) => {
    const payload = toPayload(form({ links: { ...EMPTY_FORM.links, rating: input } }));
    expect(payload.meta.rating).toBe(expected);
  });

  it.each(["0", "6", "abc"])("drops an out-of-range rating %s", (input) => {
    const payload = toPayload(form({ links: { ...EMPTY_FORM.links, rating: input } }));
    expect(payload.meta).not.toHaveProperty("rating");
  });

  it("writes sample only when it is exactly true", () => {
    expect(toPayload(form({ meta: { sample: true } })).meta.sample).toBe(true);
    expect(toPayload(form({ meta: { sample: false } })).meta).not.toHaveProperty("sample");
    expect(toPayload(form({ meta: { sample: "true" } })).meta).not.toHaveProperty("sample");
  });

  it("coerces a non-numeric order to 0", () => {
    expect(toPayload(form({ order: Number.NaN })).order).toBe(0);
    expect(toPayload(form({ order: 3 })).order).toBe(3);
  });

  it("does not mutate the form it was given", () => {
    const f = toForm(seeded());
    const before = structuredClone(f);
    toPayload({ ...f, tag: "" });
    expect(f).toEqual(before);
  });
});

describe("singularFor", () => {
  it("prefers an explicit override", () => {
    expect(singularFor("FAQ", "Answer")).toBe("Answer");
  });

  it("names the FAQ entries questions", () => {
    expect(singularFor("FAQ")).toBe("Question");
  });

  it("drops one trailing s", () => {
    expect(singularFor("Projects")).toBe("Project");
    expect(singularFor("Legal")).toBe("Legal");
  });
});

describe("sitePageUrl", () => {
  it("joins the site origin, section and trimmed slug", () => {
    expect(sitePageUrl("projects", " gentrack ", "https://kf.example")).toBe("https://kf.example/projects/gentrack");
  });

  it("shows a placeholder for a blank slug", () => {
    expect(sitePageUrl("services", "  ", "https://kf.example")).toBe("https://kf.example/services/your-slug");
  });

  it("degrades to a site-relative path without an origin", () => {
    expect(sitePageUrl("services", "web-apps", "")).toBe("/services/web-apps");
  });
});
