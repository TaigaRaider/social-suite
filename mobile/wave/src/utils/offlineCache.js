import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'cache_';

export async function cacheData(key, data, ttlMs = 300000) {
  try {
    const entry = { data, expiresAt: Date.now() + ttlMs };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (e) { /* silent */ }
}

export async function getCachedData(key) {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch (e) { return null; }
}

export async function clearCache(pattern) {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = pattern
      ? keys.filter(k => k.startsWith(CACHE_PREFIX) && k.includes(pattern))
      : keys.filter(k => k.startsWith(CACHE_PREFIX));
    if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
  } catch (e) { /* silent */ }
}

export async function cacheFeed(key, posts) {
  return cacheData(key, posts, 300000);
}
