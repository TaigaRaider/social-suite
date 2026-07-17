import Constants from 'expo-constants';
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://10.0.2.2:3005/api';

async function request(path, options = {}) {
  const token = await AsyncStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || 'Request failed');
  }

  return data;
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const api = {
  login: (email, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signup: (name, username, email, password) =>
    request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, username, email, password }),
    }),

  getMe: () => request('/api/auth/me'),

  getFeed: (page = 1) => request(`/api/posts/feed?page=${page}&limit=20`),

  getFollowingFeed: (page = 1) => request(`/api/posts/following?page=${page}&limit=20`),

  getTrending: (page = 1) => request(`/api/posts/trending?page=${page}&limit=20`),

  getPost: (id) => request(`/api/posts/${id}`),

  createPost: (content) =>
    request('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  deletePost: (id) =>
    request(`/api/posts/${id}`, { method: 'DELETE' }),

  likePost: (id) =>
    request(`/api/posts/${id}/like`, { method: 'POST' }),

  unlikePost: (id) =>
    request(`/api/posts/${id}/like`, { method: 'DELETE' }),

  repostPost: (id) =>
    request(`/api/posts/${id}/repost`, { method: 'POST' }),

  unrepostPost: (id) =>
    request(`/api/posts/${id}/repost`, { method: 'DELETE' }),

  bookmarkPost: (id) =>
    request(`/api/posts/${id}/bookmark`, { method: 'POST' }),

  unbookmarkPost: (id) =>
    request(`/api/posts/${id}/bookmark`, { method: 'DELETE' }),

  getBookmarks: (page = 1) =>
    request(`/api/posts/bookmarks?page=${page}&limit=20`),

  getReplies: (id, page = 1) =>
    request(`/api/posts/${id}/replies?page=${page}&limit=20`),

  replyToPost: (id, content) =>
    request(`/api/posts/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  searchPosts: (q, page = 1) =>
    request(`/api/posts/search?q=${encodeURIComponent(q)}&page=${page}&limit=20`),

  searchUsers: (q, page = 1) =>
    request(`/api/users/search?q=${encodeURIComponent(q)}&page=${page}&limit=20`),

  getProfile: (username) => request(`/api/users/${username}`),

  getUserPosts: (username, page = 1) =>
    request(`/api/users/${username}/posts?page=${page}&limit=20`),

  updateProfile: (data) =>
    request('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  followUser: (username) =>
    request(`/api/users/${username}/follow`, { method: 'POST' }),

  unfollowUser: (username) =>
    request(`/api/users/${username}/follow`, { method: 'DELETE' }),

  getNotifications: (page = 1) =>
    request(`/api/notifications?page=${page}&limit=20`),

  markNotificationsRead: () =>
    request('/api/notifications/read', { method: 'POST' }),
};

export default api;
