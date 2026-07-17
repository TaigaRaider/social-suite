import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      Alert.alert('Login Failed', err.message);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.logo}>Wave</Text>
        <Text style={styles.tagline}>Group messaging, reimagined</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#8696a0"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#8696a0"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log In</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.link}>Don't have an account? <Text style={styles.linkBold}>Sign Up</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111b21' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  logo: { fontSize: 42, fontWeight: '800', color: '#00a884', textAlign: 'center', marginBottom: 4 },
  tagline: { fontSize: 14, color: '#8696a0', textAlign: 'center', marginBottom: 40 },
  input: {
    backgroundColor: '#202c33',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#e9edef',
    fontSize: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#313d45',
  },
  button: {
    backgroundColor: '#00a884',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  link: { color: '#8696a0', textAlign: 'center', fontSize: 14 },
  linkBold: { color: '#00a884', fontWeight: '700' },
});
