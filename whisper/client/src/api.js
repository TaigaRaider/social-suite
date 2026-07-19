const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getCsrfToken() {
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? match[1] : '';
}

async function request(path, options = {}) {
  const h = {};
  if (!(options.body instanceof FormData)) {
    h['Content-Type'] = 'application/json';
  }
  h['X-CSRF-Token'] = getCsrfToken();
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', ...options, headers: { ...h, ...options.headers } });
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const api = {
  login: (login, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ login, password }) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me'),
  updateMe: (data) => request('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  getUser: (id) => request(`/auth/user/${id}`),
  searchUsers: (q) => request(`/auth/search?q=${encodeURIComponent(q)}`),

  getFeed: (page = 1) => request(`/posts/feed?page=${page}`),
  getUserPosts: (userId) => request(`/posts/user/${userId}`),
  getThread: (id) => request(`/posts/thread/${id}`),
  createPost: (body) => request('/posts', { method: 'POST', body: JSON.stringify(body) }),
  deletePost: (id) => request(`/posts/${id}`, { method: 'DELETE' }),
  toggleLike: (id) => request(`/posts/${id}/like`, { method: 'POST' }),
  toggleRepost: (id) => request(`/posts/${id}/repost`, { method: 'POST' }),
  toggleBookmark: (id) => request(`/posts/${id}/bookmark`, { method: 'POST' }),
  getBookmarks: () => request('/posts/bookmarks'),
  getTrending: () => request('/posts/trending'),
  getScheduledPosts: () => request('/posts/scheduled'),
  cancelScheduled: (id) => request(`/posts/scheduled/${id}`, { method: 'DELETE' }),
  getPoll: (postId) => request(`/posts/${postId}/poll`),
  votePoll: (postId, optionId) => request(`/posts/${postId}/poll/vote`, { method: 'POST', body: JSON.stringify({ optionId }) }),

  toggleFollow: (userId) => request(`/follows/${userId}`, { method: 'POST' }),
  getFollowers: (userId) => request(`/follows/followers/${userId}`),
  getFollowing: (userId) => request(`/follows/following/${userId}`),
  getSuggestions: () => request('/follows/suggestions'),

  getNotifications: () => request('/notifications'),
  markNotificationsRead: () => request('/notifications/read', { method: 'PUT' }),
  getUnreadCount: () => request('/notifications/unread/count'),

  toggleReaction: (targetId, targetType, emoji) => request('/reactions', { method: 'POST', body: JSON.stringify({ targetId, targetType, emoji }) }),
  getReactions: (targetId, targetType) => request(`/reactions/${targetId}/${targetType}`),

  exportData: () => request('/export'),
  updateStatus: (status) => request('/auth/status', { method: 'PUT', body: JSON.stringify({ status }) }),
};

export default api;
