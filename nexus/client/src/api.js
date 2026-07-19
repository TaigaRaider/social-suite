const API = '/api';

function headers() {
  const token = localStorage.getItem('token');
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function request(path, opts = {}) {
  const h = headers();
  if (!(opts.body instanceof FormData)) {
    h['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${API}${path}`, { headers: h, ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function uploadImage(file) {
  const form = new FormData();
  form.append('image', file);
  const token = localStorage.getItem('token');
  const res = await fetch(`${API}/posts/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),
  updateMe: (body) => request('/auth/me', { method: 'PUT', body: JSON.stringify(body) }),
  getUser: (id) => request(`/auth/user/${id}`),
  searchUsers: (q) => request(`/auth/search?q=${encodeURIComponent(q)}`),

  getFeed: () => request('/posts/feed'),
  getUserPosts: (userId) => request(`/posts/user/${userId}`),
  createPost: (body) => request('/posts', { method: 'POST', body: JSON.stringify(body) }),
  deletePost: (id) => request(`/posts/${id}`, { method: 'DELETE' }),
  likePost: (id) => request(`/posts/${id}/like`, { method: 'POST' }),
  getComments: (id) => request(`/posts/${id}/comments`),
  addComment: (id, body) => request(`/posts/${id}/comments`, { method: 'POST', body: JSON.stringify(body) }),
  uploadImage,
  getScheduledPosts: () => request('/posts/scheduled'),
  cancelScheduled: (id) => request(`/posts/scheduled/${id}`, { method: 'DELETE' }),
  getPoll: (postId) => request(`/posts/${postId}/poll`),
  votePoll: (postId, optionId) => request(`/posts/${postId}/poll/vote`, { method: 'POST', body: JSON.stringify({ optionId }) }),

  getFriends: () => request('/friends'),
  getFriendRequests: () => request('/friends/requests'),
  sendFriendRequest: (userId) => request(`/friends/request/${userId}`, { method: 'POST' }),
  acceptFriend: (id) => request(`/friends/accept/${id}`, { method: 'PUT' }),
  declineFriend: (id) => request(`/friends/decline/${id}`, { method: 'PUT' }),
  removeFriend: (userId) => request(`/friends/${userId}`, { method: 'DELETE' }),
  getSuggestions: () => request('/friends/suggestions'),

  getConversations: () => request('/messages/conversations'),
  getMessages: (userId) => request(`/messages/${userId}`),
  sendMessage: (userId, body) => request(`/messages/${userId}`, { method: 'POST', body: JSON.stringify(body) }),
  getUnreadCount: () => request('/messages/unread/count'),

  getNotifications: () => request('/notifications'),
  markNotificationsRead: () => request('/notifications/read', { method: 'PUT' }),
  getUnreadNotifications: () => request('/notifications/unread/count'),

  toggleReaction: (targetId, targetType, emoji) => request('/reactions', { method: 'POST', body: JSON.stringify({ targetId, targetType, emoji }) }),
  getReactions: (targetId, targetType) => request(`/reactions/${targetId}/${targetType}`),

  getAnalyticsInsights: () => request('/analytics/insights'),
  getAnalyticsTrends: () => request('/analytics/trends'),
  getAnalyticsTopPosts: () => request('/analytics/top-posts'),

  exportData: () => request('/export'),
  updateStatus: (status) => request('/auth/status', { method: 'PUT', body: JSON.stringify({ status }) }),

  adminStats: () => request('/admin/stats'),
  adminReports: (status) => request(`/admin/reports${status ? `?status=${status}` : ''}`),
  adminUpdateReport: (id, status) => request(`/admin/reports/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
  adminUsers: (page = 1, limit = 20) => request(`/admin/users?page=${page}&limit=${limit}`),
  adminBanUser: (id) => request(`/admin/users/${id}/ban`, { method: 'PUT' }),
  adminDeletePost: (id) => request(`/admin/posts/${id}`, { method: 'DELETE' }),
  adminAllPosts: (page = 1, limit = 20) => request(`/posts?page=${page}&limit=${limit}`),
};
