import React, { useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from './src/components/SplashScreen';

import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import ComposeScreen from './src/screens/ComposeScreen';
import ActivityScreen from './src/screens/ActivityScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ThreadScreen from './src/screens/ThreadScreen';
import BookmarksScreen from './src/screens/BookmarksScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: '#181818' },
  animation: 'slide_from_right',
};

function TabIcon({ label, focused }) {
  let icon = '•';
  switch (label) {
    case 'HomeTab': icon = '🏠'; break;
    case 'SearchTab': icon = '🔍'; break;
    case 'ComposeTab': icon = '+'; break;
    case 'ActivityTab': icon = '♡'; break;
    case 'ProfileTab': icon = '👤'; break;
  }
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        backgroundColor: label === 'ComposeTab' ? '#fff' : 'transparent',
        width: label === 'ComposeTab' ? 44 : 'auto',
        height: label === 'ComposeTab' ? 28 : 'auto',
        borderRadius: label === 'ComposeTab' ? 14 : 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <View style={{ opacity: focused ? 1 : 0.5 }}>
          <View style={{
            fontSize: label === 'ComposeTab' ? 22 : 20,
            color: '#fff',
            fontWeight: focused ? '700' : '400',
          }}>
            {/* React Native doesn't support fontSize on View, use Text below */}
          </View>
        </View>
      </View>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#181818',
          borderTopColor: '#363636',
          borderTopWidth: 0.5,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#777',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused }) => {
          let icon = '';
          switch (route.name) {
            case 'HomeTab': icon = focused ? '🏠' : '🏠'; break;
            case 'SearchTab': icon = focused ? '🔍' : '🔍'; break;
            case 'ComposeTab': icon = '+'; break;
            case 'ActivityTab': icon = focused ? '♥' : '♡'; break;
            case 'ProfileTab': icon = focused ? '👤' : '👤'; break;
          }
          if (route.name === 'ComposeTab') {
            return (
              <View style={{
                backgroundColor: focused ? '#fff' : '#363636',
                width: 48,
                height: 30,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <View style={{
                  backgroundColor: focused ? '#000' : '#fff',
                  width: 20,
                  height: 2,
                  borderRadius: 1,
                }} />
                <View style={{
                  backgroundColor: focused ? '#000' : '#fff',
                  width: 2,
                  height: 20,
                  borderRadius: 1,
                  position: 'absolute',
                }} />
              </View>
            );
          }
          return null;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ tabBarLabel: '' }} />
      <Tab.Screen name="SearchTab" component={SearchScreen} options={{ tabBarLabel: '' }} />
      <Tab.Screen name="ComposeTab" component={ComposeScreen} options={{ tabBarLabel: '' }} />
      <Tab.Screen name="ActivityTab" component={ActivityScreen} options={{ tabBarLabel: '' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ tabBarLabel: '' }} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="Thread" component={ThreadScreen} />
      <Stack.Screen name="Compose" component={ComposeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Bookmarks" component={BookmarksScreen} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#181818', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#777" size="large" />
      </View>
    );
  }

  return user ? <AppStack /> : <AuthStack />;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(() => !AsyncStorage.getItem('whisper_splash_seen'));
  const handleSplashEnd = useCallback(() => {
    AsyncStorage.setItem('whisper_splash_seen', '1');
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
