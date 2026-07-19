import { useEffect } from 'react';

const shortcuts = [
  { keys: ['Ctrl', 'K'], desc: 'Focus search' },
  { keys: ['/'], desc: 'Focus search' },
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3>Keyboard Shortcuts</h3>
          <button className="modal-close" onClick={onClose}>&#10005;</button>
        </div>
        <div style={{ padding: '8px 0' }}>
          {shortcuts.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: i < shortcuts.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 14 }}>{s.desc}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {s.keys.map((k, j) => (
                  <kbd key={j} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontFamily: 'monospace' }}>{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
