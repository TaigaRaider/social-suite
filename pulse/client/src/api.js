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

  getFriends: () => request('/friends'),
  addFriend: (userId) => request(`/friends/request/${userId}`, { method: 'POST' }),
  removeFriend: (userId) => request(`/friends/${userId}`, { method: 'DELETE' }),
  getSuggestions: () => request('/friends/suggestions'),

  getNotifications: () => request('/notifications'),
  markNotificationsRead: () => request('/notifications/read', { method: 'PUT' }),
  getUnreadNotifications: () => request('/notifications/unread/count'),
};
