import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ago, contactName, flagOf, money, moneyByCurrency, whatsappLink } from "./crm";

describe("flagOf", () => {
  it("turns an ISO country code into its regional-indicator pair", () => {
    expect(flagOf("EG")).toBe("\u{1F1EA}\u{1F1EC}");
  });

  it.each([undefined, "", "eg", "EGY", "E1"])("returns nothing for %s", (code) => {
    expect(flagOf(code)).toBe("");
  });
});

describe("money", () => {
  it("formats whole units in the given currency", () => {
    expect(money(4500, "USD")).toBe("$4,500");
    expect(money(1234.6, "USD")).toBe("$1,235");
  });

  it("shows a dash for a missing value", () => {
    expect(money(undefined)).toBe("—");
    expect(money(Number.NaN)).toBe("—");
  });

  it("falls back to a plain amount for an invalid currency code", () => {
    expect(money(12000, "NOT-A-CURRENCY")).toBe("12,000 NOT-A-CURRENCY");
  });
});

describe("moneyByCurrency", () => {
  it("keeps totals per currency and never adds across them", () => {
    expect(moneyByCurrency({ USD: 100, EUR: 0, GBP: 50 })).toBe("$100 + £50");
  });

  it("shows a dash when nothing is positive", () => {
    expect(moneyByCurrency({})).toBe("—");
    expect(moneyByCurrency({ USD: 0 })).toBe("—");
  });
});

describe("ago", () => {
  const NOW = new Date("2026-06-15T12:00:00Z").getTime();
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    [NOW - 20_000, "now"],
    [NOW - 14 * 60_000, "14m ago"],
    [NOW - 2 * 3_600_000, "2h ago"],
    [NOW - 4 * 86_400_000, "4d ago"],
    [NOW + 60_000, "soon"],
  ])("formats %d as %s", (t, expected) => {
    expect(ago(t)).toBe(expected);
  });

  it("accepts ISO strings and rejects garbage", () => {
    expect(ago(new Date(NOW - 3 * 60_000).toISOString())).toBe("3m ago");
    expect(ago("not a date")).toBe("—");
    expect(ago(undefined)).toBe("—");
  });
});

describe("whatsappLink", () => {
  it("strips formatting from the number and encodes the message", () => {
    expect(whatsappLink("+20 (100) 123-4567", "Hi & welcome")).toBe(
      "https://wa.me/201001234567?text=Hi%20%26%20welcome",
    );
    expect(whatsappLink("+201001234567")).toBe("https://wa.me/201001234567");
  });
});

describe("contactName", () => {
  it("prefers the name, then a phone, then an email", () => {
    expect(contactName({ name: "  Mona  ", phones: ["+20"] })).toBe("Mona");
    expect(contactName({ name: " ", phones: ["+20100"], emails: ["a@b.c"] })).toBe("+20100");
    expect(contactName({ emails: ["a@b.c"] })).toBe("a@b.c");
    expect(contactName({})).toBe("Unnamed contact");
  });
});
