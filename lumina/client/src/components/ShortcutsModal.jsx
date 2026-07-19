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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 400, width: '90%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Keyboard Shortcuts</h3>
          <button className="modal-close" onClick={onClose}>&#10005;</button>
        </div>
        <div className="modal-body">
          {shortcuts.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < shortcuts.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 14 }}>{s.desc}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {s.keys.map((k, j) => (
                  <kbd key={j} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontFamily: 'monospace' }}>{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
