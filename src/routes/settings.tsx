import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/services/http";
import type { SiteSettings } from "@/services/domain-types";
import {
  Card,
  ErrorBanner,
  PanelHead,
  Field,
  GradientButton,
  Input,
  SectionHead,
  Spinner,
  Toggle,
} from "@/components/ui";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

const KNOWN_LANGUAGES = ["en", "ar", "de", "fr"];
const REAL_LANGUAGES = new Set(["en", "ar"]);

function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<SiteSettings>("/admin/settings");
        setSettings(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load settings");
      }
    })();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.patch<SiteSettings>("/admin/settings", settings);
      setSettings(updated);
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="kf-scr">
        <SectionHead title="Site settings" subtitle="Branding, languages, SEO and contact info." />
        {error ? <ErrorBanner message={error} /> : (
          <div className="grid place-items-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        )}
      </div>
    );
  }

  const languageRow = (code: string) => {
    const existing = settings.languages.find((l) => l.code === code);
    const enabled = existing?.enabled ?? false;
    const isReal = REAL_LANGUAGES.has(code);
    return (
      <div
        key={code}
        className="flex items-center gap-3 rounded-[10px] border px-3.5 py-3"
        style={{ borderColor: "var(--border)", background: "var(--panel2)", opacity: isReal ? 1 : 0.55 }}
      >
        <span className="font-mono w-6 text-[11.5px]" style={{ color: "#FF9A4D" }}>
          {code.toUpperCase()}
        </span>
        <span className="flex-1 text-[14px] font-semibold">{existing?.label ?? code.toUpperCase()}</span>
        {!isReal ? (
          <span
            className="font-mono rounded-full px-2 py-0.5 text-[10px]"
            style={{ background: "var(--hover)", color: "var(--text2)" }}
          >
            COMING SOON
          </span>
        ) : null}
        <Toggle
          on={enabled}
          disabled={!isReal}
          onClick={() => {
            const languages = KNOWN_LANGUAGES.map((c) => {
              const found = settings.languages.find((l) => l.code === c);
              if (c === code) {
                return { code: c, label: found?.label ?? c.toUpperCase(), enabled: !enabled };
              }
              return found ?? { code: c, label: c.toUpperCase(), enabled: false };
            });
            setSettings({ ...settings, languages });
          }}
        />
      </div>
    );
  };

  return (
    <div className="kf-scr">
      <SectionHead title="Site settings" subtitle="Branding, languages, SEO and contact info." />
      {error ? <ErrorBanner message={error} /> : null}
      {/* `min(100%, …)` keeps the tracks from overflowing a 375px viewport. */}
      <form onSubmit={save}>
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}
      >
        <Card>
          <PanelHead title="Branding" subtitle="Name, tagline, logo and the palette the site is built from." />
          <Field label="Site name">
            <Input value={settings.siteName} onChange={(e) => setSettings({ ...settings, siteName: e.target.value })} />
          </Field>
          <Field label="Tagline (EN)">
            <Input
              value={settings.tagline?.en ?? ""}
              onChange={(e) => setSettings({ ...settings, tagline: { ...settings.tagline, en: e.target.value } })}
            />
          </Field>
          <Field label="Tagline (AR)">
            <Input
              dir="rtl"
              value={settings.tagline?.ar ?? ""}
              onChange={(e) => setSettings({ ...settings, tagline: { ...settings.tagline, ar: e.target.value } })}
            />
          </Field>
          <div className="mb-2 text-[12.5px] font-semibold" style={{ color: "var(--text2)" }}>
            Logo
          </div>
          <div
            className="mb-4 flex items-center gap-3.5 rounded-[11px] border p-3.5"
            style={{ borderColor: "var(--border)", background: "var(--panel2)" }}
          >
            <div
              className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[12px]"
              style={{ background: "linear-gradient(135deg,#FF6A00,#FF0080)" }}
            >
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round">
                  <path d="M8 9l-3 3 3 3" />
                  <path d="M16 9l3 3-3 3" />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Input
                aria-label="Logo URL"
                placeholder="https://… — paste a URL from Media"
                value={settings.logoUrl ?? ""}
                onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
              />
            </div>
          </div>
          <Field label="Brand colors" hint="Comma-separated hex values.">
            <Input
              value={settings.brandColors?.join(", ") ?? ""}
              onChange={(e) =>
                setSettings({ ...settings, brandColors: e.target.value.split(",").map((c) => c.trim()).filter(Boolean) })
              }
            />
          </Field>
          <div className="flex flex-wrap gap-[9px]">
            {(settings.brandColors ?? []).map((c) => (
              <div
                key={c}
                title={c}
                className="h-[34px] w-[34px] rounded-[9px] border"
                style={{ background: c, borderColor: "var(--bstrong)" }}
              />
            ))}
          </div>
        </Card>

        <Card>
          <PanelHead title="Languages" subtitle="Which languages appear in the site switcher." />
          <div className="flex flex-col gap-2.5">{KNOWN_LANGUAGES.map(languageRow)}</div>
          <div className="mt-4">
            <Field label="Default language">
              <select
                className="w-full rounded-[10px] border px-3.5 py-2.5 text-[14px]"
                style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--text)" }}
                value={settings.defaultLanguage}
                onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
              >
                {settings.languages.filter((l) => l.enabled).map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Card>

        <Card>
          <PanelHead title="SEO" subtitle="Default title and description used where a page has none." />
          <Field label="Default title">
            <Input
              value={settings.seo?.defaultTitle ?? ""}
              onChange={(e) => setSettings({ ...settings, seo: { ...settings.seo, defaultTitle: e.target.value } })}
            />
          </Field>
          <Field label="Default description">
            <Input
              value={settings.seo?.defaultDescription ?? ""}
              onChange={(e) => setSettings({ ...settings, seo: { ...settings.seo, defaultDescription: e.target.value } })}
            />
          </Field>
        </Card>

        <Card>
          <PanelHead title="Pixels" subtitle="Paste an ID and the tag deploys site-wide." />
          <Field label="Google Analytics ID">
            <Input
              value={settings.pixels?.googleAnalyticsId ?? ""}
              onChange={(e) => setSettings({ ...settings, pixels: { ...settings.pixels, googleAnalyticsId: e.target.value } })}
            />
          </Field>
          <Field label="Meta Pixel ID">
            <Input
              value={settings.pixels?.metaPixelId ?? ""}
              onChange={(e) => setSettings({ ...settings, pixels: { ...settings.pixels, metaPixelId: e.target.value } })}
            />
          </Field>
        </Card>

        <Card>
          <PanelHead title="Contact" subtitle="Used by the nav, footer, contact page and the WhatsApp button." />
          <Field label="Email">
            <Input
              value={settings.contact?.email ?? ""}
              onChange={(e) => setSettings({ ...settings, contact: { ...settings.contact, email: e.target.value } })}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={settings.contact?.phone ?? ""}
              onChange={(e) => setSettings({ ...settings, contact: { ...settings.contact, phone: e.target.value } })}
            />
          </Field>
          <Field label="WhatsApp">
            <Input
              value={settings.contact?.whatsapp ?? ""}
              onChange={(e) => setSettings({ ...settings, contact: { ...settings.contact, whatsapp: e.target.value } })}
            />
          </Field>
        </Card>

        </div>

        <div className="mt-5 flex items-center gap-3">
          <GradientButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </GradientButton>
          {savedAt ? (
            <span className="text-[12.5px]" style={{ color: "var(--text3)" }}>
              Saved.
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}
