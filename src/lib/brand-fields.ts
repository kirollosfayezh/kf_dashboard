import type { BrandIdentity, BrandNames } from "@/services/domain-types";

/**
 * Pure helpers behind the "Brand identity" card on the settings screen.
 *
 * The card edits lists in textareas, one entry per line. Nothing here trims,
 * dedupes or validates: the server's `normalizeBrand` does that on save, and
 * doing it on every keystroke would eat the newline an editor just typed.
 */

export const EMPTY_BRAND_NAMES: BrandNames = { en: [], ar: [], de: [], fr: [] };

export function emptyBrand(): BrandIdentity {
  return {
    alternateNames: { ...EMPTY_BRAND_NAMES },
    foundingDate: "",
    founderProfiles: [],
    profiles: [],
    notAffiliatedWith: [],
  };
}

/** A settings document saved before the block existed has no `brand`, and one
 *  saved by an older server may miss a language — fill the gaps so the form
 *  never reads a field of `undefined`. */
export function toBrand(brand: Partial<BrandIdentity> | null | undefined): BrandIdentity {
  const base = emptyBrand();
  if (!brand) return base;
  return {
    alternateNames: { ...base.alternateNames, ...(brand.alternateNames ?? {}) },
    foundingDate: brand.foundingDate ?? base.foundingDate,
    founderProfiles: brand.founderProfiles ?? base.founderProfiles,
    profiles: brand.profiles ?? base.profiles,
    notAffiliatedWith: brand.notAffiliatedWith ?? base.notAffiliatedWith,
  };
}

/** The stored list as the textarea shows it. */
export function linesToText(lines: readonly string[] | null | undefined): string {
  return (lines ?? []).join("\n");
}

/** The textarea's value as the list the document stores. A trailing newline
 *  becomes a trailing blank entry on purpose — it is what keeps the caret on
 *  the new line while the editor types the next one. */
export function textToLines(text: string): string[] {
  return text.split("\n");
}

/** Whether a list holds anything the server would keep. */
export function hasEntries(lines: readonly string[] | null | undefined): boolean {
  return (lines ?? []).some((line) => line.trim().length > 0);
}
