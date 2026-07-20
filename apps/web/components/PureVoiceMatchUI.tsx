'use client';

import { useEffect, useState } from 'react';
import { Mic, MicOff, PhoneOff, SkipForward } from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';
import { Avatar } from './Avatar';
import type { PublicUserSummary } from '@campusly/shared-types';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';

interface PureVoiceMatchUIProps {
  sessionId: string;
  isCaller: boolean;
  partner: PublicUserSummary | null;
  onNextMatch: () => void;
  onLeave: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function PureVoiceMatchUI({
  sessionId,
  isCaller,
  partner,
  onNextMatch,
  onLeave,
}: PureVoiceMatchUIProps) {
  const voiceCall = useWebRTC({ contextType: 'anon_session', contextId: sessionId, enabled: true });
  const [hasStarted, setHasStarted] = useState(false);

  // Auto-start or auto-accept the call
  useEffect(() => {
    if (hasStarted) return;

    if (isCaller) {
      if (voiceCall.callState === 'idle') {
        voiceCall.startCall();
        setHasStarted(true);
      }
    } else {
      if (voiceCall.callState === 'ringing') {
        voiceCall.acceptCall();
        setHasStarted(true);
      }
    }
  }, [isCaller, voiceCall, hasStarted]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-space-6 bg-gradient-to-b from-background to-muted/20">
      <div className="flex flex-col items-center gap-space-6 max-w-sm w-full">
        {/* Pulsing Avatar Area */}
        <div className="relative">
          <div
            className={cn(
              'absolute inset-0 rounded-full bg-brand/20 animate-ping',
              voiceCall.callState !== 'connected' && 'hidden',
            )}
          />
          <div
            className={cn(
              'absolute -inset-4 rounded-full bg-brand/10 animate-pulse delay-150',
              voiceCall.callState !== 'connected' && 'hidden',
            )}
          />

          <Avatar
            name={partner?.name ?? '?'}
            mediaId={partner?.avatarMediaId ?? null}
            size="lg"
            className="w-32 h-32 text-4xl shadow-xl ring-4 ring-background relative z-10"
          />
        </div>

        {/* Status / Info */}
        <div className="text-center space-y-2 relative z-10">
          <h2 className="text-2xl font-bold tracking-tight">
            {partner ? partner.name : 'Anonymous'}
          </h2>

          <div className="text-muted-foreground font-medium">
            {voiceCall.callState === 'connected' ? (
              <span className="text-brand tabular-nums font-mono text-lg">
                {formatDuration(voiceCall.callDuration)}
              </span>
            ) : voiceCall.callState === 'ringing' || voiceCall.callState === 'calling' ? (
              <span className="animate-pulse">Connecting...</span>
            ) : (
              <span>Preparing call...</span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-space-6 mt-space-8">
          {/* Mute Button */}
          <Button
            size="md"
            variant="secondary"
            className={cn(
              'w-14 h-14 rounded-full transition-all',
              voiceCall.isMuted
                ? 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 hover:text-destructive'
                : '',
            )}
            onClick={voiceCall.toggleMute}
          >
            {voiceCall.isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          {/* End Call Button */}
          <Button
            size="lg"
            variant="danger"
            className="w-16 h-16 rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all p-0 flex items-center justify-center"
            onClick={onLeave}
          >
            <PhoneOff className="h-7 w-7" />
          </Button>

          {/* Skip / Next Match */}
          <Button
            size="md"
            variant="secondary"
            className="w-14 h-14 rounded-full bg-background p-0 flex items-center justify-center"
            onClick={onNextMatch}
          >
            <SkipForward className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
