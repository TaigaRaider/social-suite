import Constants from 'expo-constants';
const API = Constants.expoConfig?.extra?.apiUrl || 'http://10.0.2.2:3004/api';

async function request(endpoint, options = {}) {
  const { token, ...rest } = options;
  const headers = { 'Content-Type': 'application/json', ...rest.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${endpoint}`, { ...rest, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

export const api = {
  signup: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getProfile: (token) => request('/auth/me', { token }),

  getGroups: (token) => request('/groups', { token }),
  createGroup: (body, token) => request('/groups', { method: 'POST', body: JSON.stringify(body), token }),
  getGroup: (id, token) => request(`/groups/${id}`, { token }),
  getGroupMembers: (id, token) => request(`/groups/${id}/members`, { token }),
  addMember: (id, body, token) => request(`/groups/${id}/members`, { method: 'POST', body: JSON.stringify(body), token }),
  removeMember: (id, userId, token) => request(`/groups/${id}/members/${userId}`, { method: 'DELETE', token }),

  getMessages: (groupId, token, before) => {
    let url = `/groups/${groupId}/messages`;
    if (before) url += `?before=${before}`;
    return request(url, { token });
  },
  sendMessage: (groupId, body, token) => request(`/groups/${groupId}/messages`, { method: 'POST', body: JSON.stringify(body), token }),

  getFriends: (token) => request('/friends', { token }),
  sendFriendRequest: (userId, token) => request('/friends/request', { method: 'POST', body: JSON.stringify({ userId }), token }),
  acceptFriendRequest: (userId, token) => request(`/friends/accept/${userId}`, { method: 'PUT', token }),
  declineFriendRequest: (userId, token) => request(`/friends/decline/${userId}`, { method: 'PUT', token }),

  getNotifications: (token) => request('/notifications', { token }),
  markNotificationRead: (id, token) => request(`/notifications/${id}/read`, { method: 'PUT', token }),
};
