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
};
