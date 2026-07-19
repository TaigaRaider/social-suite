import * as Linking from 'expo-linking';

const APP_SCHEME = {
  nexus: 'facebook',
  lumina: 'lumina',
  pulse: 'pulse',
  wave: 'wave',
  whisper: 'whisper',
};

export function getDeepLink(appName) {
  return APP_SCHEME[appName] || appName;
}

export function useInitialURL() {
  const url = Linking.useURL();
  if (!url) return null;
  const parsed = Linking.parse(url);
  return {
    path: parsed.path,
    queryParams: parsed.queryParams,
    hostname: parsed.hostname,
  };
}

export function openDeepLink(url) {
  Linking.openURL(url);
}

export function createShareLink(path, params = {}) {
  const baseUrl = Linking.createURL('');
  const queryString = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return `${baseUrl}${path}${queryString ? '?' + queryString : ''}`;
}
