'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import {
  MATCH_CLIENT_EVENTS,
  MATCH_SERVER_EVENTS,
  type MatchState,
  type MatchFoundPayload,
  type SessionStartedPayload,
  type SessionEndedPayload,
} from '@campusly/shared-types';
import { connectSocket, getSocket } from '../lib/socket';
import type { PublicUserSummary } from '@campusly/shared-types';
import { useAuth } from './AuthProvider';

export interface MatchingContextValue {
  state: MatchState;
  sessionId: string | null;
  partner: PublicUserSummary | null;
  endedReason: string | null;
  findMatch: (genderPreference?: any) => void;
  cancel: () => void;
  leaveSession: () => void;
}

const MatchingContext = createContext<MatchingContextValue | null>(null);

export function MatchingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<MatchState>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [partner, setPartner] = useState<PublicUserSummary | null>(null);
  const [endedReason, setEndedReason] = useState<string | null>(null);
  const heartbeat = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopHeartbeat = useCallback(() => {
    if (heartbeat.current) {
      clearInterval(heartbeat.current);
      heartbeat.current = null;
    }
  }, []);

  useEffect(() => {
    if (!user) return; // Only connect sockets for authenticated users

    const socket = connectSocket();

    const onQueue = () => {
      setState('waiting');
      setEndedReason(null);
    };
    const onFound = (_p: MatchFoundPayload) => setEndedReason(null);
    const onStarted = (p: SessionStartedPayload) => {
      stopHeartbeat();
      setSessionId(p.sessionId);
      setPartner(p.partner ?? null);
      setState('in_session');
    };
    const onEnded = (p: SessionEndedPayload) => {
      setSessionId(null);
      setPartner(null);
      setState('idle');
      setEndedReason(p.reason);
    };
    const onTimeout = () => {
      stopHeartbeat();
      setState('idle');
      setEndedReason('timeout');
    };
    const onCancelled = () => {
      stopHeartbeat();
      setState('idle');
    };

    socket.on(MATCH_SERVER_EVENTS.QUEUE_STATUS, onQueue);
    socket.on(MATCH_SERVER_EVENTS.MATCH_FOUND, onFound);
    socket.on(MATCH_SERVER_EVENTS.SESSION_STARTED, onStarted);
    socket.on(MATCH_SERVER_EVENTS.SESSION_ENDED, onEnded);
    socket.on(MATCH_SERVER_EVENTS.MATCH_TIMEOUT, onTimeout);
    socket.on(MATCH_SERVER_EVENTS.MATCH_CANCELLED, onCancelled);

    return () => {
      socket.off(MATCH_SERVER_EVENTS.QUEUE_STATUS, onQueue);
      socket.off(MATCH_SERVER_EVENTS.MATCH_FOUND, onFound);
      socket.off(MATCH_SERVER_EVENTS.SESSION_STARTED, onStarted);
      socket.off(MATCH_SERVER_EVENTS.SESSION_ENDED, onEnded);
      socket.off(MATCH_SERVER_EVENTS.MATCH_TIMEOUT, onTimeout);
      socket.off(MATCH_SERVER_EVENTS.MATCH_CANCELLED, onCancelled);
      stopHeartbeat();
    };
  }, [user, stopHeartbeat]);

  const findMatch = useCallback(
    (genderPreference = 'all') => {
      const socket = getSocket();
      setEndedReason(null);
      setState('waiting');
      socket.emit(MATCH_CLIENT_EVENTS.JOIN_QUEUE, { genderPreference });
      stopHeartbeat();
      heartbeat.current = setInterval(() => socket.emit(MATCH_CLIENT_EVENTS.HEARTBEAT), 10_000);
    },
    [stopHeartbeat],
  );

  const cancel = useCallback(() => {
    getSocket().emit(MATCH_CLIENT_EVENTS.LEAVE_QUEUE);
    stopHeartbeat();
    setState('idle');
  }, [stopHeartbeat]);

  const leaveSession = useCallback(() => {
    if (sessionId) getSocket().emit(MATCH_CLIENT_EVENTS.LEAVE_SESSION, { sessionId });
    setState('idle');
    setSessionId(null);
  }, [sessionId]);

  return (
    <MatchingContext.Provider
      value={{ state, sessionId, partner, endedReason, findMatch, cancel, leaveSession }}
    >
      {children}
    </MatchingContext.Provider>
  );
}

export function useMatchingContext() {
  const context = useContext(MatchingContext);
  if (!context) {
    throw new Error('useMatchingContext must be used within a MatchingProvider');
  }
  return context;
}
