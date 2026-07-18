import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../api';

export default function ChatInput({ onSend, groupId }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);
  const typingTimerRef = useRef(null);

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
    <div className="chat-input-area">
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
