const BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('lumina_token');
  const h = {};
  if (!(options.body instanceof FormData)) {
    h['Content-Type'] = 'application/json';
  }
  if (token) h['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers: { ...h, ...options.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function uploadImage(file) {
  const form = new FormData();
  form.append('image', file);
  const token = localStorage.getItem('lumina_token');
  const res = await fetch(`${BASE}/posts/upload`, {
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
  getUser: (id) => request(`/auth/user/${id}`),
  updateMe: (body) => request('/auth/me', { method: 'PUT', body: JSON.stringify(body) }),
  searchUsers: (q) => request(`/auth/search?q=${encodeURIComponent(q)}`),

  getFeed: () => request('/posts/feed'),
  getUserPosts: (userId) => request(`/posts/user/${userId}`),
  createPost: (body) => request('/posts', { method: 'POST', body: JSON.stringify(body) }),
  deletePost: (id) => request(`/posts/${id}`, { method: 'DELETE' }),
  toggleLike: (id) => request(`/posts/${id}/like`, { method: 'POST' }),
  getComments: (id) => request(`/posts/${id}/comments`),
  addComment: (id, body) => request(`/posts/${id}/comments`, { method: 'POST', body: JSON.stringify(body) }),
  getExplore: () => request('/posts/explore'),
  uploadImage,
  getScheduledPosts: () => request('/posts/scheduled'),
  cancelScheduled: (id) => request(`/posts/scheduled/${id}`, { method: 'DELETE' }),

  toggleFollow: (userId) => request(`/follows/${userId}`, { method: 'POST' }),
  getFollowers: (userId) => request(`/follows/followers/${userId}`),
  getFollowing: (userId) => request(`/follows/following/${userId}`),
  getSuggestions: () => request('/follows/suggestions'),

  getStories: () => request('/stories'),
  createStory: (body) => request('/stories', { method: 'POST', body: JSON.stringify(body) }),

  getNotifications: () => request('/notifications'),
  markRead: () => request('/notifications/read', { method: 'PUT' }),
  getUnreadCount: () => request('/notifications/unread/count'),

  toggleReaction: (targetId, targetType, emoji) => request('/reactions', { method: 'POST', body: JSON.stringify({ targetId, targetType, emoji }) }),
  getReactions: (targetId, targetType) => request(`/reactions/${targetId}/${targetType}`),

  reactStory: (storyId, emoji) => request(`/stories/${storyId}/react`, { method: 'POST', body: JSON.stringify({ emoji }) }),
  getStoryReactions: (storyId) => request(`/stories/${storyId}/reactions`),

  exportData: () => request('/export'),
  updateStatus: (status) => request('/auth/status', { method: 'PUT', body: JSON.stringify({ status }) }),
};
