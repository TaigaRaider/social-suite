import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'e2ee_session_';

export async function saveSession(peerId, state) {
  await AsyncStorage.setItem(`${STORAGE_PREFIX}${peerId}`, JSON.stringify(state));
}

export async function loadSession(peerId) {
  const data = await AsyncStorage.getItem(`${STORAGE_PREFIX}${peerId}`);
  return data ? JSON.parse(data) : null;
}

export async function deleteSession(peerId) {
  await AsyncStorage.removeItem(`${STORAGE_PREFIX}${peerId}`);
}
