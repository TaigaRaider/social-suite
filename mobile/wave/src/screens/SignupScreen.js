import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function SignupScreen({ navigation }) {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await signup(name.trim(), email.trim(), password);
    } catch (err) {
      Alert.alert('Signup Failed', err.message);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.logo}>Wave</Text>
        <Text style={styles.tagline}>Create your account</Text>

        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor="#8696a0"
          value={name}
          onChangeText={setName}
        />
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

        <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Log In</Text></Text>
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
