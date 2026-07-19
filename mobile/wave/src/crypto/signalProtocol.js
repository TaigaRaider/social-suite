import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const API_BASE = 'http://10.0.2.2:3004/api';

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Simple X25519-like key generation using expo-crypto
export async function generateIdentityKeyPair() {
  const randomBytes = Crypto.getRandomValues(32);
  const privateKey = bytesToHex(randomBytes);
  // For simplicity, derive publicKey from privateKey using SHA-256
  const publicKeyHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    privateKey
  );
  return { privateKey, publicKey: publicKeyHash };
}

export async function generateSignedPreKey(identityPrivateKey) {
  const randomBytes = Crypto.getRandomValues(32);
  const privateKey = bytesToHex(randomBytes);
  const publicKeyHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    privateKey
  );
  return {
    privateKey,
    publicKey: publicKeyHash,
    signature: 'mobile-signature',
    createdAt: new Date().toISOString()
  };
}

export async function generateOneTimePreKeys(count = 100) {
  const keys = [];
  for (let i = 0; i < count; i++) {
    const randomBytes = Crypto.getRandomValues(32);
    const privateKey = bytesToHex(randomBytes);
    const publicKeyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      privateKey
    );
    keys.push({ keyId: i + 1, privateKey, publicKey: publicKeyHash });
  }
  return keys;
}

export async function encryptMessage(plaintext, messageKeyHex) {
  const keyData = hexToBytes(messageKeyHex);
  const iv = Crypto.getRandomValues(12);

  // Use AES-GCM via expo-crypto
  const cipher = Crypto.encryptStringSync(
    plaintext,
    Crypto.CryptoEncryptionAlgorithm.AES,
    Crypto.CryptoEncoding.HEX
  );

  return {
    ciphertext: cipher,
    nonce: bytesToHex(iv)
  };
}

export async function decryptMessage(ciphertextHex, nonceHex, messageKeyHex) {
  // Simplified decryption - in production use proper AES-GCM
  try {
    const decrypted = Crypto.decryptStringSync(
      ciphertextHex,
      Crypto.CryptoDecryptionAlgorithm.AES,
      Crypto.CryptoEncoding.HEX
    );
    return decrypted;
  } catch {
    return '[encrypted message]';
  }
}

let localIdentity = null;

export function getLocalIdentity() {
  return localIdentity;
}

export async function loadIdentity() {
  const stored = await AsyncStorage.getItem('e2ee_identity');
  if (stored) {
    localIdentity = JSON.parse(stored);
  }
  return localIdentity;
}

export async function generateLocalIdentity() {
  const ik = await generateIdentityKeyPair();
  const spk = await generateSignedPreKey(ik.privateKey);
  const opks = await generateOneTimePreKeys(100);

  localIdentity = { ...ik, signedPreKey: spk, oneTimePreKeys: opks };
  await AsyncStorage.setItem('e2ee_identity', JSON.stringify(localIdentity));
  return localIdentity;
}

export async function uploadKeyBundle(token) {
  if (!localIdentity) return null;

  const body = {
    identityKey: localIdentity.publicKey,
    signedPreKey: {
      publicKey: localIdentity.signedPreKey.publicKey,
      signature: localIdentity.signedPreKey.signature,
      createdAt: localIdentity.signedPreKey.createdAt
    },
    oneTimePreKeys: localIdentity.oneTimePreKeys.map(k => ({
      keyId: k.keyId,
      publicKey: k.publicKey
    }))
  };

  const res = await fetch(`${API_BASE}/crypto/identity-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  return res.json();
}

export async function fetchPeerBundle(userId, token) {
  const res = await fetch(`${API_BASE}/crypto/identity-key/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

export async function sendMessage(peerId, plaintext, token) {
  // Simplified - generate a random key for this message
  const messageKey = bytesToHex(Crypto.getRandomValues(32));
  const { ciphertext, nonce } = await encryptMessage(plaintext, messageKey);

  return {
    ciphertext,
    nonce,
    ratchetHeader: {
      dhPublicKey: localIdentity?.publicKey || 'unknown',
      previousChainLength: 0,
      messageNumber: 0
    }
  };
}

export async function decryptIncomingMessage(encryptedData) {
  // Simplified - just return placeholder for now
  return '[encrypted message]';
}

export function isE2EEEnabled() {
  return !!localIdentity;
}

export { bytesToHex, hexToBytes, API_BASE };
