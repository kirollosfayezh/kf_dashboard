import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * `tailwind-merge` v2 predates Tailwind 4 and knows none of our theme keys, so
 * out of the box it misclassifies them — and the failure is silent.
 *
 * Measured against the installed version before this config existed:
 *
 *   cn("text-label text-muted")     -> "text-muted"        font size destroyed
 *   cn("rounded-card rounded-full") -> both kept           override ignored
 *   cn("shadow-card shadow-none")   -> both kept           override ignored
 *
 * The first is the dangerous one: twMerge reads `text-label` as a text *colour*
 * and drops it, so any component that sets its own size loses it the moment a
 * caller passes any `text-*` class. Teaching it our groups fixes all three
 * without upgrading the dependency.
 *
 * Every new `--text-*`, `--radius-*` or `--shadow-*` token added to styles.css
 * must be listed here too, or it inherits the same silent bug. `utils.test.ts`
 * guards the known cases.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display", "title", "section", "body", "ui", "caption", "label"] },
      ],
      rounded: [{ rounded: ["xs", "control", "card"] }],
      shadow: [{ shadow: ["card", "overlay"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string | undefined | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
