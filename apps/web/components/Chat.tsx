'use client';

import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from 'react';
import type { MessageContextType } from '@campusly/shared-types';
import { ImagePlus, Mic, Square } from 'lucide-react';
import { useConversation } from '../hooks/useConversation';
import { mediaApi } from '../lib/media';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { MediaAttachment } from './MediaAttachment';
import { cn } from '../lib/utils';

/**
 * Reusable conversation UI (UI_GUIDELINES.md §12): message list + composer.
 * Drives anonymous sessions and friend chats. Supports text plus media (images
 * and voice messages) — bytes upload directly to storage, only references flow
 * over the socket (MEDIA_SYSTEM.md §3, §6).
 */
export function Chat({
  contextType,
  contextId,
  selfId,
}: {
  contextType: MessageContextType;
  contextId: string;
  selfId: string;
}) {
  const { messages, partnerTyping, expiredMessageIds, send, sendMedia, notifyTyping } =
    useConversation(contextType, contextId);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(draft);
    setDraft('');
  };

  const onPickImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMediaError(null);
    setBusy(true);
    try {
      const media = await mediaApi.upload(file, 'image');
      sendMedia(media.id, 'image');
    } catch {
      setMediaError('Could not send that image. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    setMediaError(null);
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMediaError('Voice messages are not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Pick a format this browser can actually record (Safari uses mp4, not webm).
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const supported = candidates.find((t) => MediaRecorder.isTypeSupported?.(t));
      const recorder = supported
        ? new MediaRecorder(stream, { mimeType: supported })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const durationMs = Date.now() - startedAtRef.current;
        // Use the recorder's actual mime (minus codec params) so the stored
        // content-type matches the real bytes and plays back everywhere.
        const mime = (recorder.mimeType || 'audio/webm').split(';')[0];
        const blob = new Blob(chunksRef.current, { type: mime });
        setBusy(true);
        mediaApi
          .upload(blob, 'voice', durationMs)
          .then((media) => sendMedia(media.id, 'voice', durationMs))
          .catch(() => setMediaError('Could not send that voice message. Please try again.'))
          .finally(() => setBusy(false));
      };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();
      setRecording(true);
    } catch {
      setMediaError('Microphone access was blocked. Allow it and try again.');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex-1 overflow-y-auto px-space-1 py-space-2">
        {messages.length === 0 ? (
          <p className="py-space-8 text-center text-caption text-muted-foreground">
            {contextType === 'friendship'
              ? 'Say hello to your new friend.'
              : "Say hello — you're chatting anonymously."}
          </p>
        ) : (
          <ul className="flex flex-col gap-space-2">
            {messages.map((m) => {
              const mine = m.senderId === selfId;
              return (
                <li key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                  <span
                    className={cn(
                      'max-w-[75%] rounded-card px-space-3 py-space-2 text-body break-words whitespace-pre-wrap',
                      mine
                        ? 'bg-brand text-brand-foreground'
                        : 'bg-surface text-foreground border border-border',
                    )}
                  >
                    {m.attachment ? (
                      <MediaAttachment
                        attachment={m.attachment}
                        expired={expiredMessageIds.has(m.id)}
                      />
                    ) : (
                      m.body
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {partnerTyping && <p className="mt-space-2 text-caption text-muted-foreground">typing…</p>}
        <div ref={endRef} />
      </div>

      {mediaError && (
        <p className="px-space-1 pt-space-2 text-caption text-danger" role="alert">
          {mediaError}
        </p>
      )}

      <form
        className="flex items-center gap-space-2 border-t border-divider pt-space-3 pb-[env(safe-area-inset-bottom,16px)] md:pb-0"
        onSubmit={onSubmit}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => void onPickImage(e)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Attach image"
          disabled={busy || recording}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          variant={recording ? 'danger' : 'ghost'}
          size="sm"
          aria-label={recording ? 'Stop recording' : 'Record voice message'}
          disabled={busy && !recording}
          onClick={() => (recording ? stopRecording() : void startRecording())}
        >
          {recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <Input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            notifyTyping();
          }}
          placeholder={recording ? 'Recording…' : 'Type a message…'}
          aria-label="Message"
          maxLength={4000}
          disabled={recording}
          className="border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-muted/30"
        />
        <Button type="submit" disabled={!draft.trim() || busy}>
          Send
        </Button>
      </form>
    </div>
  );
}
