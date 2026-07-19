import { x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from './keyGeneration.js';

export async function computeSharedSecret(privateKeyHex, publicKeyHex) {
  const shared = x25519.getSharedSecret(hexToBytes(privateKeyHex), hexToBytes(publicKeyHex));
  return shared;
}

export async function performX3DH(ikPrivate, spkPublic, opkPublic, ekPrivate) {
  // DH1 = X25519(IK_private, SPK_public)
  const dh1 = x25519.getSharedSecret(hexToBytes(ikPrivate), hexToBytes(spkPublic));

  // DH2 = X25519(EK_private, IK_remote_public) - need to get IK from bundle
  // DH3 = X25519(EK_private, SPK_public)
  const dh3 = x25519.getSharedSecret(hexToBytes(ekPrivate), hexToBytes(spkPublic));

  // DH4 = X25519(EK_private, OPK_public)
  let dh4 = new Uint8Array(32);
  if (opkPublic) {
    dh4 = x25519.getSharedSecret(hexToBytes(ekPrivate), hexToBytes(opkPublic));
  }

  // Combine DH outputs
  const combined = new Uint8Array(dh1.length + dh3.length + dh4.length);
  combined.set(dh1, 0);
  combined.set(dh3, dh1.length);
  combined.set(dh4, dh1.length + dh3.length);

  // Derive root key using HKDF
  const rootKey = hkdf(sha256, combined, new Uint8Array(32), 'X3DH-Signal-Protocol', 32);

  return {
    rootKey: bytesToHex(rootKey),
    sharedSecret: bytesToHex(combined)
  };
}

export async function processIncomingX3DH(ikPrivate, ekPublic, spkPrivate, opkPrivate, senderIdentityPublic) {
  // DH1 = X25519(SPK_private, IK_public) - from sender
  const dh1 = x25519.getSharedSecret(hexToBytes(spkPrivate), hexToBytes(senderIdentityPublic));

  // DH2 = X25519(IK_private, EK_public) - from sender
  const dh2 = x25519.getSharedSecret(hexToBytes(ikPrivate), hexToBytes(ekPublic));

  // DH3 = X25519(SPK_private, EK_public)
  const dh3 = x25519.getSharedSecret(hexToBytes(spkPrivate), hexToBytes(ekPublic));

  // DH4 = X25519(OPK_private, EK_public)
  let dh4 = new Uint8Array(32);
  if (opkPrivate) {
    dh4 = x25519.getSharedSecret(hexToBytes(opkPrivate), hexToBytes(ekPublic));
  }

  const combined = new Uint8Array(dh1.length + dh2.length + dh3.length + dh4.length);
  combined.set(dh1, 0);
  combined.set(dh2, dh1.length);
  combined.set(dh3, dh1.length + dh2.length);
  combined.set(dh4, dh1.length + dh2.length + dh3.length);

  const rootKey = hkdf(sha256, combined, new Uint8Array(32), 'X3DH-Signal-Protocol', 32);

  return {
    rootKey: bytesToHex(rootKey),
    sharedSecret: bytesToHex(combined)
  };
}
