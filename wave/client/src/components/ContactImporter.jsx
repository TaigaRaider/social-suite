import { useState, useEffect } from 'react';

export default function ContactImporter({ api, onClose }) {
  const [contacts, setContacts] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualEmail, setManualEmail] = useState('');

  useEffect(() => { loadContacts(); }, []);

  const loadContacts = async () => {
    try {
      const data = await api.crypto.getContacts();
      setContacts(data.contacts || []);
    } catch {}
  };

  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      let parsed = [];

      if (file.name.endsWith('.csv')) {
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const nameIdx = headers.findIndex(h => h.includes('name'));
        const phoneIdx = headers.findIndex(h => h.includes('phone'));
        const emailIdx = headers.findIndex(h => h.includes('email'));

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',');
          if (cols.length > 1) {
            parsed.push({
              name: cols[nameIdx]?.trim() || 'Unknown',
              phone: cols[phoneIdx]?.trim() || null,
              email: cols[emailIdx]?.trim() || null
            });
          }
        }
      } else if (file.name.endsWith('.json')) {
        parsed = JSON.parse(text);
      }

      const data = await api.crypto.importContacts(parsed);
      setResult(data);
      loadContacts();
    } catch (err) {
      alert('Failed to parse file. Use CSV or JSON format.');
    }
    setImporting(false);
  };

  const handleManualAdd = async () => {
    if (!manualName.trim()) return;

    try {
      await api.crypto.importContacts([{ name: manualName, phone: manualPhone, email: manualEmail }]);
      setManualName(''); setManualPhone(''); setManualEmail('');
      loadContacts();
    } catch {}
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const data = await api.crypto.syncContacts();
      setResult(data);
      loadContacts();
    } catch {}
    setSyncing(false);
  };

  const handleDelete = async (contactId) => {
    try {
      await api.crypto.deleteContact(contactId);
      setContacts(prev => prev.filter(c => c.id !== contactId));
    } catch {}
  };

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Contacts</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>&times;</button>
      </div>

      <div style={{ background: 'var(--surface-secondary, #f1f5f9)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px 0' }}>Import Contacts</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)', margin: '0 0 12px 0' }}>
          Upload a CSV or JSON file with name, phone, and/or email fields.
        </p>
        <input type="file" accept=".csv,.json" onChange={handleFileImport}
          style={{ fontSize: 14, marginBottom: 12 }} disabled={importing} />
        {importing && <div style={{ fontSize: 13, color: '#8b5cf6' }}>Importing...</div>}
        {result && (
          <div style={{ fontSize: 13, color: '#10b981', marginTop: 8 }}>
            Imported {result.imported} contacts, {result.matched || 0} matched to existing users.
          </div>
        )}
      </div>

      <div style={{ background: 'var(--surface-secondary, #f1f5f9)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px 0' }}>Add Contact</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Name"
            style={{ padding: '8px 12px', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, fontSize: 14 }} />
          <input value={manualPhone} onChange={e => setManualPhone(e.target.value)} placeholder="Phone (optional)"
            style={{ padding: '8px 12px', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, fontSize: 14 }} />
          <input value={manualEmail} onChange={e => setManualEmail(e.target.value)} placeholder="Email (optional)"
            style={{ padding: '8px 12px', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, fontSize: 14 }} />
          <button onClick={handleManualAdd} disabled={!manualName.trim()}
            style={{ padding: '10px 16px', background: manualName.trim() ? '#8b5cf6' : '#ccc', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Add Contact
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <button onClick={handleSync} disabled={syncing}
          style={{ padding: '10px 16px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {syncing ? 'Syncing...' : 'Sync Contacts'}
        </button>
      </div>

      <div>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px 0' }}>Your Contacts ({contacts.length})</h3>
        {contacts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary, #64748b)' }}>
            No contacts yet. Import or add some above.
          </div>
        ) : (
          contacts.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: c.contactUserId ? '#10b981' : 'var(--surface-secondary, #f1f5f9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.contactUserId ? 'white' : '#64748b', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                {c.contactUserId ? '\u2713' : c.name[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)' }}>
                  {c.phone || ''} {c.email || ''}
                  {c.contactUserId && <span style={{ color: '#10b981', marginLeft: 8 }}> On Wave</span>}
                </div>
              </div>
              <button onClick={() => handleDelete(c.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14, padding: 4 }}>
                x
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
