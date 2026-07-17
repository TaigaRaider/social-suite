import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
const BASE = Constants.expoConfig?.extra?.apiUrl || 'http://10.0.2.2:3001/api';

async function getToken() {
  return AsyncStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = await getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Request failed');
  }
  return data;
}

function get(path) {
  return request(path, { method: 'GET' });
}

function post(path, body) {
  return request(path, { method: 'POST', body: JSON.stringify(body) });
}

function put(path, body) {
  return request(path, { method: 'PUT', body: JSON.stringify(body) });
}

function del(path) {
  return request(path, { method: 'DELETE' });
}

export const api = {
  auth: {
    register: (data) => post('/auth/register', data),
    login: (data) => post('/auth/login', data),
    me: () => get('/auth/me'),
    updateMe: (data) => put('/auth/me', data),
    getUser: (id) => get(`/auth/users/${id}`),
    searchUsers: (q) => get(`/auth/users/search?q=${encodeURIComponent(q)}`),
  },

  posts: {
    getFeed: (page = 1) => get(`/posts/feed?page=${page}`),
    getUserPosts: (userId, page = 1) => get(`/posts/user/${userId}?page=${page}`),
    createPost: (data) => post('/posts', data),
    deletePost: (id) => del(`/posts/${id}`),
    likePost: (id) => post(`/posts/${id}/like`),
    getComments: (id, page = 1) => get(`/posts/${id}/comments?page=${page}`),
    addComment: (id, data) => post(`/posts/${id}/comments`, data),
  },

  friends: {
    getFriends: () => get('/friends'),
    getFriendRequests: () => get('/friends/requests'),
    sendFriendRequest: (userId) => post('/friends/request', { userId }),
    acceptFriend: (userId) => post(`/friends/accept/${userId}`),
    declineFriend: (userId) => post(`/friends/decline/${userId}`),
    removeFriend: (userId) => del(`/friends/${userId}`),
    getSuggestions: () => get('/friends/suggestions'),
  },

  messages: {
    getConversations: () => get('/messages/conversations'),
    getMessages: (userId, page = 1) => get(`/messages/${userId}?page=${page}`),
    sendMessage: (userId, data) => post(`/messages/${userId}`, data),
    getUnreadCount: () => get('/messages/unread'),
  },

  notifications: {
    getNotifications: (page = 1) => get(`/notifications?page=${page}`),
    markRead: (id) => put(`/notifications/${id}/read`),
    getUnreadCount: () => get('/notifications/unread'),
  },
};

export default api;
