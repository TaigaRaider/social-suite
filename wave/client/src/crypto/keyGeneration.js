import { x25519 } from '@noble/curves/ed25519.js';

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

export function generateIdentityKeyPair() {
  const privateKey = x25519.utils.randomPrivateKey();
  const publicKey = x25519.getPublicKey(privateKey);
  return {
    privateKey: bytesToHex(privateKey),
    publicKey: bytesToHex(publicKey)
  };
}

export function generateSignedPreKey(identityPrivateKey) {
  const privateKey = x25519.utils.randomPrivateKey();
  const publicKey = x25519.getPublicKey(privateKey);

  // Sign the public key with identity key (using Ed25519)
  const identityPrivBytes = hexToBytes(identityPrivateKey);
  // For simplicity, use HMAC-SHA256 as signature (real Signal uses Ed25519)
  // In production, use ed25519.sign() with proper key conversion
  const signature = 'placeholder-signature'; // Will be computed properly

  return {
    privateKey: bytesToHex(privateKey),
    publicKey: bytesToHex(publicKey),
    signature,
    createdAt: new Date().toISOString()
  };
}

export function generateOneTimePreKeys(count = 100) {
  const keys = [];
  for (let i = 0; i < count; i++) {
    const privateKey = x25519.utils.randomPrivateKey();
    const publicKey = x25519.getPublicKey(privateKey);
    keys.push({
      keyId: i + 1,
      privateKey: bytesToHex(privateKey),
      publicKey: bytesToHex(publicKey)
    });
  }
  return keys;
}

export { bytesToHex, hexToBytes };
