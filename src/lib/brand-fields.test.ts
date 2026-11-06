import { describe, expect, it } from "vitest";
import { emptyBrand, hasEntries, linesToText, textToLines, toBrand } from "./brand-fields";

describe("textToLines / linesToText", () => {
  it("round-trips a list through the textarea", () => {
    const lines = ["KF Tech", "KFTech", "KFTech Solutions"];
    expect(textToLines(linesToText(lines))).toEqual(lines);
  });

  it("keeps a newline the editor just typed", () => {
    // Trimming here would swallow the caret's new line on every keystroke.
    expect(textToLines("KF Tech\n")).toEqual(["KF Tech", ""]);
    expect(linesToText(["KF Tech", ""])).toBe("KF Tech\n");
  });

  it("keeps blank and padded lines for the server to drop", () => {
    expect(textToLines("a\n\n  b  ")).toEqual(["a", "", "  b  "]);
  });

  it("shows a missing list as an empty textarea", () => {
    expect(linesToText(undefined)).toBe("");
    expect(linesToText(null)).toBe("");
    expect(linesToText([])).toBe("");
  });
});

describe("hasEntries", () => {
  it("ignores whitespace-only lines", () => {
    expect(hasEntries(["", "  "])).toBe(false);
    expect(hasEntries(["", "KF Tech"])).toBe(true);
    expect(hasEntries(undefined)).toBe(false);
  });
});

describe("toBrand", () => {
  it("returns the empty shape for a document without the block", () => {
    expect(toBrand(undefined)).toEqual(emptyBrand());
    expect(toBrand(null)).toEqual(emptyBrand());
  });

  it("fills a missing language and missing lists without touching set ones", () => {
    const brand = toBrand({
      alternateNames: { en: ["KFTech"] } as never,
      foundingDate: "2020",
    });
    expect(brand.alternateNames).toEqual({ en: ["KFTech"], ar: [], de: [], fr: [] });
    expect(brand.foundingDate).toBe("2020");
    expect(brand.founderProfiles).toEqual([]);
    expect(brand.profiles).toEqual([]);
    expect(brand.notAffiliatedWith).toEqual([]);
  });

  it("keeps a complete block as is", () => {
    const full = {
      alternateNames: { en: ["KF Tech"], ar: ["كي إف تك"], de: [], fr: [] },
      foundingDate: "2020",
      founderProfiles: ["https://github.com/kirollosfayezh"],
      profiles: ["https://www.snapchat.com/add/kftechsolutions"],
      notAffiliatedWith: [{ name: "KFTECH Software Solutions", url: "https://kftechsols.com" }],
    };
    expect(toBrand(full)).toEqual(full);
  });

  it("gives every call its own empty arrays", () => {
    const a = emptyBrand();
    a.profiles.push("x");
    expect(emptyBrand().profiles).toEqual([]);
    expect(emptyBrand().alternateNames.en).toEqual([]);
  });
});
