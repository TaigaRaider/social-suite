import React, { useState, useCallback } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from './src/components/SplashScreen';

import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import ConversationsScreen from './src/screens/ConversationsScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ChatScreen from './src/screens/ChatScreen';
import NewChatScreen from './src/screens/NewChatScreen';
import DeviceManagerScreen from './src/screens/DeviceManagerScreen';
import CallScreen from './src/screens/CallScreen';
import ThreadScreen from './src/screens/ThreadScreen';
import ContactImporterScreen from './src/screens/ContactImporterScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#16213e',
          borderTopColor: '#2a2a4a',
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingBottom: 4,
          height: 56,
        },
        tabBarActiveTintColor: '#0084ff',
        tabBarInactiveTintColor: '#8899a6',
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Conversations') iconName = 'chatbubbles';
          else if (route.name === 'Friends') iconName = 'people';
          else if (route.name === 'Profile') iconName = 'person';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Conversations" component={ConversationsScreen} />
      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
        options={{ tabBarLabel: 'Friends' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0084ff" />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <RootStack.Group>
          <RootStack.Screen name="Login" component={LoginScreen} />
          <RootStack.Screen name="Signup" component={SignupScreen} />
        </RootStack.Group>
      ) : (
        <RootStack.Group>
          <RootStack.Screen name="Main" component={MainTabs} />
          <RootStack.Screen
            name="Chat"
            component={ChatScreen}
            options={({ route }) => ({
              headerShown: true,
              headerTitle: route.params?.name || 'Chat',
              headerStyle: { backgroundColor: '#16213e' },
              headerTintColor: '#ffffff',
              headerTitleStyle: { fontWeight: '600' },
            })}
          />
          <RootStack.Screen
            name="NewChat"
            component={NewChatScreen}
            options={{
              headerShown: true,
              headerTitle: 'New Conversation',
              headerStyle: { backgroundColor: '#16213e' },
              headerTintColor: '#ffffff',
              headerTitleStyle: { fontWeight: '600' },
            }}
          />
          <RootStack.Screen
            name="DeviceManager"
            component={DeviceManagerScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen
            name="CallScreen"
            component={CallScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen
            name="Thread"
            component={ThreadScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen
            name="ContactImporter"
            component={ContactImporterScreen}
            options={{ headerShown: false }}
          />
        </RootStack.Group>
      )}
    </RootStack.Navigator>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(() => !AsyncStorage.getItem('pulse_splash_seen'));
  const handleSplashEnd = useCallback(() => {
    AsyncStorage.setItem('pulse_splash_seen', '1');
    setShowSplash(false);
  }, []);

  return (
    <AuthProvider>
      {showSplash && <SplashScreen onAnimationEnd={handleSplashEnd} />}
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
