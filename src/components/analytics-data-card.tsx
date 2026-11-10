import { useState } from "react";
import { Check, Copy, ExternalLink, Smartphone, Trash2 } from "lucide-react";
import { Button, Card, Input, Modal, PanelHead } from "@/components/ui";
import { RESET_CONFIRMATION, resetAnalytics } from "@/services/analytics";
import { SITE_URL } from "@/components/content-crud/form-model";

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;

const SITE = SITE_URL || "https://kftechsolutions.dev";
const OWNER_ON = `${SITE}/?kf_owner=on`;
const OWNER_OFF = `${SITE}/?kf_owner=off`;

/**
 * Two housekeeping tools for the numbers above:
 *  - marking the owner's own phone and computer, so they stop being counted
 *    (the site reads `?kf_owner=on`, remembers it in that browser, and sends
 *    no analytics or ad-pixel events from it again);
 *  - wiping all recorded traffic to start from zero, behind a typed RESET.
 */
export function AnalyticsDataCard({ onReset }: { onReset: () => void }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ events: number; visitors: number } | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(OWNER_ON);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link and open it on your phone:", OWNER_ON);
    }
  };

  const close = () => {
    if (busy) return;
    setOpen(false);
    setTyped("");
    setError(null);
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await resetAnalytics();
      setDone(result);
      setOpen(false);
      setTyped("");
      onReset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reset analytics");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <PanelHead title="Your data" subtitle="Keep your own visits out of the numbers, or start counting again from zero." />
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}>
        <div className="rounded-control border border-line bg-raised p-4">
          <div className="flex items-center gap-2 font-display text-body font-semibold">
            <Smartphone size={16} /> Don't count my devices
          </div>
          <p className="mt-1.5 text-ui leading-[1.55] text-muted">
            Open this link once on each of your own devices — your phone and your Mac. That browser then sends no analytics
            and no ad-pixel events, and the site's footer shows <span className="text-ink">"Owner device · not counted"</span>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" icon={<ExternalLink size={15} />} onClick={() => window.open(OWNER_ON, "_blank", "noopener")}>
              Mark this browser as mine
            </Button>
            <Button onClick={copy}>
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy link for your phone"}
            </Button>
          </div>
          <p className="mt-3 break-all font-mono text-label text-faint">
            {OWNER_ON}
            <br />
            Undo on a device: {OWNER_OFF}
          </p>
        </div>

        <div className="rounded-control border border-line bg-raised p-4">
          <div className="flex items-center gap-2 font-display text-body font-semibold">
            <Trash2 size={16} /> Start analytics from zero
          </div>
          <p className="mt-1.5 text-ui leading-[1.55] text-muted">
            Deletes every recorded page view, click and visitor profile, for all dates. Leads, contacts, chats and quotes are
            kept. This cannot be undone — use Export first if you want a copy.
          </p>
          <div className="mt-3">
            <Button variant="danger" onClick={() => setOpen(true)}>
              <Trash2 size={15} /> Delete all analytics…
            </Button>
          </div>
          {done ? (
            <p className="mt-3 text-ui text-success" role="status">
              Done — deleted {plural(done.events, "event")} and {plural(done.visitors, "visitor profile")}. Counting starts again now.
            </p>
          ) : null}
        </div>
      </div>

      <Modal
        open={open}
        onClose={close}
        dismissible={!busy}
        title="Delete all analytics?"
        description="Every page view, click and visitor profile is deleted permanently, for all dates. Leads, contacts, chats and quotes stay."
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirm} disabled={busy || typed.trim() !== RESET_CONFIRMATION}>
              {busy ? "Deleting…" : "Delete everything"}
            </Button>
          </>
        }
      >
        <label className="mt-4 block text-ui text-muted">
          Type <span className="font-mono text-ink">{RESET_CONFIRMATION}</span> to confirm
          <Input className="mt-1.5" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus autoComplete="off" />
        </label>
        {error ? <p className="mt-2 text-ui text-danger">{error}</p> : null}
      </Modal>
    </Card>
  );
}
