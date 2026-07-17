const BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('lumina_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),
  getUser: (id) => request(`/auth/user/${id}`),
  updateMe: (body) => request('/auth/me', { method: 'PUT', body: JSON.stringify(body) }),
  searchUsers: (q) => request(`/auth/search?q=${encodeURIComponent(q)}`),

  // Posts
  getFeed: () => request('/posts/feed'),
  getUserPosts: (userId) => request(`/posts/user/${userId}`),
  createPost: (body) => request('/posts', { method: 'POST', body: JSON.stringify(body) }),
  deletePost: (id) => request(`/posts/${id}`, { method: 'DELETE' }),
  toggleLike: (id) => request(`/posts/${id}/like`, { method: 'POST' }),
  getComments: (id) => request(`/posts/${id}/comments`),
  addComment: (id, body) => request(`/posts/${id}/comments`, { method: 'POST', body: JSON.stringify(body) }),
  getExplore: () => request('/posts/explore'),

  // Follows
  toggleFollow: (userId) => request(`/follows/${userId}`, { method: 'POST' }),
  getFollowers: (userId) => request(`/follows/followers/${userId}`),
  getFollowing: (userId) => request(`/follows/following/${userId}`),
  getSuggestions: () => request('/follows/suggestions'),

  // Stories
  getStories: () => request('/stories'),
  createStory: (body) => request('/stories', { method: 'POST', body: JSON.stringify(body) }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markRead: () => request('/notifications/read', { method: 'PUT' }),
  getUnreadCount: () => request('/notifications/unread/count'),
};
