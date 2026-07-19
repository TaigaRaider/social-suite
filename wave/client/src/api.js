const BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('wave_token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error(`Request failed (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const api = {
  auth: {
    register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request('/auth/me'),
    getUser: (id) => request(`/auth/user/${id}`),
    updateProfile: (body) => request('/auth/me', { method: 'PUT', body: JSON.stringify(body) }),
    search: (q) => request(`/auth/search?q=${encodeURIComponent(q)}`),
  },
  groups: {
    list: () => request('/groups'),
    create: (body) => request('/groups', { method: 'POST', body: JSON.stringify(body) }),
    get: (id) => request(`/groups/${id}`),
    update: (id, body) => request(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    addMember: (id, userId) => request(`/groups/${id}/members`, { method: 'POST', body: JSON.stringify({ userId }) }),
    removeMember: (id, userId) => request(`/groups/${id}/members/${userId}`, { method: 'DELETE' }),
    delete: (id) => request(`/groups/${id}`, { method: 'DELETE' }),
  },
  messages: {
    list: (groupId) => request(`/messages/group/${groupId}`),
    send: (groupId, content, replyToId) => request(`/messages/group/${groupId}`, { method: 'POST', body: JSON.stringify({ content, replyToId }) }),
    unreadCount: () => request('/messages/unread/count'),
    emitTyping: (groupId) => request(`/messages/typing/${groupId}`, { method: 'POST' }),
    getTyping: (groupId) => request(`/messages/typing/${groupId}`),
    markRead: (groupId) => request(`/messages/mark-read/${groupId}`, { method: 'PUT' }),
    search: (q) => request(`/messages/search?q=${encodeURIComponent(q)}`),
  },
  friends: {
    list: () => request('/friends'),
    add: (userId) => request(`/friends/request/${userId}`, { method: 'POST' }),
    remove: (userId) => request(`/friends/${userId}`, { method: 'DELETE' }),
    suggestions: () => request('/friends/suggestions'),
  },
  notifications: {
    list: () => request('/notifications'),
    unreadCount: () => request('/notifications/unread/count'),
    markRead: () => request('/notifications/read', { method: 'PUT' }),
  },
  reactions: {
    toggle: (targetId, targetType, emoji) => request('/reactions', { method: 'POST', body: JSON.stringify({ targetId, targetType, emoji }) }),
    get: (targetId, targetType) => request(`/reactions/${targetId}/${targetType}`),
  },
  exportData: () => request('/export'),
  updateStatus: (status) => request('/auth/status', { method: 'PUT', body: JSON.stringify({ status }) }),
  crypto: {
    uploadKeyBundle: (bundle) => request('/crypto/identity-key', { method: 'POST', body: JSON.stringify(bundle) }),
    getPeerBundle: (userId) => request(`/crypto/identity-key/${userId}`),
    rotateSignedPreKey: (data) => request('/crypto/identity-key/rotate-signed-prekey', { method: 'POST', body: JSON.stringify(data) }),
    replenishPreKeys: (keys) => request('/crypto/identity-key/replenish-prekeys', { method: 'POST', body: JSON.stringify({ oneTimePreKeys: keys }) }),
    sendPreKeyBundle: (data) => request('/crypto/session/prekey-bundle', { method: 'POST', body: JSON.stringify(data) }),
    getPreKeyBundles: () => request('/crypto/session/prekey-bundles'),
    acknowledgePreKey: (id) => request(`/crypto/session/prekey-bundles/${id}`, { method: 'DELETE' }),
    relayMessage: (data) => request('/crypto/message/relay', { method: 'POST', body: JSON.stringify(data) }),
    getSafetyNumber: (peerId) => request(`/crypto/safety-number/${peerId}`),
    verifySafetyNumber: (peerId) => request(`/crypto/safety-number/${peerId}/verify`, { method: 'POST' }),
    getSafetyNumberStatus: (peerId) => request(`/crypto/safety-number/${peerId}/status`),
    removeSafetyNumber: (peerId) => request(`/crypto/safety-number/${peerId}`, { method: 'DELETE' }),
    getNotifications: (limit = 20) => request(`/crypto/notifications?limit=${limit}`),
    markNotificationRead: (id) => request('/crypto/notifications/read', { method: 'PUT', body: JSON.stringify({ ids: [id] }) }),
    markAllNotificationsRead: () => request('/crypto/notifications/read', { method: 'PUT' }),
    registerPushToken: (token, platform, deviceId) => request('/crypto/push/register', { method: 'POST', body: JSON.stringify({ token, platform, deviceId }) }),
    markMessageRead: (messageId) => request(`/crypto/messages/${messageId}/read`, { method: 'POST' }),
    getMessageStatus: (messageId) => request(`/crypto/messages/${messageId}/status`),
    initiateCall: (receiverId, callType) => request('/crypto/calls/initiate', { method: 'POST', body: JSON.stringify({ receiverId, callType }) }),
    answerCall: (sessionId) => request(`/crypto/calls/${sessionId}/answer`, { method: 'POST' }),
    endCall: (sessionId, reason) => request(`/crypto/calls/${sessionId}/end`, { method: 'POST', body: JSON.stringify({ reason }) }),
    rejectCall: (sessionId) => request(`/crypto/calls/${sessionId}/reject`, { method: 'POST' }),
    getCallHistory: (limit = 20) => request(`/crypto/calls/history?limit=${limit}`),
    initGroupEncryption: (groupId) => request(`/crypto/group/${groupId}/init`, { method: 'POST' }),
    distributeGroupKey: (groupId, data) => request(`/crypto/group/${groupId}/distribute`, { method: 'POST', body: JSON.stringify(data) }),
    getGroupKeys: (groupId) => request(`/crypto/group/${groupId}/keys`),
    rotateGroupKey: (groupId) => request(`/crypto/group/${groupId}/rotate`, { method: 'POST' }),
    getGroupMembers: (groupId) => request(`/crypto/groups/${groupId}/members`),
    muteGroupMember: (groupId, userId, muted) => request(`/crypto/groups/${groupId}/members/${userId}/mute`, { method: 'PUT', body: JSON.stringify({ muted }) }),
    kickGroupMember: (groupId, userId) => request(`/crypto/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),
    banGroupMember: (groupId, userId, banned) => request(`/crypto/groups/${groupId}/members/${userId}/ban`, { method: 'PUT', body: JSON.stringify({ banned }) }),
    updateGroupSettings: (groupId, settings) => request(`/crypto/groups/${groupId}/settings`, { method: 'PUT', body: JSON.stringify(settings) }),
    updateMemberRole: (groupId, userId, role) => request(`/crypto/groups/${groupId}/members/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
    leaveGroup: (groupId) => request(`/crypto/groups/${groupId}/leave`, { method: 'POST' }),
    transferGroupOwnership: (groupId, newOwnerId) => request(`/crypto/groups/${groupId}/transfer`, { method: 'PUT', body: JSON.stringify({ newOwnerId }) }),
    getThread: (messageId, limit = 50) => request(`/crypto/messages/${messageId}/thread?limit=${limit}`),
    getMessageDetails: (messageId) => request(`/crypto/messages/${messageId}/details`),
    getVoiceMessage: (messageId) => request(`/crypto/messages/${messageId}/voice`),
    getStickers: () => request('/crypto/stickers'),
    getMyStickers: () => request('/crypto/stickers/mine'),
    installStickerPack: (packId) => request(`/crypto/stickers/install/${packId}`, { method: 'POST' }),
    uninstallStickerPack: (packId) => request(`/crypto/stickers/install/${packId}`, { method: 'DELETE' }),
    importContacts: (contacts) => request('/crypto/contacts/import', { method: 'POST', body: JSON.stringify({ contacts }) }),
    getContacts: () => request('/crypto/contacts'),
    syncContacts: () => request('/crypto/contacts/sync', { method: 'POST' }),
    deleteContact: (id) => request(`/crypto/contacts/${id}`, { method: 'DELETE' }),
    searchMessages: (q, limit = 20) => request(`/crypto/search/messages?q=${encodeURIComponent(q)}&limit=${limit}`),
    searchUsers: (q, limit = 20) => request(`/crypto/search/users?q=${encodeURIComponent(q)}&limit=${limit}`),
    searchGroups: (q, limit = 20) => request(`/crypto/search/groups?q=${encodeURIComponent(q)}&limit=${limit}`),
  },
};
