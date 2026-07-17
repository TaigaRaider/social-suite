import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const MAX_CHARS = 500;

export default function ComposeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);

  const remaining = MAX_CHARS - content.length;
  const overLimit = remaining < 0;
  const canPost = content.trim().length > 0 && !overLimit;

  const handlePost = async () => {
    if (!canPost || posting) return;
    setPosting(true);
    try {
      await api.createPost(content.trim());
      setContent('');
      navigation.navigate('HomeTab');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setPosting(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelBtn}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
          onPress={handlePost}
          disabled={!canPost || posting}
        >
          <Text style={styles.postBtnText}>
            {posting ? '...' : 'Post'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.username}>@{user?.username || 'you'}</Text>
        <TextInput
          style={styles.textarea}
          placeholder="What's on your mind?"
          placeholderTextColor="#555"
          value={content}
          onChangeText={setContent}
          multiline
          autoFocus
          maxLength={600}
        />
      </View>

      <View style={styles.footer}>
        <Text
          style={[
            styles.charCount,
            remaining <= 20 && remaining >= 0 && styles.charCountWarning,
            overLimit && styles.charCountOver,
          ]}
        >
          {remaining}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#363636',
  },
  cancelBtn: {
    color: '#fff',
    fontSize: 15,
  },
  postBtn: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  postBtnDisabled: {
    opacity: 0.4,
  },
  postBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  username: {
    color: '#777',
    fontSize: 15,
    marginBottom: 12,
  },
  textarea: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 24,
  },
  footer: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  charCount: {
    color: '#777',
    fontSize: 13,
  },
  charCountWarning: {
    color: '#f5a623',
  },
  charCountOver: {
    color: '#f91880',
  },
});
