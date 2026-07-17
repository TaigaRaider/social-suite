import { useState } from 'react';

export default function ChatInput({ onSend }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <div className="chat-input-area">
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={e => setText(e.target.value)}
          autoFocus
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
