import { api } from "./http";
import { getSocket } from "./socket";
import type { ChatMessage, ChatThread } from "./domain-types";

/**
 * Chat data layer: REST for every read and write, Socket.io purely for the live
 * push of the result. Note a thread is addressed by its `visitorId`, not by the
 * Mongo `_id` that also comes back on the document.
 */

export function listThreads(): Promise<ChatThread[]> {
  return api.get<ChatThread[]>("/admin/chat/threads");
}

export function listMessages(visitorId: string): Promise<ChatMessage[]> {
  return api.get<ChatMessage[]>(
    `/admin/chat/threads/${encodeURIComponent(visitorId)}/messages`,
  );
}

/** The server sets `from: "agent"` and echoes the saved message over the socket. */
export function sendMessage(visitorId: string, text: string): Promise<ChatMessage> {
  return api.post<ChatMessage>(
    `/admin/chat/threads/${encodeURIComponent(visitorId)}/messages`,
    { text },
  );
}

/** Shows/hides the "agent is typing" indicator in the visitor's widget. */
export function setAgentTyping(visitorId: string, typing: boolean): Promise<unknown> {
  return api.patch(`/admin/chat/threads/${encodeURIComponent(visitorId)}/typing`, { typing });
}

export interface ThreadUpdatedPayload {
  thread: ChatThread;
  /** Absent when only the thread changed (e.g. the visitor added their phone). */
  message?: ChatMessage;
  /** A thread folded into this one — it no longer exists and leaves the list. */
  mergedFrom?: string;
}

export interface TypingPayload {
  visitorId: string;
  typing: boolean;
}

export interface ChatSocketHandlers {
  onThreadUpdated?: (payload: ThreadUpdatedPayload) => void;
  onMessage?: (message: ChatMessage) => void;
  onTyping?: (payload: TypingPayload) => void;
  onStatus?: (connected: boolean) => void;
}

/**
 * Subscribes to the live chat events. Returns a cleanup function plus a `watch`
 * helper for switching which single thread's messages stream in.
 */
export function subscribeToChat(handlers: ChatSocketHandlers): {
  watch: (visitorId: string | null) => void;
  dispose: () => void;
} {
  const socket = getSocket();
  let watching: string | null = null;

  if (!socket) {
    return { watch: () => {}, dispose: () => {} };
  }

  const onThreadUpdated = (payload: ThreadUpdatedPayload) => handlers.onThreadUpdated?.(payload);
  const onMessage = (message: ChatMessage) => handlers.onMessage?.(message);
  const onTyping = (payload: TypingPayload) => handlers.onTyping?.(payload);
  const onConnect = () => {
    // Re-join the watched room after a reconnect — room membership is per-socket.
    if (watching) socket.emit("chat:watch", watching);
    handlers.onStatus?.(true);
  };
  const onDisconnect = () => handlers.onStatus?.(false);
  const onConnectError = () => handlers.onStatus?.(false);

  socket.on("chat:thread-updated", onThreadUpdated);
  socket.on("chat:message", onMessage);
  socket.on("chat:typing", onTyping);
  socket.on("connect", onConnect);
  socket.on("disconnect", onDisconnect);
  socket.on("connect_error", onConnectError);

  handlers.onStatus?.(socket.connected);

  return {
    watch: (visitorId) => {
      if (watching === visitorId) return;
      if (watching) socket.emit("chat:unwatch", watching);
      watching = visitorId;
      if (visitorId) socket.emit("chat:watch", visitorId);
    },
    dispose: () => {
      if (watching) socket.emit("chat:unwatch", watching);
      watching = null;
      socket.off("chat:thread-updated", onThreadUpdated);
      socket.off("chat:message", onMessage);
      socket.off("chat:typing", onTyping);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
    },
  };
}
