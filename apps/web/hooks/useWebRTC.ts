'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  VOICE_CALL_CLIENT_EVENTS,
  VOICE_CALL_SERVER_EVENTS,
  type CallOfferPayload,
  type CallAnswerPayload,
  type IceCandidatePayload,
  type CallEndedPayload,
} from '@campusly/shared-types';
import { getSocket } from '../lib/socket';

/**
 * WebRTC voice call hook for peer-to-peer audio within a match session.
 *
 * Uses free Google STUN servers for NAT traversal. The Socket.IO connection
 * acts as the signaling channel (no separate signaling server needed).
 *
 * States: idle → calling → ringing → connected → idle
 * - Caller: idle → calling (offer sent) → connected (answer received)
 * - Callee: idle → ringing (offer received) → connected (answer sent)
 */

export type VoiceCallState = 'idle' | 'calling' | 'ringing' | 'connected';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

interface UseWebRTCOptions {
  contextType: 'anon_session' | 'friendship';
  contextId: string | null;
  enabled: boolean;
}

interface UseWebRTCReturn {
  callState: VoiceCallState;
  isMuted: boolean;
  callDuration: number;
  startCall: () => void;
  acceptCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
}

export function useWebRTC({ contextType, contextId, enabled }: UseWebRTCOptions): UseWebRTCReturn {
  const [callState, setCallState] = useState<VoiceCallState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  const durationTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  // ── Cleanup helpers ──

  const stopDurationTimer = useCallback(() => {
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
      durationTimer.current = null;
    }
  }, []);

  const startDurationTimer = useCallback(() => {
    stopDurationTimer();
    setCallDuration(0);
    durationTimer.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, [stopDurationTimer]);

  const cleanup = useCallback(() => {
    stopDurationTimer();
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (remoteAudio.current) {
      remoteAudio.current.srcObject = null;
    }
    pendingCandidates.current = [];
    setCallState('idle');
    setCallDuration(0);
    setIsMuted(false);
  }, [stopDurationTimer]);

  // ── Create RTCPeerConnection ──

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate && contextId) {
        const socket = getSocket();
        const payload: IceCandidatePayload = {
          contextType,
          contextId,
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        };
        socket.emit(VOICE_CALL_CLIENT_EVENTS.ICE_CANDIDATE, payload);
      }
    };

    pc.ontrack = (event) => {
      // Play remote audio
      if (!remoteAudio.current) {
        remoteAudio.current = new Audio();
        remoteAudio.current.autoplay = true;
      }
      remoteAudio.current.srcObject = event.streams[0] ?? null;
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState('connected');
        startDurationTimer();
      } else if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        cleanup();
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [contextType, contextId, startDurationTimer, cleanup]);

  // ── Get microphone stream ──

  const getMicrophone = useCallback(async (): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStream.current = stream;
    return stream;
  }, []);

  // ── Start a call (caller side) ──

  const startCall = useCallback(async () => {
    if (!contextId || !enabled || callState !== 'idle') return;

    try {
      setCallState('calling');
      const pc = createPeerConnection();
      const stream = await getMicrophone();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const payload: CallOfferPayload = {
        contextType,
        contextId,
        sdp: offer.sdp!,
      };
      getSocket().emit(VOICE_CALL_CLIENT_EVENTS.CALL_OFFER, payload);
    } catch {
      cleanup();
    }
  }, [contextType, contextId, enabled, callState, createPeerConnection, getMicrophone, cleanup]);

  // ── Accept an incoming call (callee side) ──

  const acceptCall = useCallback(async () => {
    if (!contextId || callState !== 'ringing' || !peerConnection.current) return;

    try {
      const pc = peerConnection.current;
      const stream = await getMicrophone();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Flush any queued ICE candidates now that we have a remote description
      for (const candidate of pendingCandidates.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidates.current = [];

      const payload: CallAnswerPayload = {
        contextType,
        contextId,
        sdp: answer.sdp!,
      };
      getSocket().emit(VOICE_CALL_CLIENT_EVENTS.CALL_ANSWER, payload);
    } catch {
      cleanup();
    }
  }, [contextType, contextId, callState, getMicrophone, cleanup]);

  // ── End the call ──

  const endCall = useCallback(() => {
    if (contextId) {
      const payload: CallEndedPayload = { contextType, contextId, reason: 'hangup' };
      getSocket().emit(VOICE_CALL_CLIENT_EVENTS.CALL_END, payload);
    }
    cleanup();
  }, [contextType, contextId, cleanup]);

  // ── Toggle mute ──

  const toggleMute = useCallback(() => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // ── Socket event listeners ──

  useEffect(() => {
    if (!contextId || !enabled) return;

    const socket = getSocket();

    // Receive an incoming call offer (callee)
    const onOffer = async (payload: CallOfferPayload) => {
      if (payload.contextId !== contextId) return;
      if (callState !== 'idle') return; // Already in a call

      const pc = createPeerConnection();
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: payload.sdp }));
      setCallState('ringing');
    };

    // Receive the call answer (caller)
    const onAnswer = async (payload: CallAnswerPayload) => {
      if (payload.contextId !== contextId || !peerConnection.current) return;
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription({ type: 'answer', sdp: payload.sdp }),
      );
    };

    // Receive ICE candidates from the peer
    const onIceCandidate = async (payload: IceCandidatePayload) => {
      if (payload.contextId !== contextId) return;
      const candidateInit: RTCIceCandidateInit = {
        candidate: payload.candidate,
        sdpMid: payload.sdpMid,
        sdpMLineIndex: payload.sdpMLineIndex,
      };
      if (peerConnection.current?.remoteDescription) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidateInit));
      } else {
        // Queue candidates until remote description is set
        pendingCandidates.current.push(candidateInit);
      }
    };

    // Peer hung up
    const onCallEnded = (payload: CallEndedPayload) => {
      if (payload.contextId !== contextId) return;
      cleanup();
    };

    socket.on(VOICE_CALL_SERVER_EVENTS.CALL_OFFER, onOffer);
    socket.on(VOICE_CALL_SERVER_EVENTS.CALL_ANSWER, onAnswer);
    socket.on(VOICE_CALL_SERVER_EVENTS.ICE_CANDIDATE, onIceCandidate);
    socket.on(VOICE_CALL_SERVER_EVENTS.CALL_ENDED, onCallEnded);

    return () => {
      socket.off(VOICE_CALL_SERVER_EVENTS.CALL_OFFER, onOffer);
      socket.off(VOICE_CALL_SERVER_EVENTS.CALL_ANSWER, onAnswer);
      socket.off(VOICE_CALL_SERVER_EVENTS.ICE_CANDIDATE, onIceCandidate);
      socket.off(VOICE_CALL_SERVER_EVENTS.CALL_ENDED, onCallEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextId, enabled]);

  // Clean up when the session ends
  useEffect(() => {
    if (!contextId) {
      cleanup();
    }
  }, [contextId, cleanup]);

  return {
    callState,
    isMuted,
    callDuration,
    startCall: () => void startCall(),
    acceptCall: () => void acceptCall(),
    endCall,
    toggleMute,
  };
}
