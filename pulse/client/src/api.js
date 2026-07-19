const BASE = '/api';

async function request(url, options = {}) {
  const token = localStorage.getItem('pulse_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${url}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),
  getUser: (id) => request(`/auth/user/${id}`),
  updateMe: (data) => request('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  searchUsers: (q) => request(`/auth/search?q=${encodeURIComponent(q)}`),
  updateStatus: (status) => request('/auth/status', { method: 'PUT', body: JSON.stringify({ status }) }),

  getConversations: () => request('/conversations'),
  createConversation: (userId) => request('/conversations', { method: 'POST', body: JSON.stringify({ userId }) }),
  getMessages: (convId) => request(`/conversations/${convId}/messages`),
  sendMessage: (convId, content) => request(`/conversations/${convId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
  getUnreadCount: () => request('/conversations/unread/count'),
  emitTyping: (conversationId) => request('/conversations/typing', { method: 'POST', body: JSON.stringify({ conversationId }) }),
  getTyping: (conversationId) => request(`/conversations/typing/${conversationId}`),
  searchMessages: (q) => request(`/conversations/search?q=${encodeURIComponent(q)}`),

  getFriends: () => request('/friends'),
  addFriend: (userId) => request(`/friends/request/${userId}`, { method: 'POST' }),
  removeFriend: (userId) => request(`/friends/${userId}`, { method: 'DELETE' }),
  getSuggestions: () => request('/friends/suggestions'),

  getNotifications: () => request('/notifications'),
  markNotificationsRead: () => request('/notifications/read', { method: 'PUT' }),
  getUnreadNotifications: () => request('/notifications/unread/count'),

  toggleReaction: (targetId, targetType, emoji) => request('/reactions', { method: 'POST', body: JSON.stringify({ targetId, targetType, emoji }) }),
  getReactions: (targetId, targetType) => request(`/reactions/${targetId}/${targetType}`),

  exportData: () => request('/export'),

  // E2EE methods
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
  },
};
