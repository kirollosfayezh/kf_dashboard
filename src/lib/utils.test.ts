import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cn } from "./utils";

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
    assert.equal(cn("text-label text-muted"), "text-label text-muted");
  });

  it("lets one custom font size override another", () => {
    assert.equal(cn("text-label text-body"), "text-body");
  });

  it("lets a core font size override a custom one, and the reverse", () => {
    assert.equal(cn("text-body text-xs"), "text-xs");
    assert.equal(cn("text-xs text-body"), "text-body");
  });

  it("dedupes custom radii against core ones in both directions", () => {
    assert.equal(cn("rounded-card rounded-full"), "rounded-full");
    assert.equal(cn("rounded-2xl rounded-card"), "rounded-card");
    assert.equal(cn("rounded-control rounded-xs"), "rounded-xs");
  });

  it("dedupes custom shadows", () => {
    assert.equal(cn("shadow-card shadow-none"), "shadow-none");
    assert.equal(cn("shadow-overlay shadow-card"), "shadow-card");
  });

  it("still dedupes ordinary utilities", () => {
    assert.equal(cn("p-4 p-5"), "p-5");
    assert.equal(cn("bg-panel bg-raised"), "bg-raised");
  });
});
