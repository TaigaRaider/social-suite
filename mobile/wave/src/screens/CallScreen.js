import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function CallScreen({ route, navigation }) {
  const { sessionId, callType, peerName, isIncoming, peerId } = route.params;
  const [status, setStatus] = useState(isIncoming ? 'ringing' : 'connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      if (status === 'active') setDuration(d => d + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    navigation.goBack();
  };

  return (
    <View style={[styles.container, callType === 'video' && styles.videoContainer]}>
      {callType === 'video' ? (
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoPlaceholderText}>Video Call</Text>
        </View>
      ) : (
        <View style={styles.voiceContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{peerName?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <Text style={styles.peerName}>{peerName}</Text>
          <Text style={styles.status}>
            {status === 'ringing' ? 'Ringing...' : status === 'connecting' ? 'Connecting...' : formatDuration(duration)}
          </Text>
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={() => setIsMuted(!isMuted)}>
          <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🔊'}</Text>
          <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        {callType === 'video' && (
          <TouchableOpacity style={styles.controlBtn} onPress={() => setIsVideoEnabled(!isVideoEnabled)}>
            <Text style={styles.controlIcon}>{isVideoEnabled ? '📹' : '📷'}</Text>
            <Text style={styles.controlLabel}>{isVideoEnabled ? 'Camera Off' : 'Camera On'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.controlBtn, styles.endCallBtn]} onPress={handleEndCall}>
          <Text style={styles.controlIcon}>📞</Text>
          <Text style={styles.controlLabel}>End</Text>
        </TouchableOpacity>
      </View>

      {isIncoming && status === 'ringing' && (
        <View style={styles.incomingControls}>
          <TouchableOpacity style={[styles.answerBtn]} onPress={() => setStatus('active')}>
            <Text style={styles.answerBtnText}>📞 Answer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.declineBtn]} onPress={handleEndCall}>
            <Text style={styles.declineBtnText}>✕ Decline</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  videoContainer: {},
  voiceContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#00a884', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  avatarText: { fontSize: 48, color: 'white', fontWeight: '700' },
  peerName: { fontSize: 24, fontWeight: '600', color: 'white', marginBottom: 8 },
  status: { fontSize: 16, color: '#a0a0b0' },
  videoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  videoPlaceholderText: { color: '#666', fontSize: 18 },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 32, paddingBottom: 48, paddingHorizontal: 32 },
  controlBtn: { alignItems: 'center', gap: 4 },
  controlIcon: { fontSize: 28 },
  controlLabel: { fontSize: 12, color: '#a0a0b0' },
  endCallBtn: { marginTop: -8 },
  incomingControls: { position: 'absolute', bottom: 120, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 24 },
  answerBtn: { backgroundColor: '#4caf50', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 32 },
  answerBtnText: { color: 'white', fontSize: 18, fontWeight: '600' },
  declineBtn: { backgroundColor: '#f44336', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 32 },
  declineBtnText: { color: 'white', fontSize: 18, fontWeight: '600' },
});
