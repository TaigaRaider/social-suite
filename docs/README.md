# Social Suite Documentation

A complete suite of 5 social media platforms, each with a unique identity and modern dark-mode design.

---

## Apps Overview

| App | Inspired By | Description | Ports | Theme |
|-----|------------|-------------|-------|-------|
| **Facebook** | Facebook | Full social network with friends, posts, messaging | 3001 / 5173 | Blue & white |
| **Lumina** | Instagram | Photo-sharing with stories, grid feed, explore | 3002 / 5174 | Purple-pink gradient |
| **Pulse** | Messenger | Instant messaging with chat bubbles, online status | 3003 / 5175 | Electric blue |
| **Wave** | WhatsApp | Group messaging with communities, dark teal UI | 3004 / 5176 | Teal green |
| **Whisper** | Threads | Text-based microblogging with threads, minimal design | 3005 / 5177 | Minimalist black |

---

## Tech Stack

- **Backend:** Node.js + Express + SQLite (sql.js WASM) + JWT auth
- **Frontend (Web):** React + Vite + React Router
- **Frontend (Mobile):** React Native + Expo + React Navigation
- **Database:** SQLite via sql.js (zero native dependencies)
- **Auth:** JWT tokens with bcrypt password hashing

---

## Quick Start

### Run All Apps
```bash
# Windows
start-all.bat

# Or run individually
cd facebook && npm run dev     # Port 5173
cd lumina && npm run dev       # Port 5174
cd pulse && npm run dev        # Port 5175
cd wave && npm run dev         # Port 5176
cd whisper && npm run dev      # Port 5177
```

### Run a Single App
Each app has its own `server/`, `client/`, and `mobile/` directories:
```bash
# Start backend
cd <app>/server && npm install && npm run dev

# Start web frontend (in another terminal)
cd <app>/client && npm install && npm run dev

# Start mobile app (in another terminal)
cd <app>/mobile && npx expo start
```

---

## App Details

### 1. Facebook
**Port:** Backend 3001 / Frontend 5173

The original social network clone. Create posts, add friends, chat in DMs, and manage your profile.

**Features:**
- User registration & login
- News feed from friends
- Create/delete posts
- Like & comment on posts
- Send/accept/decline friend requests
- Direct messaging with conversations
- Notifications (likes, comments, friend requests, messages)
- User profiles with bio editing
- Search users
- Friend suggestions

---

### 2. Lumina
**Port:** Backend 3002 / Frontend 5174
**Theme:** Purple-to-pink gradient, dark mode

A visual-first photo-sharing platform inspired by Instagram. Share images, post stories, and explore content.

**Features:**
- User registration & login
- Photo feed from followed users
- Create posts with image URLs & captions
- Like & comment on posts
- Follow/unfollow users
- Stories (24-hour auto-expiring)
- Explore page (discover random posts)
- User profiles with post grid layout (3 columns)
- Follower/following counts
- People you may know suggestions
- Notifications

**Design:**
- Dark UI (#0a0a0a, #1a1a1a)
- Gradient accent colors (#833ab4 → #fd1d1d → #fc466b)
- Square image grid on profiles
- Glassmorphism cards
- Stories with gradient ring borders

---

### 3. Pulse
**Port:** Backend 3003 / Frontend 5175
**Theme:** Electric blue, dark messenger-style

A real-time instant messaging platform inspired by Messenger. Chat with friends in a clean, modern interface.

**Features:**
- User registration & login
- 1-on-1 conversations
- Real-time message polling (3s interval)
- Online/offline status indicators
- Unread message badges
- Message read receipts
- Friend management
- Search users to start new chats
- Split-pane layout (conversation list + chat)
- Date separators in chat

**Design:**
- Dark UI (#1a1a2e, #16213e, #0f3460)
- Electric blue accents (#0084ff, #00c6ff)
- Sent messages = blue gradient bubbles
- Received messages = dark gray bubbles
- Green online status dots
- Smooth animations

---

### 4. Wave
**Port:** Backend 3004 / Frontend 5176
**Theme:** Teal green, WhatsApp-inspired

A group messaging platform inspired by WhatsApp. Create groups, manage members, and communicate with communities.

**Features:**
- User registration & login
- Create named groups
- Add/remove group members
- Group messaging with sender names
- Member list management
- Admin role for group creators
- Friend system for adding group members
- Unread message counts
- Search users
- Notifications
- Auto-resizing message input

**Design:**
- Dark UI (#111b21, #1f2c33, #202c33)
- Teal/green accents (#00a884, #25d366)
- Sent messages = dark green (#005c4b)
- Received messages = dark teal-gray
- Sender names colored per member
- WhatsApp-style sidebar layout

---

### 5. Whisper
**Port:** Backend 3005 / Frontend 5177
**Theme:** Minimalist black/white, Twitter/Threads-inspired

A text-first microblogging platform inspired by Threads. Share thoughts, create threads, and engage in conversations.

**Features:**
- User registration & login
- Text posts (500 char limit)
- Threaded replies (thread view)
- Like & repost posts
- Bookmark posts
- Follow/unfollow users
- Following/For You feed tabs
- Trending posts
- Thread view with reply chains
- User profiles with stats
- Search users
- Notifications

**Design:**
- Background: #181818
- Cards: #262626
- Borders: #363636
- Pure white text
- Thread reply lines (vertical connectors)
- Minimalist sidebar navigation (desktop) / bottom bar (mobile)
- Character counter on compose
- Clean typography with generous whitespace

---

## Project Structure

```
facebook-project/
├── facebook/              # Facebook clone
│   ├── server/            # Express API (port 3001)
│   ├── client/            # React web (port 5173)
│   └── mobile/            # React Native / Expo
├── lumina/                # Instagram clone
│   ├── server/            # Express API (port 3002)
│   ├── client/            # React web (port 5174)
│   └── mobile/            # React Native / Expo
├── pulse/                 # Messenger clone
│   ├── server/            # Express API (port 3003)
│   ├── client/            # React web (port 5175)
│   └── mobile/            # React Native / Expo
├── wave/                  # WhatsApp clone
│   ├── server/            # Express API (port 3004)
│   ├── client/            # React web (port 5176)
│   └── mobile/            # React Native / Expo
├── whisper/               # Threads clone
│   ├── server/            # Express API (port 3005)
│   ├── client/            # React web (port 5177)
│   └── mobile/            # React Native / Expo
├── docs/                  # Documentation
│   └── README.md
├── start-all.bat          # Start all web apps at once
└── README.md              # This file
```

---

## Mobile Apps

Each app includes a React Native / Expo mobile version with native navigation and platform-specific styling.

### Running Mobile Apps
```bash
# Ensure backend is running first
cd <app>/server && npm run dev

# Start the Expo dev server
cd <app>/mobile && npx expo start

# Then scan QR code with Expo Go app (Android/iOS)
# Or press 'a' for Android emulator, 'i' for iOS simulator
```

### Mobile Tech Stack
- **Framework:** React Native (Expo managed workflow)
- **Navigation:** React Navigation (native stack + bottom tabs)
- **Storage:** AsyncStorage for auth tokens
- **API:** Same backend endpoints as web apps
- **Backend URL:** `http://10.0.2.2:<port>` (Android emulator) / `http://localhost:<port>` (iOS)

### Mobile Features by App

| App | Navigation | Key Mobile Features |
|-----|-----------|-------------------|
| **Facebook** | Bottom tabs (Feed, Friends, Messages, Notifications, Profile) | Pull-to-refresh, comment modal, real-time chat |
| **Lumina** | Bottom tabs (Home, Explore, Create, Activity, Profile) | Stories bar, 3-column grid, gradient accents |
| **Pulse** | Stack (Conversations → Chat) | Real-time polling, online indicators, FAB |
| **Wave** | Stack (Groups → GroupChat, NewGroup) | Group creation, member management, colored sender names |
| **Whisper** | Bottom tabs (Home, Search, Compose, Activity, Profile) | Thread view, character counter, trending posts |

---

## API Reference

All apps share a similar API structure:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/me` | PUT | Update profile |
| `/api/auth/search?q=` | GET | Search users |

### App-Specific Endpoints

**Facebook:** `/api/posts`, `/api/friends`, `/api/messages`, `/api/notifications`
**Lumina:** `/api/posts`, `/api/follows`, `/api/stories`, `/api/notifications`
**Pulse:** `/api/conversations`, `/api/friends`, `/api/notifications`
**Wave:** `/api/groups`, `/api/messages`, `/api/friends`, `/api/notifications`
**Whisper:** `/api/posts`, `/api/follows`, `/api/notifications`

---

## Database Schema Summary

| App | Tables |
|-----|--------|
| Facebook | users, posts, likes, comments, friendships, messages, notifications |
| Lumina | users, posts, likes, comments, follows, stories, notifications |
| Pulse | users, conversations, conversation_members, messages, friends, notifications |
| Wave | users, groups, group_members, messages, friends, notifications |
| Whisper | users, posts, likes, reposts, bookmarks, follows, notifications |

---

## App Store Deployment

Each mobile app is a standalone Expo project ready for Google Play Store and Apple App Store submission.

### Bundle Identifiers

| App | Package (Android) | Bundle ID (iOS) |
|-----|-------------------|-----------------|
| Facebook | `com.socialsuite.facebook` | `com.socialsuite.facebook` |
| Lumina | `com.socialsuite.lumina` | `com.socialsuite.lumina` |
| Pulse | `com.socialsuite.pulse` | `com.socialsuite.pulse` |
| Wave | `com.socialsuite.wave` | `com.socialsuite.wave` |
| Whisper | `com.socialsuite.whisper` | `com.socialsuite.whisper` |

### Prerequisites
1. Install EAS CLI: `npm install -g eas-cli`
2. Create an Expo account at [expo.dev](https://expo.dev)
3. Login: `eas login`
4. For Android: Google Play Console developer account ($25 one-time)
5. For iOS: Apple Developer account ($99/year)

### Before Publishing Checklist
For each app:
- [ ] Replace placeholder icons with designed 1024x1024 PNG icons
- [ ] Replace splash screen with branded design
- [ ] Set production `API_URL` environment variable to your hosted backend
- [ ] Fill in Apple credentials in `eas.json` (appleId, ascAppId, appleTeamId)
- [ ] Place `google-service-account.json` at project root (Android)
- [ ] Update `app.config.js` version number for each release
- [ ] Test with `eas build --profile preview` before production

### Build Commands
```bash
cd <app>/mobile

# Android APK (for testing)
eas build --platform android --profile preview

# Android AAB (for Play Store)
eas build --platform android --profile production

# iOS (for App Store)
eas build --platform ios --profile production

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

### Deploying the Backend
Each app requires its backend API to be hosted. Options:
- **Railway** (railway.app) - Free tier available
- **Render** (render.com) - Free tier available
- **Fly.io** (fly.io) - Free tier available
- **AWS/GCP/Azure** - Production-grade

Update the `apiUrl` in each app's `app.config.js` to point to your hosted backend:
```javascript
extra: {
  apiUrl: "https://your-app-name.railway.app/api"
}
```

### Google Play Store Requirements
1. Build AAB: `eas build --platform android --profile production`
2. Upload to Play Console > Production track
3. Complete store listing (description, screenshots, privacy policy)
4. Content rating questionnaire
5. Target audience and content declarations

### Apple App Store Requirements
1. Build IPA: `eas build --platform ios --profile production`
2. Upload via EAS Submit or Transporter app
3. Complete App Store Connect listing
4. App Review (typically 24-48 hours)
5. Privacy nutrition labels required
