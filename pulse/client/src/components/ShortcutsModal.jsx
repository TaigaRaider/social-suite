import { useEffect } from 'react';

const shortcuts = [
  { keys: ['Ctrl', 'K'] or [' / '], desc: 'Focus search' },
  { keys: ['N'], desc: 'New conversation' },
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
      <div style={{ background: 'var(--bg-primary)', borderRadius: 12, padding: 0, width: 400, maxWidth: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Keyboard Shortcuts</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18 }}>&#10005;</button>
        </div>
        <div style={{ padding: '8px 20px 16px' }}>
          {shortcuts.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < shortcuts.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
              <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{s.desc}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {s.keys.map((k, j) => (
                  <kbd key={j} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
