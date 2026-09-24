import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import type { AdminNotification } from "@/services/crm";
import { ago } from "@/lib/crm";
import { useNotificationStore } from "@/store/notifications";

/** The header bell: unread badge, the latest alerts, and a switch for desktop notifications. */
export function NotificationBell() {
  const { unread, latest, start, markAllRead } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState(() => (typeof Notification === "undefined" ? "denied" : Notification.permission));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => start(), [start]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={unread ? `Alerts, ${unread} unread` : "Alerts"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-[38px] w-[38px] place-items-center rounded-control border transition-colors border-line bg-panel"
      >
        <Bell size={17} />
        {unread ? (
          <span className="font-mono absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(360px,calc(100vw-24px))] rounded-card border border-line-strong bg-panel p-2 shadow-overlay">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-ui font-semibold">Alerts</span>
            {unread ? (
              <button type="button" className="text-caption text-muted hover:text-ink" onClick={() => void markAllRead()}>
                Mark all read
              </button>
            ) : null}
          </div>
          {permission === "default" ? (
            <button
              type="button"
              className="mb-2 w-full rounded-control border border-brand-edge bg-brand-tint px-3 py-2 text-left text-caption"
              onClick={() => void Notification.requestPermission().then(setPermission)}
            >
              Get desktop notifications when this tab is in the background →
            </button>
          ) : null}
          <div className="kf-scrollbar flex max-h-[380px] flex-col gap-1.5 overflow-y-auto">
            {latest.length ? latest.map((n) => <AlertRow key={n.id} n={n} onOpen={() => setOpen(false)} />) : (
              <p className="px-2 py-6 text-center text-caption text-faint">No alerts yet.</p>
            )}
          </div>
          <Link to="/notifications" onClick={() => setOpen(false)} className="mt-1.5 block rounded-control px-2 py-2 text-center text-caption text-muted hover:bg-hover">
            All alerts & Telegram setup
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function AlertRow({ n, onOpen }: { n: AdminNotification; onOpen?: () => void }) {
  const body = (
    <div className={`flex gap-3 rounded-control border px-3.5 py-3 ${n.readAt ? "border-line" : "border-brand-edge bg-brand-tint"}`}>
      {!n.readAt ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-label="Unread" /> : <span className="w-2 shrink-0" />}
      <div className="min-w-0 flex-1">
        <div className="text-ui font-semibold">{n.title}</div>
        {n.body ? <div className="line-clamp-2 whitespace-pre-wrap text-caption text-muted">{n.body}</div> : null}
        <div className="mt-0.5 text-caption text-faint">{ago(n.createdAt)}</div>
      </div>
    </div>
  );
  return n.link ? (
    // Alert links are dashboard paths chosen by the backend, so they are not in the typed route list.
    <Link to={n.link as never} onClick={onOpen} className="block hover:opacity-90">{body}</Link>
  ) : (
    body
  );
}

