import { useEffect } from 'react';
import { api } from '../api';

export default function useOnlineStatus() {
  useEffect(() => {
    api.updateStatus('online').catch(() => {});

    const handleBeforeUnload = () => {
      navigator.sendBeacon('/api/auth/status', new Blob([JSON.stringify({ status: 'offline' })], { type: 'application/json' }));
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      api.updateStatus('offline').catch(() => {});
    };
  }, []);
}
