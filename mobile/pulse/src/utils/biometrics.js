import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

let LocalAuthentication = null;

async function getLocalAuth() {
  if (LocalAuthentication === null) {
    try {
      const mod = await import('expo-local-authentication');
      LocalAuthentication = mod.default || mod;
    } catch (e) {
      LocalAuthentication = false;
    }
  }
  return LocalAuthentication;
}

export async function isBiometricAvailable() {
  const LA = await getLocalAuth();
  if (!LA) return false;
  try {
    const compatible = await LA.hasHardwareAsync();
    const enrolled = await LA.isEnrolledAsync();
    return compatible && enrolled;
  } catch (e) { return false; }
}

export async function authenticateWithBiometrics() {
  const LA = await getLocalAuth();
  if (!LA) return false;
  try {
    const result = await LA.authenticateAsync({
      promptMessage: 'Authenticate to continue',
      cancelLabel: 'Use password',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch (e) { return false; }
}

export async function isBiometricEnabled() {
  try {
    return (await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY)) === 'true';
  } catch (e) { return false; }
}

export async function setBiometricEnabled(enabled) {
  await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, String(enabled));
}
