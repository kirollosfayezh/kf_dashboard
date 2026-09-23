import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Check,
  CircleAlert,
  CircleCheck,
  Copy,
  ExternalLink,
  Info,
} from "lucide-react";
import { api } from "@/services/http";
import type { SiteSettings, TrackingSettings } from "@/services/domain-types";
import {
  Button,
  Card,
  ErrorBanner,
  GradientButton,
  Input,
  SectionHead,
  Spinner,
  Toggle,
} from "@/components/ui";

export const Route = createFileRoute("/marketing")({ component: MarketingPage });

/**
 * Analytics and ad tags for the public site.
 *
 * Split out of Site settings, where these four fields sat between the brand
 * palette and the contact email — a place nobody looks for a tracking id, and
 * with none of the context needed to paste the right one. Each field here says
 * where its value comes from, checks the format as you type, and the screen
 * warns about the one mistake that actually costs money: configuring a platform
 * both in Tag Manager and directly, which loads the pixel twice and counts every
 * conversion twice.
 *
 * Changes reach visitors on their next page load — the site reads these from the
 * public settings endpoint at runtime, so there is no redeploy and no developer
 * in the loop. Allow a minute or two before checking with a pixel helper.
 */

type FieldKey =
  | "gtmId"
  | "googleAnalyticsId"
  | "googleAdsId"
  | "googleAdsLabel"
  | "metaPixelId"
  | "tiktokPixelId"
  | "snapchatPixelId";

interface FieldSpec {
  key: FieldKey;
  label: string;
  placeholder: string;
  /** Where the value is found, in the platform's own navigation. */
  where: string;
  pattern: RegExp;
  /** Said when the value does not match `pattern`. Describes the shape wanted. */
  shape: string;
  /** Platform this belongs to, for the Tag Manager conflict check. */
  platform: "google" | "meta" | "tiktok" | "snapchat";
  /** Excluded from the conflict check: a container id cannot conflict with itself. */
  container?: boolean;
}

const FIELDS: Record<string, FieldSpec[]> = {
  google: [
    {
      key: "gtmId",
      label: "Google Tag Manager container ID",
      placeholder: "GTM-ABC1234",
      where: "Tag Manager → the ID shown at the top of your workspace. This is the one to give your agency.",
      pattern: /^GTM-[A-Z0-9]{4,10}$/i,
      shape: "GTM- followed by 4–10 letters or digits",
      platform: "google",
      container: true,
    },
    {
      key: "googleAnalyticsId",
      label: "Google Analytics 4 Measurement ID",
      placeholder: "G-ABC1234567",
      where: "Google Analytics → Admin → Data Streams → your stream.",
      pattern: /^G-[A-Z0-9]{8,12}$/i,
      shape: "G- followed by 8–12 letters or digits",
      platform: "google",
    },
    {
      key: "googleAdsId",
      label: "Google Ads conversion ID",
      placeholder: "AW-123456789",
      where: "Google Ads → Goals → Conversions → your action → Tag setup.",
      pattern: /^AW-\d{9,12}$/i,
      shape: "AW- followed by 9–12 digits",
      platform: "google",
    },
    {
      key: "googleAdsLabel",
      label: "Google Ads conversion label",
      placeholder: "AbC-D_efG-h12_34-567",
      where: "The label shown next to the conversion ID above. Both are needed before a lead is reported to Google Ads.",
      pattern: /^[A-Za-z0-9_-]{8,}$/,
      shape: "at least 8 letters, digits, dashes or underscores",
      platform: "google",
    },
  ],
  meta: [
    {
      key: "metaPixelId",
      label: "Meta Pixel ID",
      placeholder: "123456789012345",
      where: "Meta Events Manager → Data sources → your pixel. Covers Facebook and Instagram.",
      pattern: /^\d{15,16}$/,
      shape: "15 or 16 digits",
      platform: "meta",
    },
  ],
  tiktok: [
    {
      key: "tiktokPixelId",
      label: "TikTok Pixel ID",
      placeholder: "CXXXXXXXXXXXXXXXXXXX",
      where: "TikTok Ads Manager → Assets → Events → Web Events → your pixel.",
      pattern: /^[A-Z0-9]{20}$/i,
      shape: "20 letters or digits",
      platform: "tiktok",
    },
  ],
  snapchat: [
    {
      key: "snapchatPixelId",
      label: "Snap Pixel ID",
      placeholder: "00000000-0000-0000-0000-000000000000",
      where: "Snapchat Ads Manager → Events Manager → your pixel.",
      pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      shape: "a 36-character ID with dashes",
      platform: "snapchat",
    },
  ],
};

/** The site's own events, as the visitor-facing actions they correspond to. */
const EVENTS: { key: string; label: string; hint: string; sends: string }[] = [
  {
    key: "pageview",
    label: "Page view",
    hint: "Every page a visitor opens, including moves between pages without a reload.",
    sends: "page_view · PageView",
  },
  {
    key: "lead",
    label: "Enquiry sent",
    hint: "The contact form or the campaign form was submitted. This is the one Google Ads counts as a conversion.",
    sends: "generate_lead · Lead · SubmitForm · SIGN_UP",
  },
  {
    key: "contact",
    label: "Contact opened",
    hint: "WhatsApp, email or the live chat was opened — interest, but not yet an enquiry.",
    sends: "contact · Contact",
  },
  {
    key: "cta",
    label: "Button clicked",
    hint: "Any other tracked call to action, such as “Start your project”. High volume; useful for funnels, noisy for reporting.",
    sends: "select_content · ClickButton",
  },
];

const TABS = [
  { id: "google", label: "Google" },
  { id: "meta", label: "Meta" },
  { id: "tiktok", label: "TikTok" },
  { id: "snapchat", label: "Snapchat" },
  { id: "events", label: "Events" },
  { id: "advanced", label: "Advanced" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const clean = (v: string | undefined) => (v ?? "").trim();

function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      title="Copy"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setDone(true);
          window.setTimeout(() => setDone(false), 1400);
        });
      }}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-xs border"
      style={{ borderColor: "var(--border)", color: done ? "#4ADE80" : "var(--text3)" }}
    >
      {done ? <Check size={14} /> : <Copy size={13} />}
    </button>
  );
}

function TrackingField({
  spec,
  value,
  onChange,
  conflict,
}: {
  spec: FieldSpec;
  value: string;
  onChange: (v: string) => void;
  conflict: boolean;
}) {
  const filled = clean(value).length > 0;
  const valid = filled && spec.pattern.test(clean(value));
  const id = `tracking-${spec.key}`;

  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-caption font-semibold text-muted">
          {spec.label}
        </label>
        {filled ? (
          <span
            className="flex items-center gap-1.5 text-caption"
            style={{ color: valid ? "#4ADE80" : "#FBBF24" }}
          >
            {valid ? <CircleCheck size={13} /> : <CircleAlert size={13} />}
            {valid ? "Looks right" : "Check this"}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Input
          id={id}
          className="font-mono"
          value={value}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
          placeholder={spec.placeholder}
          style={{
            borderColor: filled && !valid ? "rgba(251,191,36,.55)" : "var(--border)",
            background: "var(--field)",
            color: "var(--text)",
          }}
        />
        <CopyButton value={clean(value)} />
      </div>

      <div className="mt-1.5 text-caption text-faint">
        {spec.where}
      </div>

      {filled && !valid ? (
        <div className="mt-1.5 text-caption text-warning">
          Expected {spec.shape}. It will still be saved — double-check it against the platform before relying on it.
        </div>
      ) : null}

      {conflict ? (
        <div
          className="mt-2 flex items-start gap-2 rounded-control border px-3 py-2.5 text-caption"
          style={{ borderColor: "rgba(251,191,36,.4)", background: "rgba(251,191,36,.08)", color: "#FBBF24" }}
        >
          <AlertTriangle size={14} className="mt-[2px] shrink-0" />
          <span>
            Tag Manager is set up above. If this platform is also inside your container, remove it from one
            place — otherwise the pixel loads twice and every enquiry is counted twice.
          </span>
        </div>
      ) : null}
    </div>
  );
}

function MarketingPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [tracking, setTracking] = useState<TrackingSettings>({});
  const [saved, setSaved] = useState<string>("");
  const [tab, setTab] = useState<TabId>("google");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<SiteSettings>("/admin/settings");
        setSettings(data);
        setTracking(data.pixels ?? {});
        setSaved(JSON.stringify(data.pixels ?? {}));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load settings");
      }
    })();
  }, []);

  const dirty = useMemo(() => JSON.stringify(tracking) !== saved, [tracking, saved]);

  const set = (key: keyof TrackingSettings, value: unknown) =>
    setTracking((t) => ({ ...t, [key]: value }));

  const hasContainer = clean(tracking.gtmId).length > 0;
  const hasAnyTag = [
    tracking.gtmId,
    tracking.googleAnalyticsId,
    tracking.googleAdsId,
    tracking.metaPixelId,
    tracking.tiktokPixelId,
    tracking.snapchatPixelId,
  ].some((v) => clean(v as string).length > 0);

  /** Every platform that is configured directly, for the header summary. */
  const connected = useMemo(() => {
    const out: string[] = [];
    if (hasContainer) out.push("Tag Manager");
    if (clean(tracking.googleAnalyticsId)) out.push("Analytics 4");
    if (clean(tracking.googleAdsId)) out.push("Google Ads");
    if (clean(tracking.metaPixelId)) out.push("Meta");
    if (clean(tracking.tiktokPixelId)) out.push("TikTok");
    if (clean(tracking.snapchatPixelId)) out.push("Snapchat");
    return out;
  }, [tracking, hasContainer]);

  /** Problems worth surfacing before the editor leaves the screen. */
  const warnings = useMemo(() => {
    const out: string[] = [];
    if (hasContainer) {
      const direct = [
        clean(tracking.googleAnalyticsId) && "Analytics 4",
        clean(tracking.googleAdsId) && "Google Ads",
        clean(tracking.metaPixelId) && "Meta",
        clean(tracking.tiktokPixelId) && "TikTok",
        clean(tracking.snapchatPixelId) && "Snapchat",
      ].filter(Boolean) as string[];
      if (direct.length) {
        out.push(
          `${direct.join(", ")} ${direct.length === 1 ? "is" : "are"} set here as well as Tag Manager. While a container is configured the site ignores these, so nothing is double-counted — but clearing them removes the ambiguity.`,
        );
      }
    }
    const adsId = clean(tracking.googleAdsId);
    const adsLabel = clean(tracking.googleAdsLabel);
    if (adsId && !adsLabel) out.push("Google Ads has a conversion ID but no label. No conversion is reported until both are filled in.");
    if (adsLabel && !adsId) out.push("Google Ads has a label but no conversion ID. No conversion is reported until both are filled in.");
    if (tracking.consentMode && !hasAnyTag)
      out.push("Cookie consent is switched on but no tag is configured, so no bar is shown — there would be nothing to consent to.");
    if (!tracking.consentMode && hasAnyTag)
      out.push("Tags are live without asking for consent. That is your call, but visitors in the EU and UK are supposed to be asked before an advertising cookie is set.");
    if (tracking.events?.lead === false) out.push("“Enquiry sent” is switched off, so no conversion reaches any platform — including Google Ads.");
    return out;
  }, [tracking, hasContainer, hasAnyTag]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.patch<SiteSettings>("/admin/settings", { pixels: tracking });
      setSettings(updated);
      setTracking(updated.pixels ?? {});
      setSaved(JSON.stringify(updated.pixels ?? {}));
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 2600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="kf-scr">
        <SectionHead title="Marketing" subtitle="Analytics and ad tags for your public site." />
        {error ? <ErrorBanner message={error} /> : null}
        <div className="grid place-items-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    );
  }

  const platformFields = FIELDS[tab];

  return (
    <div className="kf-scr pb-24">
      <SectionHead
        title="Marketing"
        subtitle="Analytics and ad tags for your public site. No developer or redeploy needed — a change reaches visitors within a few minutes, so give it that long before checking with a pixel helper."
      />

      {error ? <ErrorBanner message={error} /> : null}

      {/* What is live right now, before any of the fields. */}
      <Card className="mb-4 bg-raised">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-ui font-semibold">
            {connected.length ? "Connected:" : "Nothing connected yet"}
          </span>
          {connected.map((name) => (
            <span
              key={name}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption"
              style={{ background: "rgba(34,197,94,.14)", color: "#4ADE80" }}
            >
              <CircleCheck size={12} />
              {name}
            </span>
          ))}
          {!connected.length ? (
            <span className="text-caption text-faint">
              Your site currently loads no third-party tracking and sets no advertising cookie.
            </span>
          ) : null}
        </div>

        {warnings.length ? (
          <div className="mt-3.5 flex flex-col gap-2">
            {warnings.map((w) => (
              <div
                key={w}
                className="flex items-start gap-2 rounded-control border px-3 py-2.5 text-caption"
                style={{ borderColor: "rgba(251,191,36,.4)", background: "rgba(251,191,36,.08)", color: "#FBBF24" }}
              >
                <AlertTriangle size={14} className="mt-[2px] shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      {/* Tabs. Horizontally scrollable rather than wrapped, so the row stays one
          line on a phone instead of becoming a six-item block. */}
      <div
        className="mb-4 flex gap-1 overflow-x-auto rounded-control border p-1 border-line bg-raised"
        role="tablist"
        aria-label="Marketing platform"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className="shrink-0 rounded-xs px-3.5 py-2 text-ui font-semibold"
            style={{
              background: tab === t.id ? "rgba(255,106,0,.14)" : "transparent",
              color: tab === t.id ? "var(--text)" : "var(--text2)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        {platformFields ? (
          <>
            {tab === "google" ? (
              <div
                className="mb-5 flex items-start gap-2 rounded-control border px-[14px] py-3 text-caption border-line bg-raised text-muted"
              >
                <Info size={14} className="mt-[2px] shrink-0 text-faint" />
                <span>
                  Using Tag Manager? Fill in the container ID and leave the rest of this tab — and the other
                  platform tabs — empty. Your site already publishes its events to the data layer, so the
                  container can pick them up with nothing further from you.
                </span>
              </div>
            ) : null}

            {platformFields.map((spec) => (
              <TrackingField
                key={spec.key}
                spec={spec}
                value={(tracking[spec.key] as string) ?? ""}
                onChange={(v) => set(spec.key, v)}
                conflict={!spec.container && hasContainer && clean(tracking[spec.key] as string).length > 0}
              />
            ))}
          </>
        ) : null}

        {tab === "events" ? (
          <>
            <p className="mb-4 text-ui leading-relaxed text-muted">
              Which of your site's actions are forwarded to the platforms above. Each one is also pushed to the
              data layer for Tag Manager under the name <code className="font-mono">kf_&lt;event&gt;</code>,
              whether it is switched on here or not.
            </p>
            {EVENTS.map((e) => {
              const on = tracking.events?.[e.key] !== false;
              return (
                <div
                  key={e.key}
                  className="mb-3 flex items-start justify-between gap-4 rounded-control border px-[14px] py-3 border-line"
                >
                  <div className="min-w-0">
                    <div className="text-ui font-semibold">{e.label}</div>
                    <div className="mt-1 text-caption leading-relaxed text-faint">
                      {e.hint}
                    </div>
                    <div className="font-mono mt-1.5 text-caption text-faint">
                      Sent as: {e.sends}
                    </div>
                  </div>
                  <Toggle
                    checked={on}
                    onChange={() => set("events", { ...(tracking.events ?? {}), [e.key]: !on })}
                    label={`Forward "${e.label}" to your marketing platforms`}
                  />
                </div>
              );
            })}
          </>
        ) : null}

        {tab === "advanced" ? (
          <>
            {[
              {
                key: "respectDnt" as const,
                label: "Respect “Do Not Track”",
                hint: "Load no marketing tags at all for visitors whose browser asks not to be tracked. Costs you a little data and is the safer default.",
                value: tracking.respectDnt !== false,
              },
              {
                key: "consentMode" as const,
                label: "Ask visitors for cookie consent",
                hint: "Shows an Accept/Decline bar on your site, and holds the Meta, TikTok and Snapchat pixels back until someone accepts. Google's tags still load but record nothing until then (Consent Mode v2). The bar only appears once at least one tag above is configured — there is nothing to ask about otherwise.",
                value: tracking.consentMode === true,
              },
              {
                key: "debug" as const,
                label: "Debug logging",
                hint: "Log every event to the browser console instead of guessing. Useful while setting up; turn it off afterwards.",
                value: tracking.debug === true,
              },
            ].map((row) => (
              <div
                key={row.key}
                className="mb-3 flex items-start justify-between gap-4 rounded-control border px-[14px] py-3 border-line"
              >
                <div className="min-w-0">
                  <div className="text-ui font-semibold">{row.label}</div>
                  <div className="mt-1 text-caption leading-relaxed text-faint">
                    {row.hint}
                  </div>
                </div>
                <Toggle checked={row.value} onChange={() => set(row.key, !row.value)} label={row.label} />
              </div>
            ))}

            <div
              className="mt-4 rounded-control border px-[14px] py-3 text-caption leading-relaxed border-line bg-raised text-faint"
            >
              There is deliberately no box for pasting raw script tags. Anything saved here runs on every
              visitor's browser, so a single mistyped tag could break the site or leak data — and a stolen
              dashboard login would become a way to attack your visitors. Use a Tag Manager container for
              anything not listed on these tabs; that is exactly what it is for.
            </div>
          </>
        ) : null}
      </Card>

      {/* Sticky save bar: the tabs make it easy to change something on one tab
          and navigate away from another without noticing. */}
      <div
        className="sticky bottom-0 z-10 -mx-1 mt-4 flex flex-wrap items-center gap-3 rounded-control border px-4 py-3"
        style={{
          borderColor: dirty ? "rgba(255,106,0,.45)" : "var(--border)",
          background: "var(--panel)",
        }}
      >
        <GradientButton onClick={() => void save()} disabled={saving || !dirty}>
          {saving ? "Saving…" : "Save changes"}
        </GradientButton>
        {dirty ? (
          <Button
            variant="ghost"
            onClick={() => {
              setTracking(JSON.parse(saved) as TrackingSettings);
            }}
          >
            Discard
          </Button>
        ) : null}
        <span className="text-caption" style={{ color: dirty ? "#FF9A4D" : "var(--text3)" }}>
          {justSaved ? (
            <span className="flex items-center gap-1.5 text-success">
              <Check size={14} /> Saved — live on your site within a few minutes
            </span>
          ) : dirty ? (
            "Unsaved changes"
          ) : (
            "All changes saved"
          )}
        </span>
        <a
          href="https://tagassistant.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1.5 text-caption text-faint"
        >
          Check with Tag Assistant <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
