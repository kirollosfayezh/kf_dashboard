import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Check, Send } from "lucide-react";
import { crmSettings, notifications as api, type AdminNotification, type CrmSettings } from "@/services/crm";
import { ago } from "@/lib/crm";
import { Button, Callout, Card, EmptyState, Field, Input, LoadingState, PageHeader, Toggle } from "@/components/ui";
import { useNotificationStore } from "@/store/notifications";
import { AlertRow } from "@/components/notification-bell";

export const Route = createFileRoute("/notifications")({ component: NotificationsPage });

const EVENTS: { key: string; label: string }[] = [
  { key: "lead", label: "New contact-form or campaign lead" },
  { key: "chat", label: "New live-chat conversation" },
  { key: "booking", label: "Call booked" },
  { key: "call_soon", label: "Call starting in 15 minutes" },
  { key: "quote_viewed", label: "Client opened a quote" },
  { key: "quote_accepted", label: "Quote accepted" },
  { key: "quote_declined", label: "Quote declined" },
  { key: "followup_due", label: "Follow-up due" },
];

function NotificationsPage() {
  const [rows, setRows] = useState<AdminNotification[] | null>(null);
  const refreshCount = useNotificationStore((s) => s.refresh);

  useEffect(() => {
    api.list({ limit: "100" }).then(setRows).catch(() => setRows([]));
  }, []);

  const markAll = async () => {
    await api.read("all");
    setRows((prev) => (prev ?? []).map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    void refreshCount();
  };

  return (
    <div className="kf-scr">
      <PageHeader
        title="Alerts"
        subtitle="Everything that needs you: new leads and chats, bookings, quote replies and due follow-ups — here, in the bell, and on Telegram if you connect it."
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-ui font-semibold">Recent</span>
            <Button size="sm" variant="ghost" icon={<Check size={14} />} onClick={() => void markAll()} disabled={!rows?.some((n) => !n.readAt)}>
              Mark all read
            </Button>
          </div>
          {!rows ? (
            <LoadingState variant="skeleton" skeleton="table" rows={5} />
          ) : !rows.length ? (
            <EmptyState icon={<Bell size={22} />} title="No alerts yet" body="They appear the moment a lead, chat, booking or quote reply comes in." />
          ) : (
            <div className="flex flex-col gap-2">
              {rows.map((n) => <AlertRow key={n.id} n={n} />)}
            </div>
          )}
        </div>
        <TelegramCard />
      </div>
    </div>
  );
}

function TelegramCard() {
  const [s, setS] = useState<CrmSettings | null>(null);
  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [events, setEvents] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  useEffect(() => {
    crmSettings.get().then((d) => {
      setS(d);
      setChatId(d.telegram.chatId ?? "");
      setEnabled(d.telegram.enabled);
      setEvents(d.telegram.events ?? {});
    });
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const d = await crmSettings.update({ telegram: { enabled, chatId, events, ...(token.trim() ? { botToken: token.trim() } : {}) } });
      setS(d);
      setToken("");
      setMsg({ tone: "success", text: "Saved." });
    } catch (e) {
      setMsg({ tone: "danger", text: e instanceof Error ? e.message : "Could not save" });
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setMsg(null);
    try {
      await crmSettings.testTelegram();
      setMsg({ tone: "success", text: "Test message sent — check Telegram." });
    } catch (e) {
      setMsg({ tone: "danger", text: e instanceof Error ? e.message : "Test failed" });
    } finally {
      setTesting(false);
    }
  };

  if (!s) return <Card><LoadingState variant="skeleton" skeleton="form" rows={3} /></Card>;

  return (
    <Card className="self-start">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-ui font-semibold">Telegram alerts</span>
        <Toggle checked={enabled} onChange={() => setEnabled((v) => !v)} label="Send alerts to Telegram" />
      </div>
      <p className="mb-4 text-caption text-muted">Instant, free push to your phone.</p>
      <ol className="mb-4 list-decimal space-y-1 pl-5 text-caption text-muted">
        <li>In Telegram, open <b>@BotFather</b>, send <code>/newbot</code>, and copy the token it gives you.</li>
        <li>Open your new bot and press <b>Start</b> (send it any message).</li>
        <li>Open <b>@userinfobot</b> to get your chat ID (a number), or use a group's ID.</li>
        <li>Paste both below, save, then <b>Send test</b>.</li>
      </ol>
      <Field label="Bot token" hint={s.telegram.hasBotToken ? `Saved (ends in …${s.telegram.botTokenHint}). Leave blank to keep it.` : undefined}>
        <Input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder={s.telegram.hasBotToken ? "••••••••" : "123456789:AA…"} />
      </Field>
      <Field label="Chat ID">
        <Input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="e.g. 123456789" inputMode="numeric" />
      </Field>
      <div className="label mb-2 text-faint">Send these to Telegram</div>
      <div className="mb-4 flex flex-col gap-2">
        {EVENTS.map((e) => (
          <label key={e.key} className="flex items-center justify-between gap-3 text-ui">
            <span>{e.label}</span>
            <Toggle checked={events[e.key] !== false} onChange={() => setEvents((cur) => ({ ...cur, [e.key]: cur[e.key] === false }))} label={e.label} />
          </label>
        ))}
      </div>
      {msg ? <Callout tone={msg.tone} className="mb-3">{msg.text}</Callout> : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" loading={saving} onClick={() => void save()}>Save</Button>
        <Button icon={<Send size={14} />} loading={testing} onClick={() => void test()} disabled={!s.telegram.hasBotToken}>Send test</Button>
      </div>
    </Card>
  );
}
