import { create } from "zustand";
import { notifications as api, type AdminNotification } from "@/services/crm";
import { getSocket } from "@/services/socket";

/**
 * The dashboard's live alert state: unread count and the latest few, kept
 * current by the `admin:notification` socket push. When the tab is in the
 * background a browser notification and a short chime go out too, so a lead
 * that arrives while you're in another tab is not missed.
 */
interface NotificationState {
  unread: number;
  latest: AdminNotification[];
  started: boolean;
  refresh: () => Promise<void>;
  start: () => void;
  markAllRead: () => Promise<void>;
}

function chime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
    osc.onended = () => void ctx.close();
  } catch {
    /* no audio — the visual alert still shows */
  }
}

function desktopNotify(n: AdminNotification) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const note = new Notification(n.title, { body: n.body?.slice(0, 180), tag: n.id, icon: "/favicon.svg" });
    note.onclick = () => {
      window.focus();
      if (n.link) window.location.assign(n.link);
      note.close();
    };
  } catch {
    /* some browsers only allow notifications from a service worker */
  }
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unread: 0,
  latest: [],
  started: false,

  refresh: async () => {
    try {
      const [count, latest] = await Promise.all([api.count(), api.list({ limit: "8" })]);
      set({ unread: count.unread, latest });
    } catch {
      /* the bell simply stays as it was */
    }
  },

  start: () => {
    if (get().started) return;
    set({ started: true });
    void get().refresh();
    // Fire any due reminders now — covers a server that was asleep when they fell due.
    void api.check().then(() => get().refresh()).catch(() => {});
    const socket = getSocket();
    socket?.on("admin:notification", (n: AdminNotification) => {
      set((s) => ({ unread: s.unread + 1, latest: [n, ...s.latest.filter((x) => x.id !== n.id)].slice(0, 8) }));
      if (document.visibilityState === "hidden") {
        desktopNotify(n);
        chime();
      }
    });
  },

  markAllRead: async () => {
    const res = await api.read("all");
    set((s) => ({ unread: res.unread, latest: s.latest.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) }));
  },
}));
