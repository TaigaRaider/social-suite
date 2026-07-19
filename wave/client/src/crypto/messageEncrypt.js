import { bytesToHex, hexToBytes } from './keyGeneration.js';

async function importKey(keyHex) {
  const keyBytes = hexToBytes(keyHex);
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptMessage(plaintext, messageKeyHex) {
  const key = await importKey(messageKeyHex);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return {
    ciphertext: bytesToHex(new Uint8Array(ciphertext)),
    nonce: bytesToHex(iv)
  };
}

export async function decryptMessage(ciphertextHex, nonceHex, messageKeyHex) {
  const key = await importKey(messageKeyHex);
  const ciphertext = hexToBytes(ciphertextHex);
  const iv = hexToBytes(nonceHex);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}
