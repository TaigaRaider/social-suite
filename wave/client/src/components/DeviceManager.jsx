import { useState, useEffect, useCallback } from 'react';

const BREAKPOINTS = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
};

function useResponsive() {
  const [matches, setMatches] = useState({
    sm: false, md: false, lg: false
  });

  useEffect(() => {
    const mqLists = Object.entries(BREAKPOINTS).map(([key, query]) => {
      const mq = window.matchMedia(query);
      setMatches(prev => ({ ...prev, [key]: mq.matches }));
      const handler = (e) => setMatches(prev => ({ ...prev, [key]: e.matches }));
      mq.addListener(handler);
      return { mq, handler };
    });
    return () => mqLists.forEach(({ mq, handler }) => mq.removeListener(handler));
  }, []);

  return matches;
}

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DeviceManager({ api, onClose }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [currentDeviceId, setCurrentDeviceId] = useState(null);
  const responsive = useResponsive();

  const fetchDevices = useCallback(async () => {
    try {
      const data = await api.crypto.getDevices();
      setDevices(data.devices || []);
      const current = data.devices?.find(d => d.isCurrent);
      if (current) setCurrentDeviceId(current.deviceId);
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const handleRemoveDevice = async (deviceId) => {
    try {
      await api.crypto.removeDevice(deviceId);
      setDevices(prev => prev.filter(d => d.deviceId !== deviceId));
      setConfirmRemove(null);
    } catch (err) {
      alert('Failed to remove device');
    }
  };

  const handleSetActive = async (deviceId) => {
    try {
      await api.crypto.activateDevice(deviceId);
      setCurrentDeviceId(deviceId);
      setDevices(prev => prev.map(d => ({ ...d, isCurrent: d.deviceId === deviceId })));
    } catch (err) {
      alert('Failed to activate device');
    }
  };

  const getDeviceIcon = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('iphone') || n.includes('ipad') || n.includes('ios')) return '📱';
    if (n.includes('android')) return '📱';
    if (n.includes('windows') || n.includes('linux') || n.includes('mac')) return '💻';
    return '🖥️';
  };

  if (loading) {
    return (
      <div style={{ padding: responsive.lg ? '32px' : responsive.md ? '24px' : '16px', maxWidth: '800px', margin: '0 auto' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            height: '72px',
            background: '#f0f2f5',
            borderRadius: '12px',
            marginBottom: '12px',
            animation: 'pulse 1.5s infinite'
          }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{
      padding: responsive.lg ? '32px' : responsive.md ? '24px' : '16px',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{
            fontSize: responsive.lg ? '24px' : responsive.md ? '20px' : '18px',
            fontWeight: 600,
            margin: 0,
            color: '#1c1e21'
          }}>
            🔐 Linked Devices
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#65676b',
            margin: '4px 0 0 0'
          }}>
            Manage your encrypted devices. Each device has its own encryption keys.
          </p>
        </div>
        <button
          onClick={() => setShowAddDevice(true)}
          style={{
            background: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: responsive.sm ? '10px 20px' : '8px 16px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          + Link New Device
        </button>
      </div>

      {/* Device List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {devices.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: responsive.lg ? '48px 32px' : '32px 16px',
            background: '#f0f2f5',
            borderRadius: '12px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#1c1e21', margin: '0 0 8px 0' }}>
              No linked devices
            </p>
            <p style={{ fontSize: '14px', color: '#65676b', margin: 0 }}>
              Link your first device to start end-to-end encrypted messaging
            </p>
          </div>
        ) : (
          devices.map(device => (
            <div
              key={device.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: responsive.sm ? '16px' : '12px',
                padding: responsive.sm ? '16px 20px' : '12px 16px',
                background: device.deviceId === currentDeviceId ? '#e7f3ff' : 'white',
                border: `1px solid ${device.deviceId === currentDeviceId ? '#059669' : '#e4e6eb'}`,
                borderRadius: '12px',
                flexDirection: responsive.sm ? 'row' : 'column',
                textAlign: responsive.sm ? 'left' : 'center'
              }}
            >
              <div style={{ fontSize: '28px', flexShrink: 0 }}>
                {getDeviceIcon(device.deviceName)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: responsive.sm ? 'flex-start' : 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '15px', color: '#1c1e21' }}>
                    {device.deviceName || 'Unknown Device'}
                  </span>
                  {device.isCurrent && (
                    <span style={{
                      background: '#059669',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600
                    }}>
                      Current
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: '#65676b', marginTop: '4px' }}>
                  <span style={{ fontFamily: 'monospace' }}>
                    {device.deviceId?.slice(0, 8)}...{device.deviceId?.slice(-4)}
                  </span>
                  <span style={{ margin: '0 6px' }}>•</span>
                  <span>Last seen {timeAgo(device.lastSeenAt)}</span>
                </div>
              </div>
              <div style={{
                display: 'flex',
                gap: '8px',
                flexShrink: 0,
                flexDirection: responsive.sm ? 'row' : 'row'
              }}>
                {!device.isCurrent && (
                  <button
                    onClick={() => handleSetActive(device.deviceId)}
                    style={{
                      background: '#e4e6eb',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: '#1c1e21'
                    }}
                  >
                    Set Active
                  </button>
                )}
                {!device.isCurrent && (
                  <button
                    onClick={() => setConfirmRemove(device.deviceId)}
                    style={{
                      background: '#fee2e2',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: '#dc2626'
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Device Modal */}
      {showAddDevice && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '16px'
        }} onClick={() => setShowAddDevice(false)}>
          <div style={{
            background: 'white', borderRadius: '16px',
            padding: responsive.lg ? '32px' : responsive.md ? '24px' : '20px',
            maxWidth: '480px', width: '100%',
            maxHeight: '90vh', overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 16px 0', color: '#1c1e21' }}>
              Link New Device
            </h3>
            <div style={{
              background: '#f0f2f5',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📷</div>
              <p style={{ fontSize: '14px', color: '#65676b', margin: '0 0 16px 0' }}>
                Scan this QR code from the other device, or enter the linking code:
              </p>
              <div style={{
                background: 'white',
                borderRadius: '8px',
                padding: '16px',
                fontFamily: 'monospace',
                fontSize: '16px',
                letterSpacing: '2px',
                border: '2px dashed #059669'
              }}>
                {currentDeviceId || 'Loading...'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowAddDevice(false)}
                style={{
                  flex: 1, background: '#e4e6eb', border: 'none', borderRadius: '8px',
                  padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentDeviceId || '');
                  alert('Linking code copied!');
                }}
                style={{
                  flex: 1, background: '#059669', color: 'white', border: 'none', borderRadius: '8px',
                  padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Copy Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Remove Modal */}
      {confirmRemove && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '16px'
        }} onClick={() => setConfirmRemove(null)}>
          <div style={{
            background: 'white', borderRadius: '16px',
            padding: responsive.lg ? '32px' : '24px',
            maxWidth: '400px', width: '100%'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 12px 0', color: '#1c1e21' }}>
              Remove Device?
            </h3>
            <p style={{ fontSize: '14px', color: '#65676b', margin: '0 0 20px 0', lineHeight: '1.5' }}>
              This will delete all encryption keys and session data for this device. The device will no longer be able to decrypt messages.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setConfirmRemove(null)}
                style={{
                  flex: 1, background: '#e4e6eb', border: 'none', borderRadius: '8px',
                  padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveDevice(confirmRemove)}
                style={{
                  flex: 1, background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px',
                  padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
