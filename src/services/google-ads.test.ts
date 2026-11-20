import { describe, expect, it } from "vitest";
import { ADS_URL_SUFFIX, adsScript, money, negativeList, suffixState } from "./google-ads";

describe("negativeList", () => {
  it("writes one term per line in Google Ads' match-type syntax", () => {
    expect(negativeList(["free pos software", "pos jobs"], "exact")).toBe("[free pos software]\n[pos jobs]");
    expect(negativeList(["free pos software"], "phrase")).toBe('"free pos software"');
  });

  it("drops duplicates, blanks and the characters Google rejects", () => {
    expect(negativeList(["  Free  POS ", "free pos", "", "what is [pos]?", "برنامج كاشير مجاني"], "exact")).toBe("[free pos]\n[what is pos]\n[برنامج كاشير مجاني]");
  });
});

describe("suffixState", () => {
  const base = { visitors: 3, keywords: [{ key: "(not tagged)" }], campaigns: [{ key: "(not tagged)" }] };
  it("is none while ad visitors arrive with no tags", () => {
    expect(suffixState(base)).toBe("none");
  });
  it("is basic once keywords arrive but not match type", () => {
    expect(suffixState({ ...base, keywords: [{ key: "pos system" }] })).toBe("basic");
  });
  it("is full once match type or network arrives", () => {
    expect(suffixState({ ...base, keywords: [{ key: "pos system" }], matchTypes: [{ key: "broad" }] })).toBe("full");
  });
});

describe("the Final URL suffix", () => {
  it("carries every tag the site reads, each as a Google placeholder", () => {
    const q = new URLSearchParams(ADS_URL_SUFFIX);
    expect(Object.fromEntries(q)).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "{campaignid}",
      utm_term: "{keyword}",
      utm_content: "{adgroupid}",
      kf_mt: "{matchtype}",
      kf_net: "{network}",
      kf_ad: "{creative}",
    });
  });
});

describe("money", () => {
  it("uses the account currency when known", () => {
    expect(money(1234.5, "EGP")).toMatch(/EGP\s?1,234\.50/);
    expect(money(12, undefined)).toBe("12");
    expect(money(12, "not-a-code")).toBe("12");
  });
});

/** Runs the generated script the way Google Ads would, against stand-ins for its globals. */
function runScript(opts: { rows: Record<string, unknown>[]; failKeywordQuery?: boolean; responses?: number[] }) {
  const sent: { url: string; key: string; body: Record<string, unknown> }[] = [];
  const queries: string[] = [];
  const logs: string[] = [];
  const responses = [...(opts.responses ?? [])];
  const AdsApp = {
    currentAccount: () => ({ getTimeZone: () => "Africa/Cairo", getCustomerId: () => "123-456-7890", getName: () => "KF Tech", getCurrencyCode: () => "EGP" }),
    search: (query: string) => {
      queries.push(query);
      if (opts.failKeywordQuery && query.includes("segments.keyword")) throw new Error("field not selectable");
      let i = 0;
      return { hasNext: () => i < opts.rows.length, next: () => opts.rows[i++] };
    },
  };
  const Utilities = { formatDate: (d: Date) => d.toISOString().slice(0, 10), sleep: () => {} };
  const UrlFetchApp = {
    fetch: (url: string, o: { headers: Record<string, string>; payload: string; method: string; contentType: string }) => {
      const code = responses.length ? responses.shift()! : 200;
      if (code === 200) sent.push({ url, key: o.headers["x-kf-key"], body: JSON.parse(o.payload) });
      return { getResponseCode: () => code, getContentText: () => (code === 200 ? "{}" : "nope") };
    },
  };
  const Logger = { log: (m: string) => logs.push(m) };
  const script = adsScript("https://api.example.dev/api/integrations/google-ads/sync", "kfads_test-key");
  new Function("AdsApp", "Utilities", "UrlFetchApp", "Logger", `${script}\nmain();`)(AdsApp, Utilities, UrlFetchApp, Logger);
  return { sent, queries, logs };
}

/** One row the way `AdsApp.search` returns it: camelCase, 64-bit numbers as strings. */
const adsRow = (term: string, n = 0) => ({
  searchTermView: { searchTerm: term, status: "NONE" },
  segments: { date: "2026-11-19", keyword: { info: { text: "pos system", matchType: "BROAD" } } },
  campaign: { id: "2199", name: "POS – Egypt" },
  adGroup: { id: "77", name: "POS generic" },
  metrics: { impressions: String(10 + n), clicks: "2", costMicros: "30000000", conversions: 0 },
});

describe("adsScript", () => {
  it("uploads the report in chunks, then the names, then a closing request", () => {
    const { sent, queries, logs } = runScript({ rows: Array.from({ length: 320 }, (_, i) => adsRow(`term ${i}`, i)) });
    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain("FROM search_term_view");
    expect(queries[0]).toMatch(/segments\.date BETWEEN '\d{4}-\d{2}-\d{2}' AND '\d{4}-\d{2}-\d{2}'/);

    expect(sent.every((s) => s.url === "https://api.example.dev/api/integrations/google-ads/sync" && s.key === "kfads_test-key")).toBe(true);
    // 320 rows → 150 + 150 + 20, one names request, one closing request.
    expect(sent.map((s) => (s.body.rows as unknown[]).length)).toEqual([150, 150, 20, 0, 0]);
    expect((sent[0].body.rows as Record<string, unknown>[])[0]).toEqual({
      day: "2026-11-19",
      campaignId: "2199",
      adGroupId: "77",
      term: "term 0",
      keyword: "pos system",
      matchType: "BROAD",
      status: "NONE",
      impressions: "10",
      clicks: "2",
      costMicros: "30000000",
      conversions: 0,
    });
    expect(sent[3].body.campaigns).toEqual([{ id: "2199", name: "POS – Egypt" }]);
    expect(sent[3].body.adGroups).toEqual([{ id: "77", name: "POS generic" }]);
    expect(sent[4].body).toMatchObject({ done: true, totalRows: 320, account: { id: "123-456-7890", currency: "EGP", timezone: "Africa/Cairo" } });
    expect(logs.at(-1)).toContain("Sent 320 search-term rows");
  });

  it("still marks the run done when the account has no search terms yet", () => {
    const { sent } = runScript({ rows: [] });
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toMatchObject({ done: true, totalRows: 0, rows: [] });
  });

  it("falls back to a query without keyword details if Google refuses them", () => {
    const row = { ...adsRow("pos"), segments: { date: "2026-11-19" } };
    const { sent, queries } = runScript({ rows: [row], failKeywordQuery: true });
    expect(queries).toHaveLength(2);
    expect(queries[1]).not.toContain("segments.keyword");
    expect((sent[0].body.rows as Record<string, unknown>[])[0]).toMatchObject({ term: "pos", keyword: "", matchType: "" });
  });

  it("retries while the server is waking up, and stops at once on a rejected key", () => {
    const woke = runScript({ rows: [adsRow("pos")], responses: [503, 503] });
    expect(woke.sent.map((s) => (s.body.rows as unknown[]).length)).toEqual([1, 0, 0]);
    expect(() => runScript({ rows: [adsRow("pos")], responses: [401] })).toThrow(/did not accept the key/);
    expect(() => runScript({ rows: [adsRow("pos")], responses: [500, 500, 500, 500] })).toThrow(/Could not reach the dashboard/);
  });

  it("embeds the address and key as safe string literals", () => {
    const script = adsScript('https://x.dev/"; evil();//', "k'ey");
    expect(script).toContain('var ENDPOINT = "https://x.dev/\\"; evil();//";');
    expect(script).toContain(`var KEY = "k'ey";`);
  });
});
