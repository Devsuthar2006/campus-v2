'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CHAT_CLIENT_EVENTS,
  CHAT_SERVER_EVENTS,
  MEDIA_CLIENT_EVENTS,
  MEDIA_SERVER_EVENTS,
  type ChatMessage,
  type MessageContextType,
  type TypingPayload,
  type MediaExpiredPayload,
} from '@campusly/shared-types';
import { getSocket } from '../lib/socket';
import { messagingApi } from '../lib/messaging';

/**
 * Drives a single conversation (ARCHITECTURE.md §6): loads durable history over
 * REST, then layers live socket events (receive_message, typing). Reused by
 * anonymous sessions now and friend chats in Phase 05.
 */
export function useConversation(contextType: MessageContextType, contextId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [expiredMessageIds, setExpiredMessageIds] = useState<Set<string>>(new Set());
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load history when the conversation opens.
  useEffect(() => {
    if (!contextId) return;
    let cancelled = false;
    setMessages([]);
    void messagingApi.history(contextType, contextId).then((res) => {
      if (!cancelled) setMessages(res.messages);
    });
    return () => {
      cancelled = true;
    };
  }, [contextType, contextId]);

  // Live events.
  useEffect(() => {
    if (!contextId) return;
    const socket = getSocket();

    const onMessage = (msg: ChatMessage) => {
      if (msg.contextId !== contextId) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    };
    const onTypingStart = (p: TypingPayload) => {
      if (p.contextId === contextId) setPartnerTyping(true);
    };
    const onTypingStop = (p: TypingPayload) => {
      if (p.contextId === contextId) setPartnerTyping(false);
    };
    // Temporary media expired/deleted — mark the message's media gone if it's ours.
    const onMediaGone = (p: MediaExpiredPayload) => {
      setMessages((prev) => {
        if (!prev.some((m) => m.id === p.messageId)) return prev;
        setExpiredMessageIds((s) => new Set(s).add(p.messageId));
        return prev;
      });
    };

    socket.on(CHAT_SERVER_EVENTS.RECEIVE_MESSAGE, onMessage);
    socket.on(CHAT_SERVER_EVENTS.TYPING_START, onTypingStart);
    socket.on(CHAT_SERVER_EVENTS.TYPING_STOP, onTypingStop);
    socket.on(MEDIA_SERVER_EVENTS.MEDIA_EXPIRED, onMediaGone);
    socket.on(MEDIA_SERVER_EVENTS.VOICE_MESSAGE_EXPIRED, onMediaGone);
    socket.on(MEDIA_SERVER_EVENTS.MEDIA_DELETED, onMediaGone);

    return () => {
      socket.off(CHAT_SERVER_EVENTS.RECEIVE_MESSAGE, onMessage);
      socket.off(CHAT_SERVER_EVENTS.TYPING_START, onTypingStart);
      socket.off(CHAT_SERVER_EVENTS.TYPING_STOP, onTypingStop);
      socket.off(MEDIA_SERVER_EVENTS.MEDIA_EXPIRED, onMediaGone);
      socket.off(MEDIA_SERVER_EVENTS.VOICE_MESSAGE_EXPIRED, onMediaGone);
      socket.off(MEDIA_SERVER_EVENTS.MEDIA_DELETED, onMediaGone);
    };
  }, [contextType, contextId]);

  const send = useCallback(
    (body: string) => {
      const trimmed = body.trim();
      if (!trimmed || !contextId) return;
      getSocket().emit(CHAT_CLIENT_EVENTS.SEND_MESSAGE, { contextType, contextId, body: trimmed });
      getSocket().emit(CHAT_CLIENT_EVENTS.TYPING_STOP, { contextType, contextId });
    },
    [contextType, contextId],
  );

  const notifyTyping = useCallback(() => {
    if (!contextId) return;
    const socket = getSocket();
    socket.emit(CHAT_CLIENT_EVENTS.TYPING_START, { contextType, contextId });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(
      () => socket.emit(CHAT_CLIENT_EVENTS.TYPING_STOP, { contextType, contextId }),
      2000,
    );
  }, [contextType, contextId]);

  /** Attach an already-uploaded media asset as a new message (refs only). */
  const sendMedia = useCallback(
    (mediaId: string, kind: 'image' | 'voice' | 'video', durationMs?: number) => {
      if (!contextId) return;
      const socket = getSocket();
      if (kind === 'voice') {
        socket.emit(MEDIA_CLIENT_EVENTS.VOICE_UPLOAD_COMPLETED, {
          contextType,
          contextId,
          mediaId,
          durationMs,
        });
      } else {
        socket.emit(MEDIA_CLIENT_EVENTS.MEDIA_UPLOADED, { contextType, contextId, mediaId });
      }
    },
    [contextType, contextId],
  );

  return { messages, partnerTyping, expiredMessageIds, send, sendMedia, notifyTyping };
}
