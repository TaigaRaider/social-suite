import { useState, useEffect } from 'react';

const shortcuts = [
  { keys: ['Ctrl', 'K'] or [' / '], desc: 'Focus search' },
  { keys: ['N'], desc: 'New post' },
  { keys: ['Esc'], desc: 'Close modal' },
  { keys: ['?'], desc: 'Show shortcuts' },
];

export default function ShortcutsModal({ onClose }) {
  useEffect(() => {
    function handler(e) {
      if (e.type === 'shortcut:close') onClose();
    }
    window.addEventListener('shortcut:close', handler);
    return () => window.removeEventListener('shortcut:close', handler);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={onClose}>
      <div className="card" style={{ width: 400, padding: 0 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--fb-light-gray)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Keyboard Shortcuts</h3>
          <span style={{ cursor: 'pointer', fontSize: 20, color: 'var(--fb-gray)' }} onClick={onClose}>×</span>
        </div>
        <div style={{ padding: '12px 20px' }}>
          {shortcuts.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < shortcuts.length - 1 ? '1px solid var(--fb-light-gray)' : 'none' }}>
              <span style={{ fontSize: 14, color: 'var(--fb-dark)' }}>{s.desc}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {s.keys.map((k, j) => (
                  <kbd key={j} style={{ background: 'var(--fb-light-gray)', border: '1px solid #ccc', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontFamily: 'monospace' }}>{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
