import { useState, useRef, useCallback } from 'react';
import { api } from '../api';

export default function ChatInput({ onSend, conversationId, socket }) {
  const [text, setText] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [stickerPacks, setStickerPacks] = useState([]);
  const [activePack, setActivePack] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const typingTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  const loadStickers = async () => {
    try {
      const res = await fetch('/api/crypto/stickers', { headers: { Authorization: `Bearer ${localStorage.getItem('pulse_token')}` } });
      const data = await res.json();
      setStickerPacks(data.packs || []);
      if (data.packs?.length > 0) setActivePack(data.packs[0]);
    } catch {}
  };

  const emitTyping = useCallback(() => {
    if (!conversationId) return;
    if (typingTimerRef.current) return;
    api.emitTyping(conversationId).catch(() => {});
    typingTimerRef.current = setTimeout(() => {
      typingTimerRef.current = null;
    }, 2000);
  }, [conversationId]);

  const handleChange = (e) => {
    setText(e.target.value);
    emitTyping();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        sendVoiceMessage(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (err) {
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const sendVoiceMessage = async (blob) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result.split(',')[1];
      const duration = recordingTime;

      if (socket) {
        socket.emit('message:send', {
          messageType: 'voice',
          voiceData: base64,
          voiceDuration: duration,
          conversationId,
          content: `Voice message (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`
        });
      }
    };
    reader.readAsDataURL(blob);
  };

  return (
    <div className="chat-input-area" style={{ position: 'relative' }}>
      {showStickers && (
        <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: 'var(--bg-primary)', borderTop: '1px solid var(--border-color)', borderRadius: '12px 12px 0 0', maxHeight: 300, overflow: 'hidden', zIndex: 10 }}>
          <div style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid var(--border-color)', overflowX: 'auto' }}>
            {stickerPacks.map(pack => (
              <button key={pack.id} onClick={() => setActivePack(pack)}
                style={{ background: activePack?.id === pack.id ? 'var(--accent)' : 'var(--bg-secondary)', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 16, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {pack.icon} {pack.name}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: 4, padding: 12, maxHeight: 200, overflowY: 'auto' }}>
            {(activePack?.stickers || []).map((sticker, i) => (
              <button key={i} onClick={() => { onSend(sticker); setShowStickers(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, padding: 4, borderRadius: 4 }}>
                {sticker}
              </button>
            ))}
          </div>
        </div>
      )}
      {isRecording && (
        <div style={{ padding: '8px 12px', background: '#fef2f2', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f44336', animation: 'pulse 1s infinite' }} />
          <span style={{ fontSize: 13, color: '#f44336', fontWeight: 600 }}>Recording {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
        </div>
      )}
      <form className="chat-input-form" onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button type="button" onClick={() => { setShowStickers(!showStickers); if (stickerPacks.length === 0) loadStickers(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: 4 }} title="Stickers">
          😊
        </button>
        <button type="button" onClick={isRecording ? stopRecording : startRecording}
          style={{ background: isRecording ? '#f44336' : 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: 4, borderRadius: '50%', color: isRecording ? 'white' : 'inherit' }}
          title={isRecording ? 'Stop recording' : 'Record voice message'}>
          🎤
        </button>
        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={handleChange}
          autoFocus
          style={{ flex: 1 }}
        />
        <button type="submit" className="send-btn" disabled={!text.trim()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </form>
    </div>
  );
}
