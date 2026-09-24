import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, MessageSquare } from "lucide-react";
import {
  listMessages,
  listThreads,
  setAgentTyping as sendAgentTyping,
  sendMessage,
  subscribeToChat,
  type ThreadUpdatedPayload,
  type TypingPayload,
} from "@/services/chat";
import type { ChatMessage, ChatThread } from "@/services/domain-types";
import { Avatar, EmptyState, ErrorBanner, Pill,
  toneForStatus, SectionHead, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  // `?visitor=<id>` opens that conversation — the contact page links here.
  validateSearch: (s: Record<string, unknown>): { visitor?: string } => ({
    visitor: typeof s.visitor === "string" ? s.visitor : undefined,
  }),
});

const QUICK_REPLIES = [
  "Happy to help — what are you building?",
  "Our builds typically start within 1-2 weeks.",
  "Can I call you today?",
  "Sending you a quote shortly.",
];

function threadName(thread: ChatThread | null | undefined): string {
  return thread?.visitorMeta?.name?.trim() || "Visitor";
}

/** 🇪🇬 from "EG". */
function flagOf(country?: string): string {
  if (!country || !/^[A-Z]{2}$/.test(country)) return "";
  return country.replace(/./g, (c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65));
}

/** The visitor's phone with its flag, falling back to whatever contact older threads saved. */
function contactLine(thread: ChatThread): string {
  if (thread.phone) return `${flagOf(thread.phoneCountry)} ${thread.phone}`.trim();
  return thread.visitorMeta?.contact || thread.visitorId;
}

/** Newest conversation first — mirrors the server's `lastMessageAt` sort. */
function sortThreads(threads: ChatThread[]): ChatThread[] {
  return [...threads].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
}

function ChatPage() {
  const [threads, setThreads] = useState<ChatThread[] | null>(null);
  const { visitor } = Route.useSearch();
  const [activeId, setActiveId] = useState<string | null>(visitor ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;
  const scrollRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<ReturnType<typeof subscribeToChat> | null>(null);

  /** Appends only if we haven't already seen this message id (POST result vs socket echo). */
  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) =>
      prev.some((m) => m.id === message.id) ? prev : [...prev, message],
    );
  }, []);

  // Initial thread list (REST).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listThreads();
        if (cancelled) return;
        setThreads(sortThreads(data));
      } catch (e) {
        if (!cancelled) {
          setThreads([]);
          setError(e instanceof Error ? e.message : "Failed to load conversations");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Live push channel.
  useEffect(() => {
    const sub = subscribeToChat({
      onThreadUpdated: ({ thread, message, mergedFrom }: ThreadUpdatedPayload) => {
        // The open conversation was folded into another thread: follow it there.
        if (mergedFrom && mergedFrom === activeIdRef.current) setActiveId(thread.visitorId);
        setThreads((prev) => {
          const rest = (prev ?? []).filter((t) => t.visitorId !== thread.visitorId && t.visitorId !== mergedFrom);
          return sortThreads([thread, ...rest]);
        });
        if (message?.from === "visitor" && thread.visitorId !== activeIdRef.current) {
          setUnread((prev) => ({
            ...prev,
            [thread.visitorId]: (prev[thread.visitorId] ?? 0) + 1,
          }));
        }
      },
      onMessage: (message) => {
        // Only ever fires for the thread we're watching.
        if (message.threadId === activeIdRef.current) appendMessage(message);
      },
      onTyping: ({ visitorId, typing: isTyping }: TypingPayload) => {
        setTyping((prev) => ({ ...prev, [visitorId]: isTyping }));
      },
      onStatus: setLive,
    });

    subRef.current = sub;
    return () => {
      subRef.current = null;
      sub.dispose();
    };
  }, [appendMessage]);

  // Opening a thread: load history over REST and watch its room.
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      subRef.current?.watch(null);
      return;
    }
    let cancelled = false;
    setLoadingMessages(true);
    subRef.current?.watch(activeId);
    setUnread((prev) => {
      if (!prev[activeId]) return prev;
      const next = { ...prev };
      delete next[activeId];
      return next;
    });
    (async () => {
      try {
        const data = await listMessages(activeId);
        if (cancelled) return;
        setMessages(data);
      } catch (e) {
        if (cancelled) return;
        setMessages([]);
        setError(e instanceof Error ? e.message : "Failed to load messages");
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  // Keep the transcript pinned to the newest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, activeId]);

  const active = useMemo(
    () => (threads ?? []).find((t) => t.visitorId === activeId) ?? null,
    [threads, activeId],
  );

  const typingTimer = useRef<number | undefined>(undefined);
  /** Whether the server already knows we're typing, so we send it once per burst. */
  const typingSent = useRef(false);

  useEffect(() => () => window.clearTimeout(typingTimer.current), []);

  /** Tells the visitor's widget we're composing; auto-clears when we go idle. */
  const signalTyping = (value: string) => {
    setDraft(value);
    if (!activeId) return;
    // One request per typing burst, not per keystroke.
    if (!typingSent.current) {
      typingSent.current = true;
      void sendAgentTyping(activeId, true).catch(() => {});
    }
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      typingSent.current = false;
      void sendAgentTyping(activeId, false).catch(() => {});
    }, 1800);
  };

  const sendReply = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !activeId || sending) return;
    setSending(true);
    setError(null);
    try {
      // Write over REST; the socket echoes the saved message back. `appendMessage`
      // de-dupes by id, so this is safe even if the echo arrives first (or never,
      // when the socket is down).
      const saved = await sendMessage(activeId, trimmed);
      setDraft("");
      window.clearTimeout(typingTimer.current);
      typingSent.current = false;
      void sendAgentTyping(activeId, false).catch(() => {});
      appendMessage(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // Threads from before phones were required may only have a free-text contact.
  const phone = active?.phone || (active?.visitorMeta?.contact?.startsWith("+") ? active.visitorMeta.contact : undefined);

  return (
    <div className="kf-scr">
      <SectionHead
        title="Live chat"
        subtitle="Answer website visitors in real time. Replies appear on the site instantly, pushed over Socket.io."
        action={
          <span
            className="font-mono inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-label tracking-wider border-line text-faint"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: live ? "#4ADE80" : "var(--text3)" }}
            />
            {live ? "LIVE" : "OFFLINE"}
          </span>
        }
      />

      {error ? <ErrorBanner message={error} /> : null}

      {!threads ? (
        <div className="grid place-items-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : threads.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={24} />}
          title="No conversations yet"
          body="Open the site in another tab and start a chat from the bubble — it will appear here live, and your replies show up on the site instantly."
          action={
            <a
              href={import.meta.env.VITE_SITE_URL ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="rounded-control px-5 py-[11px] text-ui font-semibold bg-brand text-white"
            >
              Open the site
            </a>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          {/* Thread list — hidden on mobile once a conversation is open. */}
          <div
            className={cn("border-line bg-panel", 
              "flex max-h-[70vh] flex-col overflow-hidden rounded-card border md:flex md:max-h-[620px]",
              activeId && "hidden",
            )}
          >
            <div
              className="font-mono border-b px-4 py-3 text-label tracking-wider border-line bg-raised text-faint"
            >
              CONVERSATIONS · {threads.length}
            </div>
            <div className="kf-scrollbar overflow-y-auto">
              {threads.map((t) => {
                const on = t.visitorId === activeId;
                const count = unread[t.visitorId] ?? 0;
                return (
                  <button
                    key={t.visitorId}
                    onClick={() => setActiveId(t.visitorId)}
                    className="flex w-full items-center gap-2.5 border-b px-4 py-3.5 text-left"
                    style={{
                      borderColor: "var(--border)",
                      borderLeft: `2px solid ${on ? "#FF6A00" : "transparent"}`,
                      background: on ? "var(--hover)" : "transparent",
                    }}
                  >
                    <Avatar name={threadName(t)} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-ui font-semibold">{threadName(t)}</div>
                      <div className="font-mono mt-0.5 truncate text-label text-faint">
                        {typing[t.visitorId] ? "typing…" : contactLine(t)}
                      </div>
                    </div>
                    {count > 0 ? (
                      <span
                        className="font-mono grid h-[19px] min-w-[19px] shrink-0 place-items-center rounded-full px-1.5 text-label font-bold text-white bg-brand"
                      >
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {active ? (
            <div
              className="flex max-h-[75vh] min-h-[420px] flex-col overflow-hidden rounded-card border md:max-h-[620px] border-line bg-panel"
            >
              <div
                className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3.5 md:px-[18px] border-line"
              >
                <button
                  type="button"
                  aria-label="Back to conversations"
                  onClick={() => setActiveId(null)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-control border md:hidden border-line text-muted"
                >
                  <ArrowLeft size={16} />
                </button>
                <Avatar name={threadName(active)} size="md" />
                <div className="min-w-[110px] flex-1">
                  <div className="truncate text-body font-semibold">{threadName(active)}</div>
                  <div className="font-mono truncate text-caption text-muted">
                    {typing[active.visitorId] ? "typing…" : contactLine(active)}
                  </div>
                </div>
                {phone ? (
                  <>
                    <a
                      href={`tel:${phone}`}
                      className="rounded-control border px-3.5 py-2 text-caption font-semibold border-line text-muted"
                    >
                      Call
                    </a>
                    <a
                      href={`https://wa.me/${phone.replace(/[^\d]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-control border px-3.5 py-2 text-caption font-semibold border-line text-muted"
                    >
                      WhatsApp
                    </a>
                  </>
                ) : null}
                <Pill tone={toneForStatus("new")}>new</Pill>
              </div>

              <div ref={scrollRef} className="kf-scrollbar flex flex-1 flex-col gap-2.5 overflow-y-auto p-4 md:p-[18px]">
                {loadingMessages ? (
                  <div className="grid flex-1 place-items-center">
                    <Spinner className="h-6 w-6" />
                  </div>
                ) : null}
                {!loadingMessages && messages.length === 0 ? (
                  <div className="text-ui text-faint">
                    No messages yet.
                  </div>
                ) : null}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className="max-w-[85%] sm:max-w-[80%]"
                    style={{ alignSelf: m.from === "agent" ? "flex-end" : "flex-start" }}
                  >
                    <div
                      className="whitespace-pre-wrap break-words rounded-card px-3.5 py-2.5 text-body leading-relaxed"
                      style={{
                        background: m.from === "agent" ? "linear-gradient(135deg,#FF6A00,#FF0080)" : "var(--panel2)",
                        color: m.from === "agent" ? "#fff" : "var(--text)",
                        borderBottomRightRadius: m.from === "agent" ? 5 : 15,
                        borderBottomLeftRadius: m.from === "agent" ? 15 : 5,
                      }}
                    >
                      {m.text}
                    </div>
                    <div
                      className="font-mono mt-1 text-label"
                      style={{ color: "var(--text3)", textAlign: m.from === "agent" ? "right" : "left" }}
                    >
                      {m.ts ? new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </div>
                  </div>
                ))}
              </div>

              <div className="kf-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 md:flex-wrap md:overflow-visible md:px-[18px]">
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={sending}
                    onClick={() => void sendReply(q)}
                    className="shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-caption disabled:opacity-50 md:whitespace-normal border-line text-muted"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendReply(draft);
                }}
                className="flex gap-2 border-t px-3 py-3 sm:gap-2.5 sm:px-4 border-line"
              >
                <input
                  value={draft}
                  onChange={(e) => signalTyping(e.target.value)}
                  placeholder="Reply as admin…"
                  className="min-w-0 flex-1 rounded-control border px-3.5 py-3 text-body border-line bg-field"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="shrink-0 rounded-control px-4 py-3 text-body font-semibold text-white disabled:opacity-50 sm:px-5 bg-brand"
                >
                  Send
                </button>
              </form>
            </div>
          ) : (
            <div
              className="hidden place-items-center rounded-card border p-10 md:grid border-line"
            >
              <span className="text-faint">Select a conversation</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
