import React, { useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from './src/components/SplashScreen';

import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import GroupChatScreen from './src/screens/GroupChatScreen';
import NewGroupScreen from './src/screens/NewGroupScreen';
import MembersScreen from './src/screens/MembersScreen';
import DeviceManagerScreen from './src/screens/DeviceManagerScreen';
import CallScreen from './src/screens/CallScreen';
import ThreadScreen from './src/screens/ThreadScreen';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: '#1f2c33' },
  headerTintColor: '#e9edef',
  headerTitleStyle: { fontWeight: '700' },
  contentStyle: { backgroundColor: '#111b21' },
};

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ ...screenOptions, headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Groups" component={GroupsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GroupChat" component={GroupChatScreen} />
      <Stack.Screen name="NewGroup" component={NewGroupScreen} options={{ title: 'New Group' }} />
      <Stack.Screen name="Members" component={MembersScreen} />
      <Stack.Screen name="DeviceManager" component={DeviceManagerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CallScreen" component={CallScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Thread" component={ThreadScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#111b21', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#00a884" />
      </View>
    );
  }

  return user ? <MainStack /> : <AuthStack />;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(() => !AsyncStorage.getItem('wave_splash_seen'));
  const handleSplashEnd = useCallback(() => {
    AsyncStorage.setItem('wave_splash_seen', '1');
    setShowSplash(false);
  }, []);

  return (
    <AuthProvider>
      {showSplash && <SplashScreen onAnimationEnd={handleSplashEnd} />}
      <NavigationContainer>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
