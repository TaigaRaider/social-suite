import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://10.0.2.2:3003/api';

async function getToken() {
  return AsyncStorage.getItem('token');
}

async function request(endpoint, options = {}) {
  const token = await getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || 'Request failed');
  }

  return data;
}

export const api = {
  // Auth
  async login(email, password) {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) await AsyncStorage.setItem('token', data.token);
    return data;
  },

  async signup(name, email, password) {
    const data = await request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    if (data.token) await AsyncStorage.setItem('token', data.token);
    return data;
  },

  async logout() {
    await AsyncStorage.removeItem('token');
  },

  async getMe() {
    return request('/api/auth/me');
  },

  // Conversations
  async getConversations() {
    return request('/api/conversations');
  },

  async createConversation(userId) {
    return request('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  async getMessages(conversationId, before = null) {
    const qs = before ? `?before=${before}` : '';
    return request(`/api/conversations/${conversationId}/messages${qs}`);
  },

  async sendMessage(conversationId, content) {
    return request(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  // Friends / Users
  async searchUsers(query) {
    return request(`/api/users/search?q=${encodeURIComponent(query)}`);
  },

  async getFriends() {
    return request('/api/friends');
  },

  async sendFriendRequest(userId) {
    return request('/api/friends/request', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  async acceptFriendRequest(requestId) {
    return request(`/api/friends/accept/${requestId}`, { method: 'POST' });
  },

  async declineFriendRequest(requestId) {
    return request(`/api/friends/decline/${requestId}`, { method: 'POST' });
  },

  // Notifications
  async getNotifications() {
    return request('/api/notifications');
  },

  async markNotificationRead(id) {
    return request(`/api/notifications/${id}/read`, { method: 'POST' });
  },

  // Stickers
  async getStickers() {
    return request('/api/crypto/stickers');
  },

  async getMyStickers() {
    return request('/api/crypto/stickers/mine');
  },

  async installStickerPack(packId) {
    return request(`/api/crypto/stickers/install/${packId}`, { method: 'POST' });
  },

  async uninstallStickerPack(packId) {
    return request(`/api/crypto/stickers/install/${packId}`, { method: 'DELETE' });
  },
};
