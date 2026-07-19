import { x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hmac } from '@noble/hashes/hmac.js';
import { bytesToHex, hexToBytes } from './keyGeneration.js';

const MESSAGE_KEY_SEED = new Uint8Array([0x01]);
const CHAIN_KEY_SEED = new Uint8Array([0x02]);

export function initializeRatchetState(rootKey, remotePublicKey = null) {
  const ratchetKeyPair = {
    privateKey: bytesToHex(x25519.utils.randomPrivateKey()),
    publicKey: null
  };
  ratchetKeyPair.publicKey = bytesToHex(x25519.getPublicKey(hexToBytes(ratchetKeyPair.privateKey)));

  return {
    rootKey,
    sendingChainKey: null,
    receivingChainKey: null,
    sendingMessageNumber: 0,
    receivingMessageNumber: 0,
    previousSendingChainLength: 0,
    sendingRatchetKey: ratchetKeyPair,
    remoteRatchetKey: remotePublicKey,
    remoteIdentityKey: null
  };
}

function chainKeyDerive(chainKeyHex, seed) {
  const chainKey = hexToBytes(chainKeyHex);
  const newChainKey = hmac(sha256, chainKey, CHAIN_KEY_SEED);
  const messageKey = hmac(sha256, chainKey, seed || MESSAGE_KEY_SEED);
  return {
    chainKey: bytesToHex(newChainKey),
    messageKey: bytesToHex(messageKey)
  };
}

function rootKeyDerive(rootKeyHex, dhOutput) {
  const rootKey = hexToBytes(rootKeyHex);
  const derived = hkdf(sha256, dhOutput, rootKey, 'Signal-Ratchet', 32);
  return bytesToHex(derived);
}

export function advanceSendingChain(state) {
  const { chainKey, messageKey } = chainKeyDerive(state.sendingChainKey);
  state.sendingChainKey = chainKey;
  state.sendingMessageNumber++;
  return { messageKey, messageNumber: state.sendingMessageNumber };
}

export function advanceReceivingChain(state) {
  const { chainKey, messageKey } = chainKeyDerive(state.receivingChainKey);
  state.receivingChainKey = chainKey;
  state.receivingMessageNumber++;
  return messageKey;
}

export function performDHRatchet(state, remoteRatchetPublicKey) {
  // Receiving chain
  const dhReceive = x25519.getSharedSecret(
    hexToBytes(state.sendingRatchetKey.privateKey),
    hexToBytes(remoteRatchetPublicKey)
  );
  state.rootKey = rootKeyDerive(state.rootKey, dhReceive);
  state.receivingChainKey = chainKeyDerive(state.rootKey).chainKey;
  state.previousSendingChainLength = state.sendingMessageNumber;
  state.sendingMessageNumber = 0;
  state.receivingMessageNumber = 0;
  state.remoteRatchetKey = remoteRatchetPublicKey;

  // New sending key pair
  state.sendingRatchetKey = {
    privateKey: bytesToHex(x25519.utils.randomPrivateKey()),
    publicKey: null
  };
  state.sendingRatchetKey.publicKey = bytesToHex(
    x25519.getPublicKey(hexToBytes(state.sendingRatchetKey.privateKey))
  );

  const dhSend = x25519.getSharedSecret(
    hexToBytes(state.sendingRatchetKey.privateKey),
    hexToBytes(remoteRatchetPublicKey)
  );
  state.rootKey = rootKeyDerive(state.rootKey, dhSend);
  state.sendingChainKey = chainKeyDerive(state.rootKey).chainKey;

  return state;
}

export function deriveHeader(state) {
  return {
    dhPublicKey: state.sendingRatchetKey.publicKey,
    previousChainLength: state.previousSendingChainLength,
    messageNumber: state.sendingMessageNumber
  };
}
