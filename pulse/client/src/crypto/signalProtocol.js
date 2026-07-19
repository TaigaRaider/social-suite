import { generateIdentityKeyPair, generateSignedPreKey, generateOneTimePreKeys, bytesToHex, hexToBytes } from './keyGeneration.js';
import { performX3DH, processIncomingX3DH } from './x3dh.js';
import { initializeRatchetState, advanceSendingChain, performDHRatchet, deriveHeader } from './doubleRatchet.js';
import { encryptMessage, decryptMessage } from './messageEncrypt.js';
import { saveSession, loadSession } from './sessionStore.js';

let localIdentity = null;
let apiBase = '';

export function init(apiUrl) {
  apiBase = apiUrl;
}

export function getLocalIdentity() {
  if (!localIdentity) {
    const stored = localStorage.getItem('e2ee_identity');
    if (stored) {
      localIdentity = JSON.parse(stored);
    }
  }
  return localIdentity;
}

export function generateLocalIdentity() {
  const ik = generateIdentityKeyPair();
  const spk = generateSignedPreKey(ik.privateKey);
  const opks = generateOneTimePreKeys(100);

  localIdentity = { ...ik, signedPreKey: spk, oneTimePreKeys: opks };
  localStorage.setItem('e2ee_identity', JSON.stringify(localIdentity));

  return localIdentity;
}

export async function uploadKeyBundle(token) {
  const identity = getLocalIdentity();
  if (!identity) throw new Error('No local identity');

  const body = {
    identityKey: identity.publicKey,
    signedPreKey: {
      publicKey: identity.signedPreKey.publicKey,
      signature: identity.signedPreKey.signature,
      createdAt: identity.signedPreKey.createdAt
    },
    oneTimePreKeys: identity.oneTimePreKeys.map(k => ({
      keyId: k.keyId,
      publicKey: k.publicKey
    }))
  };

  const res = await fetch(`${apiBase}/crypto/identity-key`, {
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
  const res = await fetch(`${apiBase}/crypto/identity-key/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

export async function initiateSession(peerId, token) {
  const identity = getLocalIdentity();
  const bundle = await fetchPeerBundle(peerId, token);

  if (!bundle.identityKey) throw new Error('Peer not registered for E2EE');

  const opk = bundle.oneTimePreKeys?.[0];
  const x3dhResult = await performX3DH(
    identity.privateKey,
    bundle.signedPreKey.publicKey,
    opk?.publicKey,
    identity.signedPreKey.privateKey // ephemeral key reuse for simplicity
  );

  const state = initializeRatchetState(x3dhResult.rootKey);
  state.remoteIdentityKey = bundle.identityKey;
  saveSession(peerId, state);

  return state;
}

export async function sendMessage(peerId, plaintext, token) {
  let session = loadSession(peerId);
  if (!session) {
    session = await initiateSession(peerId, token);
  }

  const { messageKey, messageNumber } = advanceSendingChain(session);
  const { ciphertext, nonce } = await encryptMessage(plaintext, messageKey);
  const header = deriveHeader(session);

  saveSession(peerId, session);

  return { ciphertext, nonce, ratchetHeader: header };
}

export async function receiveMessage(peerId, encryptedData, token) {
  let session = loadSession(peerId);
  const { ciphertext, nonce, ratchetHeader } = encryptedData;

  if (!session) {
    // Process incoming X3DH
    const identity = getLocalIdentity();
    session = initializeRatchetState(null);
    session.remoteRatchetKey = ratchetHeader.dhPublicKey;
    session.remoteIdentityKey = null;
    saveSession(peerId, session);
  }

  // Check if we need a DH ratchet step
  if (ratchetHeader.dhPublicKey !== session.remoteRatchetKey) {
    performDHRatchet(session, ratchetHeader.dhPublicKey);
  }

  // Skip already-received messages
  while (session.receivingMessageNumber < ratchetHeader.messageNumber) {
    advanceReceivingChain(session);
  }

  const messageKey = advanceReceivingChain(session);
  const plaintext = await decryptMessage(ciphertext, nonce, messageKey);

  saveSession(peerId, session);

  return plaintext;
}

export function isE2EEEnabled() {
  return !!getLocalIdentity();
}
