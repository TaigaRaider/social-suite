const API = '/api';

function headers() {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function request(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { headers: headers(), ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
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
};
