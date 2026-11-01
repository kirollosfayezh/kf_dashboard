import { describe, expect, it } from "vitest";
import { cn, initials, mediaPreviewUrl, SITE_ORIGIN } from "./utils";

/**
 * Guards the `extendTailwindMerge` config in `utils.ts`.
 *
 * Without it, `tailwind-merge` v2 classifies our Tailwind 4 theme keys as
 * colours and silently drops font sizes, while failing to dedupe radius and
 * shadow overrides. Neither failure is visible in code review — the class list
 * simply comes out wrong at runtime.
 */
describe("cn", () => {
  it("keeps a custom font size alongside a colour", () => {
    // The regression: twMerge used to read `text-label` as a colour and drop it.
    expect(cn("text-label text-muted")).toBe("text-label text-muted");
  });

  it("lets one custom font size override another", () => {
    expect(cn("text-label text-body")).toBe("text-body");
  });

  it("lets a core font size override a custom one, and the reverse", () => {
    expect(cn("text-body text-xs")).toBe("text-xs");
    expect(cn("text-xs text-body")).toBe("text-body");
  });

  it("dedupes custom radii against core ones in both directions", () => {
    expect(cn("rounded-card rounded-full")).toBe("rounded-full");
    expect(cn("rounded-2xl rounded-card")).toBe("rounded-card");
    expect(cn("rounded-control rounded-xs")).toBe("rounded-xs");
  });

  it("dedupes custom shadows", () => {
    expect(cn("shadow-card shadow-none")).toBe("shadow-none");
    expect(cn("shadow-overlay shadow-card")).toBe("shadow-card");
  });

  it("still dedupes ordinary utilities", () => {
    expect(cn("p-4 p-5")).toBe("p-5");
    expect(cn("bg-panel bg-raised")).toBe("bg-raised");
  });
});

describe("initials", () => {
  it("takes the first letter of the first two words, upper-cased", () => {
    expect(initials("kirollos fayez")).toBe("KF");
    expect(initials("Mona  Adel Hassan")).toBe("MA");
  });

  it("falls back to ? for a missing name", () => {
    expect(initials("")).toBe("?");
    expect(initials(null)).toBe("?");
    expect(initials(undefined)).toBe("?");
  });
});

describe("mediaPreviewUrl", () => {
  it("resolves a site-relative path against the public site", () => {
    expect(mediaPreviewUrl("/projects/gentrack.webp")).toBe(`${SITE_ORIGIN}/projects/gentrack.webp`);
  });

  it("leaves absolute and protocol-relative URLs alone", () => {
    expect(mediaPreviewUrl("https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
    expect(mediaPreviewUrl("//cdn.example.com/a.png")).toBe("//cdn.example.com/a.png");
  });
});
