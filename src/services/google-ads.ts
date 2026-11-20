import { api, SERVER_ORIGIN } from "./http";

/**
 * Google Ads: what an ad click carries, and the account's Search terms report.
 *
 * Two different things, easy to confuse:
 *  - the KEYWORD is yours — the one you bid on that matched. Google puts it on
 *    the landing URL when the Final URL suffix below is set, so the site knows
 *    it for each visitor;
 *  - the SEARCH TERM is what the person actually typed. Google never sends it
 *    to a website; it exists only in the account's Search terms report. The
 *    script below runs inside Google Ads and uploads that report once a day.
 * Negative keywords are picked from search terms, not from keywords.
 */

export type AdMatchType = "exact" | "phrase" | "broad";
/** added = already one of your keywords; excluded = already a negative. */
export type AdTermStatus = "added" | "excluded" | "added_excluded" | "none";

export interface AdsAccount {
  id?: string;
  name?: string;
  currency?: string;
  timezone?: string;
}

/** Shape of `GET /api/admin/analytics/search-terms?days=` — mirrors the backend contract. */
export interface SearchTermRow {
  term: string;
  keyword: string;
  matchType?: AdMatchType;
  campaign: string;
  adGroup: string;
  status: AdTermStatus;
  impressions: number;
  clicks: number;
  /** In the account currency. */
  cost: number;
  conversions: number;
}

export interface SearchTermsReport {
  range: { from: string; to: string; days: number };
  synced: boolean;
  lastSyncAt?: string;
  account?: AdsAccount;
  totals: { terms: number; impressions: number; clicks: number; cost: number; conversions: number };
  rows: SearchTermRow[];
}

export interface AdsSetup {
  key: string;
  lastSyncAt?: string;
  lastRows?: number;
  account?: AdsAccount;
}

export function fetchSearchTerms(days: number) {
  return api.get<SearchTermsReport>(`/admin/analytics/search-terms?days=${days}`);
}

export function fetchAdsSetup() {
  return api.get<AdsSetup>("/admin/analytics/google-ads/setup");
}

export function rotateAdsKey() {
  return api.post<AdsSetup>("/admin/analytics/google-ads/setup/rotate", {});
}

/**
 * Goes in Google Ads → Admin → Account settings → Tracking → Final URL suffix.
 * Google fills in each {placeholder} at click time; the site reads the result.
 */
export const ADS_URL_SUFFIX =
  "utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_term={keyword}&utm_content={adgroupid}&kf_mt={matchtype}&kf_net={network}&kf_ad={creative}";

export const MATCH_LABEL: Record<string, string> = { exact: "Exact", phrase: "Phrase", broad: "Broad" };

/** Google's `{network}` codes, in words. An unknown code is shown as it came. */
export const NETWORK_LABEL: Record<string, string> = {
  g: "Google Search",
  s: "Search partners",
  d: "Display",
  ytv: "YouTube",
  vp: "Video partners",
  gtv: "Google TV",
  x: "Performance Max",
};

/** Where the script posts. The API's own address, which the dashboard already knows. */
export const ADS_SYNC_ENDPOINT = `${SERVER_ORIGIN}/api/integrations/google-ads/sync`;

/**
 * The Google Ads script, ready to paste, with this dashboard's address and key
 * already in it. It reads the last 30 days of the Search terms report (Google
 * keeps revising recent days, so every run re-sends them and the server
 * overwrites) and uploads it in small requests.
 *
 * Plain ES5 on purpose: it runs in Google's script editor, not in a browser.
 */
export function adsScript(endpoint: string, key: string): string {
  return `/**
 * KF Tech Solutions dashboard: search terms sync.
 *
 * Sends this account's Search terms report (what people typed before they
 * clicked your ads) to your dashboard. It only READS reports. It never
 * changes a campaign, a keyword, a bid or a budget.
 *
 * Setup: Google Ads > Tools > Bulk actions > Scripts > "+" > New script,
 * paste this over what is there, Save, Authorise, Run once, then set
 * Frequency to Daily.
 */
var ENDPOINT = ${JSON.stringify(endpoint)};
var KEY = ${JSON.stringify(key)};
var DAYS = 30;
var CHUNK = 150;

function main() {
  var account = AdsApp.currentAccount();
  var tz = account.getTimeZone();
  var now = new Date();
  var from = Utilities.formatDate(new Date(now.getTime() - (DAYS - 1) * 86400000), tz, 'yyyy-MM-dd');
  var to = Utilities.formatDate(now, tz, 'yyyy-MM-dd');

  var data = readTerms(from, to, true);
  if (!data) data = readTerms(from, to, false);

  var info = { id: account.getCustomerId(), name: account.getName(), currency: account.getCurrencyCode(), timezone: tz };
  for (var i = 0; i < data.rows.length; i += CHUNK) {
    send({ account: info, rows: data.rows.slice(i, i + CHUNK) });
  }
  var campaigns = toList(data.campaigns);
  var adGroups = toList(data.adGroups);
  var names = Math.max(campaigns.length, adGroups.length);
  for (var n = 0; n < names; n += 300) {
    send({ campaigns: campaigns.slice(n, n + 300), adGroups: adGroups.slice(n, n + 300), rows: [] });
  }
  send({ account: info, rows: [], done: true, totalRows: data.rows.length });
  Logger.log('Sent ' + data.rows.length + ' search-term rows (' + from + ' to ' + to + ') to the dashboard.');
}

/** withKeyword = also ask which of your keywords each term matched. */
function readTerms(from, to, withKeyword) {
  var fields = [
    'search_term_view.search_term', 'search_term_view.status', 'segments.date',
    'campaign.id', 'campaign.name', 'ad_group.id', 'ad_group.name',
    'metrics.impressions', 'metrics.clicks', 'metrics.cost_micros', 'metrics.conversions'
  ];
  if (withKeyword) fields.push('segments.keyword.info.text', 'segments.keyword.info.match_type');
  var query = 'SELECT ' + fields.join(', ') + ' FROM search_term_view' +
    " WHERE segments.date BETWEEN '" + from + "' AND '" + to + "'";
  var out = { rows: [], campaigns: {}, adGroups: {} };
  try {
    var it = AdsApp.search(query);
    while (it.hasNext()) {
      var r = it.next();
      var kw = (r.segments && r.segments.keyword && r.segments.keyword.info) || {};
      out.campaigns[r.campaign.id] = r.campaign.name;
      out.adGroups[r.adGroup.id] = r.adGroup.name;
      out.rows.push({
        day: r.segments.date,
        campaignId: String(r.campaign.id),
        adGroupId: String(r.adGroup.id),
        term: r.searchTermView.searchTerm,
        keyword: kw.text || '',
        matchType: kw.matchType || '',
        status: r.searchTermView.status || 'NONE',
        impressions: r.metrics.impressions || 0,
        clicks: r.metrics.clicks || 0,
        costMicros: r.metrics.costMicros || 0,
        conversions: r.metrics.conversions || 0
      });
    }
  } catch (e) {
    if (!withKeyword) throw e;
    Logger.log('Keyword details not available (' + e + '). Reading search terms without them.');
    return null;
  }
  return out;
}

function toList(map) {
  var list = [];
  for (var id in map) list.push({ id: String(id), name: map[id] });
  return list;
}

/** Posts one request; waits and retries, because the server may be waking up. */
function send(body) {
  var last = '';
  for (var attempt = 1; attempt <= 4; attempt++) {
    try {
      var res = UrlFetchApp.fetch(ENDPOINT, {
        method: 'post',
        contentType: 'application/json',
        headers: { 'x-kf-key': KEY },
        payload: JSON.stringify(body),
        muteHttpExceptions: true
      });
      var code = res.getResponseCode();
      if (code === 200) return;
      last = 'HTTP ' + code + ' ' + res.getContentText().slice(0, 200);
      if (code === 401) throw new Error('The dashboard did not accept the key. Copy the script again from the dashboard. ' + last);
      if (code < 500 && code !== 429) break;
    } catch (e) {
      last = String(e);
      if (last.indexOf('did not accept the key') !== -1) throw e;
    }
    if (attempt < 4) Utilities.sleep(attempt * 8000);
  }
  throw new Error('Could not reach the dashboard: ' + last);
}
`;
}

/**
 * Terms as Google Ads' negative-keyword box wants them: one per line,
 * `[exact]` or `"phrase"`. Characters Google rejects in a keyword are dropped.
 */
export function negativeList(terms: string[], match: "exact" | "phrase"): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const raw of terms) {
    const t = raw
      .replace(/[[\]"!@%^*()={};~`<>?\\|,]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    lines.push(match === "exact" ? `[${t}]` : `"${t}"`);
  }
  return lines.join("\n");
}

/** How far the Final URL suffix has got, judged from what recent ad visitors actually carried. */
export type SuffixState = "none" | "basic" | "full";
export function suffixState(ads: { visitors: number; keywords: { key: string }[]; campaigns: { key: string }[]; matchTypes?: { key: string }[]; networks?: { key: string }[] }): SuffixState {
  const tagged = [...ads.keywords, ...ads.campaigns].some((k) => k.key !== "(not tagged)");
  if (ads.matchTypes?.length || ads.networks?.length) return "full";
  return tagged ? "basic" : "none";
}

/** 1234.5 → "EGP 1,234.50" when the account currency is known. */
export function money(amount: number, currency?: string): string {
  if (currency) {
    try {
      return new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "code", maximumFractionDigits: 2 }).format(amount);
    } catch {
      /* an unknown code: fall through to a plain number */
    }
  }
  return amount.toLocaleString("en", { maximumFractionDigits: 2 });
}
