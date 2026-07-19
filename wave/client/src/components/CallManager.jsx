import { useState, useEffect, useRef, useCallback } from 'react';

const callEventBus = {
  listeners: new Set(),
  emit(data) { this.listeners.forEach(fn => fn(data)); },
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
};

export function initiateCall(receiverId, callType = 'voice') {
  callEventBus.emit({ action: 'start', receiverId, callType });
}

export default function CallManager({ socket, user }) {
  const [callState, setCallState] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  const createPeerConnection = useCallback((toUserId, sessionId) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('call:ice-candidate', { sessionId, toUserId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    return pc;
  }, [socket]);

  const startCall = useCallback(async (receiverId, callType = 'voice') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const token = localStorage.getItem('wave_token');
      const res = await fetch('/api/crypto/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiverId, callType })
      });
      const { sessionId } = await res.json();

      setCallState({ sessionId, callType, status: 'ringing', peerId: receiverId });

      const pc = createPeerConnection(receiverId, sessionId);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call:initiate', { receiverId, callType, sessionId });
      socket.emit('call:offer', { sessionId, toUserId: receiverId, offer });
    } catch (err) {
      console.error('Failed to start call:', err);
      alert('Could not access camera/microphone');
    }
  }, [socket, createPeerConnection]);

  const answerCall = useCallback(async (sessionId, callerId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection(callerId, sessionId);
      peerConnectionRef.current = pc;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const token = localStorage.getItem('wave_token');
      await fetch(`/api/crypto/calls/${sessionId}/answer`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      socket.emit('call:answer', { sessionId, receiverId: callerId });
    } catch (err) {
      console.error('Failed to answer call:', err);
    }
  }, [socket, createPeerConnection]);

  const endCall = useCallback(async () => {
    if (callState?.sessionId) {
      const token = localStorage.getItem('wave_token');
      await fetch(`/api/crypto/calls/${callState.sessionId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: 'user_hangup' })
      }).catch(() => {});

      socket.emit('call:end', { sessionId: callState.sessionId, otherUserId: callState.peerId });
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setCallState(null);
    setIsMuted(false);
    setIsVideoEnabled(true);
  }, [callState, socket]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted; });
      setIsMuted(!isMuted);
      socket.emit('call:mute', { sessionId: callState?.sessionId, toUserId: callState?.peerId, muted: !isMuted });
    }
  }, [isMuted, callState, socket]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !isVideoEnabled; });
      setIsVideoEnabled(!isVideoEnabled);
      socket.emit('call:video-toggle', { sessionId: callState?.sessionId, toUserId: callState?.peerId, enabled: !isVideoEnabled });
    }
  }, [isVideoEnabled, callState, socket]);

  useEffect(() => {
    return callEventBus.subscribe(({ action, receiverId, callType }) => {
      if (action === 'start') startCall(receiverId, callType);
    });
  }, [startCall]);

  useEffect(() => {
    if (!socket) return;

    socket.on('call:incoming', async ({ sessionId, callerId, callType }) => {
      setCallState({ sessionId, callType, status: 'ringing', peerId: callerId });
    });

    socket.on('call:answered', async ({ sessionId }) => {
      setCallState(prev => prev ? { ...prev, status: 'active' } : prev);
    });

    socket.on('call:rejected', ({ sessionId }) => {
      setCallState(null);
      alert('Call was rejected');
    });

    socket.on('call:ended', async ({ sessionId }) => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      setCallState(null);
    });

    socket.on('call:offer', async ({ sessionId, fromUserId, offer }) => {
      const pc = createPeerConnection(fromUserId, sessionId);
      peerConnectionRef.current = pc;

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('call:answer-signal', { sessionId, toUserId: fromUserId, answer });
    });

    socket.on('call:answer-signal', async ({ sessionId, answer }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('call:ice-candidate', async ({ candidate }) => {
      if (peerConnectionRef.current && candidate) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on('call:mute', ({ muted }) => {});
    socket.on('call:video-toggle', ({ enabled }) => {});

    return () => {
      socket.off('call:incoming');
      socket.off('call:answered');
      socket.off('call:rejected');
      socket.off('call:ended');
      socket.off('call:offer');
      socket.off('call:answer-signal');
      socket.off('call:ice-candidate');
    };
  }, [socket, createPeerConnection]);

  if (callState?.status === 'ringing' && !callState.peerId) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <div style={{ background: 'white', borderRadius: 20, padding: 32, textAlign: 'center', width: 320 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#128222;</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Incoming {callState.callType} call</div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 24 }}>
            <button onClick={() => { answerCall(callState.sessionId, callState.peerId); }}
              style={{ width: 64, height: 64, borderRadius: '50%', background: '#4caf50', border: 'none', color: 'white', fontSize: 24, cursor: 'pointer' }}>&#128222;</button>
            <button onClick={() => {
              const token = localStorage.getItem('wave_token');
              fetch(`/api/crypto/calls/${callState.sessionId}/reject`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
              setCallState(null);
            }}
              style={{ width: 64, height: 64, borderRadius: '50%', background: '#f44336', border: 'none', color: 'white', fontSize: 24, cursor: 'pointer' }}>&#10005;</button>
          </div>
        </div>
      </div>
    );
  }

  if (callState && callState.status !== 'ringing') {
    return (
      <div style={{ position: 'fixed', bottom: 20, right: 20, width: 360, background: '#1c1e21', borderRadius: 16, overflow: 'hidden', zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <div style={{ position: 'relative', height: callState.callType === 'video' ? 240 : 60, background: '#000' }}>
          {callState.callType === 'video' && (
            <>
              <video ref={localVideoRef} autoPlay muted style={{ position: 'absolute', top: 8, right: 8, width: 100, height: 75, borderRadius: 8, objectFit: 'cover', transform: 'scaleX(-1)' }} />
              <video ref={remoteVideoRef} autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </>
          )}
          {callState.callType === 'voice' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white' }}>
              <div style={{ fontSize: 32, marginRight: 12 }}>&#128222;</div>
              <span>Voice Call</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, padding: 16, justifyContent: 'center' }}>
          <button onClick={toggleMute} style={{ width: 48, height: 48, borderRadius: '50%', background: isMuted ? '#f44336' : '#424242', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' }}>
            {isMuted ? '&#128263;' : '&#128266;'}
          </button>
          {callState.callType === 'video' && (
            <button onClick={toggleVideo} style={{ width: 48, height: 48, borderRadius: '50%', background: !isVideoEnabled ? '#f44336' : '#424242', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' }}>
              {isVideoEnabled ? '&#128249;' : '&#128247;'}
            </button>
          )}
          <button onClick={endCall} style={{ width: 48, height: 48, borderRadius: '50%', background: '#f44336', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' }}>&#128222;</button>
        </div>
      </div>
    );
  }

  return null;
}
