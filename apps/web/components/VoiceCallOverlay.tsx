'use client';

import { Phone, PhoneOff, Mic, MicOff, PhoneCall } from 'lucide-react';
import type { VoiceCallState } from '../hooks/useWebRTC';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';

// ── Shared Helper ──
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ── 1. VoiceCallButton (Header Action) ──

export function VoiceCallButton({
  callState,
  onStartCall,
}: {
  callState: VoiceCallState;
  onStartCall: () => void;
}) {
  // If a call is already active/ringing, hide the start button from the header
  if (callState !== 'idle') return null;

  return (
    <button
      type="button"
      onClick={onStartCall}
      className="p-2 text-brand hover:text-brand-hover hover:bg-brand/10 transition-colors rounded-full flex items-center justify-center select-none"
      aria-label="Start Voice Call"
      title="Start Voice Call"
    >
      <Phone className="h-5 w-5" />
    </button>
  );
}

// ── 2. VoiceCallOverlay (In-Chat Call Banner) ──

export interface VoiceCallOverlayProps {
  callState: VoiceCallState;
  isMuted: boolean;
  callDuration: number;
  onStartCall: () => void; // for retry if needed
  onAcceptCall: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
}

export function VoiceCallOverlay({
  callState,
  isMuted,
  callDuration,
  onAcceptCall,
  onEndCall,
  onToggleMute,
}: VoiceCallOverlayProps) {
  if (callState === 'idle') return null;

  const isConnected = callState === 'connected';
  const isRinging = callState === 'ringing';
  const isCalling = callState === 'calling';

  return (
    <div className="flex items-center justify-between px-space-4 py-space-3 bg-card border-b border-divider animate-in slide-in-from-top-2 shrink-0 shadow-sm relative z-10">
      {/* Left: Status & Animation */}
      <div className="flex items-center gap-space-3">
        <div className="relative flex items-center justify-center w-10 h-10">
          <div
            className={cn(
              'absolute inset-0 rounded-full',
              isConnected ? 'bg-success/20 animate-pulse' : 'bg-brand/20 animate-ping',
            )}
          />
          <PhoneCall
            className={cn(
              'h-5 w-5 relative z-10',
              isConnected ? 'text-success' : 'text-brand animate-pulse',
            )}
          />
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-body font-semibold text-foreground truncate">
            {isCalling ? 'Calling...' : isRinging ? 'Incoming Call...' : 'Voice Call'}
          </span>
          {isConnected && (
            <span className="text-caption font-mono text-brand font-medium">
              {formatDuration(callDuration)}
            </span>
          )}
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-space-2 shrink-0">
        {isConnected && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onToggleMute}
            className={cn(
              'w-10 px-0 transition-colors',
              isMuted ? 'bg-danger/10 text-danger border-danger/20 hover:bg-danger/20' : '',
            )}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}

        {isRinging && (
          <Button
            size="sm"
            className="bg-success text-white hover:bg-success/90"
            onClick={onAcceptCall}
          >
            <Phone className="h-4 w-4 mr-1.5" />
            Accept
          </Button>
        )}

        <Button
          size="sm"
          variant="danger"
          className="w-10 px-0 shadow-sm"
          onClick={onEndCall}
          title="End Call"
        >
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
