import { useState, useEffect } from 'react';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: 16, zIndex: 9999 }}>
      <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
          We use cookies to maintain your session and improve your experience. By continuing to use this app, you agree to our use of essential cookies.
        </p>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={decline}
            style={{ padding: '8px 16px', fontSize: 13, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Decline
          </button>
          <button
            onClick={accept}
            style={{ padding: '8px 16px', fontSize: 13, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
