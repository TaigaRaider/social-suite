# Social Suite - Implementation Context (Auto-Saved)

## Project Overview
- 5 full-stack social media apps in monorepo
- Tech: Node.js + Express + SQLite (sql.js) + JWT | React + Vite + React Router
- 50+ DB tables, 170+ API endpoints, 100+ components across all apps
- All apps have: rate limiting, security headers, XSS sanitization, CORS restriction, secure JWT

## App Ports & DB Schemas
| App | Port | Key Features |
|-----|------|--------------|
| Nexus (Facebook) | 3001 | Posts, polls, friendships, messaging, analytics, hashtags, search, moderation, 2FA, password reset |
| Lumina (Instagram) | 3002 | Posts, stories, follows, analytics, hashtags, search, moderation, 2FA, password reset |
| Pulse (Messenger) | 3003 | Conversations, WebSocket real-time, read receipts, message reactions, smart replies, edit/delete, 2FA |
| Wave (WhatsApp) | 3004 | Groups, WebSocket real-time, read receipts, message reactions, smart replies, edit/delete, 2FA |
| Whisper (Threads) | 3005 | Posts, threads, reposts, bookmarks, analytics, hashtags, search, moderation, 2FA, password reset |

## All Features Implemented

### Security (from vulnerability report)
- Path traversal fix (Nexus, Lumina file uploads)
- XSS via MIME spoofing fix
- Hardcoded JWT secrets → env vars + crypto fallback (all 5 apps)
- IDOR fixes (Pulse typing, Wave mark-read)
- CORS restriction (all 5 servers)
- Rate limiting (200 req/15min global, 20 req/15min auth)
- Security headers (X-Frame-Options, nosniff, XSS protection)
- Input sanitization (script tag stripping)
- Audit logging

### Real-Time Features (NEW)
**WebSocket with Socket.io** (Pulse, Wave):
- Instant message delivery (no more polling)
- Live typing indicators (binary start/stop events)
- Real-time online/offline status
- Real-time read receipts
- Real-time message reactions
- Conversation/group creation events

**Pulse WebSocket Events:**
- `message:send`, `message:new`, `message:read`, `message:read:ack`
- `typing:start`, `typing:stop`, `typing:update`
- `user:online`, `user:offline`, `user:status`
- `conversation:join`, `conversation:leave`, `conversation:create`, `conversation:created`

**Wave WebSocket Events:**
- `message:send`, `message:new`, `message:read`, `message:read:ack`
- `message:react`, `message:reaction:new`, `message:reaction:removed`
- `typing:start`, `typing:stop`, `typing:update`
- `user:online`, `user:offline`, `user:status`
- `group:join`, `group:leave`, `group:create`, `group:created`, `group:invited`

### Algorithmic Feed Ranking (NEW)
- **Nexus, Lumina, Whisper**: Engagement-based feed ranking
- Ranking formula: `(likes*2 + comments*3 + views*0.5) / (1 + hoursOld * 0.1)`
- Toggle: `GET /feed?ranked=true|false` (default: ranked)
- Pure chronological available via `?ranked=false`

### Two-Factor Authentication (NEW)
- **All 5 apps**: TOTP-based 2FA with QR code
- `POST /api/2fa/setup` - Generate secret + QR code + 8 backup codes
- `POST /api/2fa/verify` - Verify TOTP token or backup code
- `POST /api/2fa/disable` - Disable 2FA (requires valid token)
- `GET /api/2fa/status` - Check 2FA status
- `POST /api/2fa/regenerate-backup` - Generate new backup codes
- `require2FA` middleware for protected routes

### Password Reset (NEW)
- **All 5 apps**: Token-based password reset
- `POST /api/auth/forgot` - Request reset (returns token)
- `POST /api/auth/reset` - Reset password with token (1hr expiry)
- `POST /api/auth/change-password` - Change password (requires current password)

### Message Editing/Deletion (NEW)
- **Pulse, Wave**: Edit and delete messages
- `PUT /:id/messages/:messageId` - Edit message (5 min window)
- `DELETE /:id/messages/:messageId` - Delete message (own only)
- `edited` flag on messages

### Content Analytics & Insights
- Post view tracking (deduplicated per hour)
- Engagement metrics (views, likes, comments, reactions)
- Daily engagement trends
- Top posts ranking

### Smart Hashtag System
- Auto-extraction on post creation
- Trending hashtags (7-day rolling window)
- Hashtag search
- Autocomplete suggestions

### Full-text Content Search
- Multi-type search (users, posts, hashtags)
- User search by username/name
- Post search by content

### Read Receipts
- Timestamped `readAt` field
- Bulk read marking
- Read status queries

### Message Reactions
- Toggle emoji reactions on messages
- Reaction queries per message

### Smart Reply Suggestions
- Context-aware quick replies
- Pattern matching for greetings, questions, thanks, emotions

### User Block/Mute System
- Block users (auto-removes friendships/follows)
- Mute users
- Block/mute lists

### Content Report/Flag System
- Report posts, comments, users, messages
- Duplicate report prevention

## New Files Created (This Session)
- pulse/server/socket.js (WebSocket server)
- wave/server/socket.js (WebSocket server)
- All analytics.js, hashtags.js, search.js, moderation.js routes
- All messaging-features.js routes
- All twofa.js routes
- All password-reset.js routes

## Database Tables Added
- post_views, hashtags, post_hashtags, blocks, mutes, reports
- two_factor, password_resets
- messages.readAt, messages.edited (Pulse, Wave)

## Auth Patterns by App
- Nexus: `req.userId` from `decoded.userId`
- Lumina: `req.userId` from `decoded.id`
- Pulse: `req.userId` from `decoded.id`
- Wave: `req.user = decoded` (full object)
- Whisper: `req.userId` from `decoded.id`

## Remaining Recommendations
1. Add test suite for critical routes
2. Add API documentation (Swagger/OpenAPI)
3. Add error tracking (Sentry)
4. Migrate JWT from localStorage to httpOnly cookies
5. Migrate mobile tokens to expo-secure-store
6. Add database migrations system
7. Add logging framework (winston/pino)
