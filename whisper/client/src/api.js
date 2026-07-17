const API_BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('whisper_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('whisper_token');
    localStorage.removeItem('whisper_user_id');
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
  getMe: () => request('/auth/me'),
  updateMe: (data) => request('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  getUser: (id) => request(`/auth/user/${id}`),
  searchUsers: (q) => request(`/auth/search?q=${encodeURIComponent(q)}`),

  getFeed: (page = 1) => request(`/posts/feed?page=${page}`),
  getUserPosts: (userId) => request(`/posts/user/${userId}`),
  getThread: (id) => request(`/posts/thread/${id}`),
  createPost: (content, replyToId) => request('/posts', { method: 'POST', body: JSON.stringify({ content, replyToId }) }),
  deletePost: (id) => request(`/posts/${id}`, { method: 'DELETE' }),
  toggleLike: (id) => request(`/posts/${id}/like`, { method: 'POST' }),
  toggleRepost: (id) => request(`/posts/${id}/repost`, { method: 'POST' }),
  toggleBookmark: (id) => request(`/posts/${id}/bookmark`, { method: 'POST' }),
  getBookmarks: () => request('/posts/bookmarks'),
  getTrending: () => request('/posts/trending'),

  toggleFollow: (userId) => request(`/follows/${userId}`, { method: 'POST' }),
  getFollowers: (userId) => request(`/follows/followers/${userId}`),
  getFollowing: (userId) => request(`/follows/following/${userId}`),
  getSuggestions: () => request('/follows/suggestions'),

  getNotifications: () => request('/notifications'),
  markNotificationsRead: () => request('/notifications/read', { method: 'PUT' }),
  getUnreadCount: () => request('/notifications/unread/count'),
};

export default api;
