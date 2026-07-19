const STORAGE_PREFIX = 'e2ee_session_';

export function saveSession(peerId, state) {
  const serialized = {
    ...state,
    sendingRatchetKey: state.sendingRatchetKey,
    createdAt: state.createdAt || Date.now()
  };
  localStorage.setItem(`${STORAGE_PREFIX}${peerId}`, JSON.stringify(serialized));
}

export function loadSession(peerId) {
  const data = localStorage.getItem(`${STORAGE_PREFIX}${peerId}`);
  if (!data) return null;
  return JSON.parse(data);
}

export function deleteSession(peerId) {
  localStorage.removeItem(`${STORAGE_PREFIX}${peerId}`);
}

export function listSessions() {
  const sessions = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(STORAGE_PREFIX)) {
      const peerId = key.replace(STORAGE_PREFIX, '');
      sessions.push({ peerId, ...JSON.parse(localStorage.getItem(key)) });
    }
  }
  return sessions;
}
