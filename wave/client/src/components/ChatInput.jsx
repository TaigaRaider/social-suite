import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../api';

export default function ChatInput({ onSend, groupId }) {
  const [text, setText] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [stickerPacks, setStickerPacks] = useState([]);
  const [activePack, setActivePack] = useState(null);
  const textareaRef = useRef(null);
  const typingTimerRef = useRef(null);

  const loadStickers = async () => {
    try {
      const res = await fetch('/api/crypto/stickers', { headers: { Authorization: `Bearer ${localStorage.getItem('wave_token')}` } });
      const data = await res.json();
      setStickerPacks(data.packs || []);
      if (data.packs?.length > 0) setActivePack(data.packs[0]);
    } catch {}
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [text]);

  const emitTyping = useCallback(() => {
    if (!groupId) return;
    if (typingTimerRef.current) return;
    api.messages.emitTyping(groupId).catch(() => {});
    typingTimerRef.current = setTimeout(() => {
      typingTimerRef.current = null;
    }, 2000);
  }, [groupId]);

  const handleChange = (e) => {
    setText(e.target.value);
    emitTyping();
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
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
      <button type="button" onClick={() => { setShowStickers(!showStickers); if (stickerPacks.length === 0) loadStickers(); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: 4, alignSelf: 'flex-end', marginBottom: 2 }} title="Stickers">
        😊
      </button>
      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
        />
      </div>
      <button className="send-btn" onClick={handleSubmit} disabled={!text.trim()}>
        &#9654;
      </button>
    </div>
  );
}
