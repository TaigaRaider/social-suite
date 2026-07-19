# Social Suite - Implementation Context (Auto-Saved)

## Project Overview
- 5 full-stack social media apps in monorepo
- Tech: Node.js + Express + SQLite (sql.js) + JWT | React + Vite + React Router
- 50+ DB tables, 170+ API endpoints, 100+ components across all apps
- Root `package.json` with npm workspaces for monorepo management

## Versioning Rule
- Format: `MAJOR.MINOR.PATCH`
- MAJOR: Major platform changes
- MINOR: Feature sprints (resets each major)
- PATCH: Sprint increments (1.1.0 -> 1.1.1 -> 1.1.2)
- Current: 1.1.4 (Sprint 6)

## App Ports & DB Schemas
| App | Port | Version | Key Features |
|-----|------|---------|--------------|
| Nexus (Facebook) | 3001 | 1.1.1 | Posts, polls, friendships, messaging, analytics, hashtags, search, moderation, 2FA, password reset, scheduled posts |
| Lumina (Instagram) | 3002 | 1.1.1 | Posts, stories, follows, analytics, hashtags, search, moderation, 2FA, password reset |
| Pulse (Messenger) | 3003 | 1.1.1 | Conversations, WebSocket, E2EE (Signal Protocol), read receipts, reactions, smart replies, edit/delete, 2FA |
| Wave (WhatsApp) | 3004 | 1.1.1 | Groups, WebSocket, E2EE (Signal Protocol), read receipts, reactions, smart replies, edit/delete, 2FA |
| Whisper (Threads) | 3005 | 1.1.1 | Posts, threads, reposts, bookmarks, analytics, hashtags, search, moderation, 2FA, password reset, scheduled posts |

---

## All Features Implemented

### Security (from vulnerability report)
- Path traversal fix (Nexus, Lumina file uploads)
- XSS via MIME spoofing fix
- Hardcoded JWT secrets -> env vars + crypto fallback (all 5 apps)
- IDOR fixes (Pulse typing, Wave mark-read)
- CORS restriction to `process.env.CORS_ORIGIN` (all 5 servers)
- Rate limiting (200 req/15min global, 20 req/15min auth)
- Security headers (helmet: X-Frame-Options, nosniff, XSS protection)
- Input sanitization (script tag stripping)
- Audit logging (all requests logged with userId, method, path, statusCode, IP)

### Real-Time Features
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

### Algorithmic Feed Ranking
- **Nexus, Lumina, Whisper**: Engagement-based feed ranking
- Ranking formula: `(likes*2 + comments*3 + views*0.5) / (1 + hoursOld * 0.1)`
- Toggle: `GET /feed?ranked=true|false` (default: ranked)
- Pure chronological available via `?ranked=false`

### Two-Factor Authentication
- **All 5 apps**: TOTP-based 2FA with QR code
- `POST /api/2fa/setup` - Generate secret + QR code + 8 backup codes
- `POST /api/2fa/verify` - Verify TOTP token or backup code
- `POST /api/2fa/disable` - Disable 2FA (requires valid token)
- `GET /api/2fa/status` - Check 2FA status
- `POST /api/2fa/regenerate-backup` - Generate new backup codes
- `require2FA` middleware for protected routes

### Password Reset
- **All 5 apps**: Token-based password reset
- `POST /api/auth/forgot` - Request reset (returns token)
- `POST /api/auth/reset` - Reset password with token (1hr expiry)
- `POST /api/auth/change-password` - Change password (requires current password)

### Message Editing/Deletion
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

### End-to-End Encryption (Signal Protocol) - NEW
- **Pulse + Wave only** (messaging apps)
- X25519 identity key pairs + signed pre-keys + one-time pre-keys
- X3DH (Extended Triple Diffie-Hellman) for initial key agreement
- Double Ratchet algorithm for forward secrecy
- AES-256-GCM message encryption
- Server stores encrypted blobs it cannot decrypt
- Key bundle upload/download API
- Session state persistence (localStorage)
- Backward compatible (encrypted flag on messages)

**E2EE API Endpoints (Pulse + Wave):**
- `POST /api/crypto/identity-key` - Upload key bundle
- `GET /api/crypto/identity-key/:userId` - Fetch peer's key bundle
- `POST /api/crypto/identity-key/rotate-signed-prekey` - Rotate signed pre-key
- `POST /api/crypto/identity-key/replenish-prekeys` - Upload new one-time pre-keys
- `POST /api/crypto/session/prekey-bundle` - Store X3DH initial message
- `GET /api/crypto/session/prekey-bundles` - Fetch pending pre-key messages
- `DELETE /api/crypto/session/prekey-bundles/:id` - Acknowledge receipt
- `POST /api/crypto/message/relay` - Relay encrypted message
- `GET /api/crypto/safety-number/:peerId` - Compute safety number fingerprint
- `POST /api/crypto/safety-number/:peerId/verify` - Mark safety number verified
- `GET /api/crypto/safety-number/:peerId/status` - Check verification status
- `DELETE /api/crypto/safety-number/:peerId` - Remove verification

**Wave-only Group E2EE Endpoints:**
- `POST /api/crypto/group/:groupId/init` - Initialize group encryption (admin)
- `POST /api/crypto/group/:groupId/distribute` - Send encrypted chain key to member
- `GET /api/crypto/group/:groupId/keys` - Fetch pending group key packages
- `DELETE /api/crypto/group/:groupId/keys/:packageId` - Acknowledge key receipt
- `POST /api/crypto/group/:groupId/rotate` - Rotate group chain key (admin)

### Disappearing Messages (Pulse + Wave)
#### New DB Table: `disappearing_message_settings`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | auto |
| userId | INTEGER | FK→users |
| peerId/groupId | INTEGER | conversation identifier |
| enabled | INTEGER | 0/1 toggle |
| durationSeconds | INTEGER | TTL in seconds |
| updatedAt | DATETIME | last change |

#### New DB Column: `messages.expiresAt` (DATETIME, nullable)
#### Indexes: `idx_messages_expiresAt`, `idx_disappearing_settings_user`

#### API Endpoints (Pulse)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/crypto/disappearing/:peerId` | JWT | Get settings for conversation |
| PUT | `/api/crypto/disappearing/:peerId` | JWT | Update settings |
| POST | `/api/crypto/disappearing/cleanup` | JWT | Manually trigger cleanup |

#### Auto-Cleanup
- Runs every 60 seconds via `keyRotation.js` cron
- Deletes all messages where `expiresAt <= NOW()`

## Multi-Device Key Linking (Pulse + Wave)
### New DB Table: `device_keys`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | auto |
| userId | INTEGER | FK→users |
| deviceId | TEXT UNIQUE | per-device ID |
| deviceName | TEXT | display name |
| identityKeyPublic | BLOB | public key |
| identityKeyPrivateEncrypted | BLOB | encrypted private key |
| signedPreKeyPublic | BLOB | signed pre-key |
| signedPreKeySignature | BLOB | signature |
| oneTimePreKeys | TEXT (JSON) | OTK array |
| isCurrent | INTEGER | 0/1 active device |
| lastSeenAt | DATETIME | last heartbeat |
| createdAt | DATETIME | registration time |

### New DB Columns: `messages.deviceId`, `messages.targetDeviceId`
### Indexes: `idx_device_keys_user`, `idx_device_keys_device`, `idx_messages_device`, `idx_messages_target_device`

### API Endpoints (Pulse + Wave)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/crypto/devices/register` | JWT | Register device with key bundle |
| GET | `/api/crypto/devices` | JWT | List user's devices |
| DELETE | `/api/crypto/devices/:deviceId` | JWT | Remove device |
| PUT | `/api/crypto/devices/:deviceId/activate` | JWT | Set as current device |
| POST | `/api/crypto/devices/:deviceId/heartbeat` | JWT | Update last seen |
| GET | `/api/crypto/devices/user/:userId` | JWT | Get all devices for key distribution |

### WebSocket Events
- `device:identify` — join device-specific room
- `message:send` — now accepts `deviceId`, relays to all recipient devices

### UI Components
- `DeviceManager.jsx` (web) — responsive with breakpoints at 640/768/1024px
- `DeviceManagerScreen.js` (mobile) — uses Dimensions API for responsive layout
- Accessible via Navbar dropdown (Pulse) / header button (Wave) / Profile screen (mobile)

### E2EE Client Integration
#### E2EE Status Indicators (Sprint 3)
- 🔒 banner below chat header: "Messages are end-to-end encrypted"
- ⏱️ disappearing messages toggle in header actions
- Client-side conversation search (encrypted content can't be searched server-side)

#### Pre-key Replenishment (Sprint 3)
- Auto-check on login and register in AuthContext.jsx
- Replenishes to 50 pre-keys when count drops below 10
- Applied to both Pulse and Wave web clients

## Typing Indicators, Online Status & Reactions (Pulse + Wave)
### New DB Tables
- `typing_indicators` — userId, peerId/groupId, isTyping, lastUpdated
- `online_status` — userId, isOnline, lastSeenAt
- `message_reactions` — messageId, userId, emoji, createdAt

### WebSocket Events
| Event | Direction | Purpose |
|-------|-----------|---------|
| `typing:start` | emit | User started typing |
| `typing:stop` | emit | User stopped typing |
| `user:online` | both | User came online |
| `user:offline` | both | User went offline |
| `heartbeat` | emit | Keep-alive for online status |
| `reaction:add` | emit | Add emoji reaction |
| `reaction:remove` | emit | Remove reaction |
| `reaction:get` | emit+cb | Get reactions for message |
| `users:online` | emit+cb | Bulk online status check |

### REST Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/crypto/typing/:peerId` | Check typing status |
| POST | `/api/crypto/online-status` | Bulk online status |
| POST | `/api/crypto/reactions` | Bulk get reactions |

### UI Features
- 🔒 E2EE status banner below chat header
- ⏱️ Disappearing messages toggle in header
- Typing indicator: "User is typing..." at chat bottom
- Online status: green/gray dot in chat header
- Emoji reactions: 6 emojis (❤️👍😂😮😢😡) via hover picker

---

## Session 2: Operational & Business Improvements (NEW)

### Database Performance Indexes
Added indexes on all foreign keys, lookup columns, and frequently queried fields across all 5 apps:
- **Nexus** (20 indexes): posts, likes, comments, messages, notifications, friendships, post_views, post_hashtags, blocks, mutes, reports, two_factor, password_resets
- **Lumina** (17 indexes): posts, likes, comments, follows, stories, notifications, post_views, post_hashtags, blocks, reports, two_factor, password_resets
- **Pulse** (17 indexes): messages, friends, notifications, typing, reactions, conversation_members, audit_log, two_factor, password_resets
- **Wave** (19 indexes): messages, group_members, friends, notifications, typing, reactions, blocks, reports, audit_log, two_factor, password_resets
- **Whisper** (27 indexes): posts, polls, poll_options, poll_votes, likes, reposts, bookmarks, follows, notifications, reactions, post_views, post_hashtags, blocks, mutes, reports, audit_log, two_factor, password_resets

### Compression Middleware
- `compression` npm package installed and enabled on all 5 servers
- Gzip compression on all HTTP responses

### Global Error Handling
- Express error handler middleware on all 5 servers (catches unhandled route errors)
- `uncaughtException` process handler on all 5 servers
- `unhandledRejection` process handler on all 5 servers
- Structured error logging with `[ERROR]` and `[FATAL]` prefixes

### Enhanced Health Checks
- All 5 servers now verify DB connectivity on `GET /api/health`
- Returns 503 with error details if DB is unreachable
- Includes `uptime` in response
- Pulse/Wave include `ws: 'active'` for WebSocket status

### JSON Body Size Limit
- All 5 servers: `express.json({ limit: '10mb' })` (was default 100kb)

### GDPR Account Deletion
- `GET /api/account` - Account summary (user info, counts)
- `PUT /api/account` - Update profile settings
- `DELETE /api/account` - Full account deletion with password confirmation
- Cascading deletes across all user data (posts, likes, comments, messages, notifications, etc.)
- Created for all 5 apps with app-specific table cleanup

### Admin Panel Routes
- `GET /api/admin/reports` - List reports with `?status=` filter
- `PUT /api/admin/reports/:id` - Update report status (reviewed/resolved/dismissed)
- `GET /api/admin/users` - Paginated user listing (`?page=1&limit=20`)
- `PUT /api/admin/users/:id/ban` - Toggle 30-day ban/unban
- `DELETE /api/admin/posts/:id` - Delete post (moderation) + cascade
- `GET /api/admin/stats` - Dashboard stats (users, posts, pending reports, posts today)
- `role` column added to users table (default: 'user') on all 5 apps

### Scheduled Post Publisher
- `scheduler.js` for Nexus and Whisper (apps with `scheduledAt` column)
- Checks every 60 seconds for posts where `scheduledAt <= now`
- Publishes by setting `scheduledAt = NULL`
- Integrated into server startup

### Environment Configuration
- `.env.example` files created for all 5 server apps
- Documents: PORT, CORS_ORIGIN, JWT_SECRET, DB_PATH

### Monorepo Tooling
- Root `package.json` with npm workspaces
- `npm run dev` starts all 5 servers concurrently
- `npm run install:all` installs all workspace dependencies
- `concurrently` dev dependency for parallel dev servers

---

## New Files Created (All Sessions)

### Session 1 - Security & Features
- `nexus/server/middleware/security.js` - Rate limit, headers, sanitize, audit
- `lumina/server/middleware/security.js`
- `pulse/server/middleware/security.js`
- `wave/server/middleware/security.js`
- `whisper/server/middleware/security.js`
- `pulse/server/socket.js` - WebSocket server
- `wave/server/socket.js` - WebSocket server
- `*/server/routes/analytics.js` - Content analytics & insights
- `*/server/routes/hashtags.js` - Smart hashtag system
- `*/server/routes/search.js` - Full-text content search
- `*/server/routes/moderation.js` - Block/mute/report (Nexus, Lumina, Whisper)
- `*/server/routes/messaging-features.js` - Read receipts, reactions, smart replies (Pulse, Wave)
- `*/server/routes/twofa.js` - Two-factor authentication
- `*/server/routes/password-reset.js` - Password reset

### Session 2 - Operational & Business
- `*/server/routes/account.js` - GDPR account deletion (all 5 apps)
- `*/server/routes/admin.js` - Admin panel routes (all 5 apps)
- `nexus/server/scheduler.js` - Scheduled post publisher
- `whisper/server/scheduler.js` - Scheduled post publisher
- `nexus/server/.env.example`
- `lumina/server/.env.example`
- `pulse/server/.env.example`
- `wave/server/.env.example`
- `whisper/server/.env.example`
- `package.json` (root) - Monorepo config with workspaces
- `OPERATIONAL_GAP_ANALYSIS.md` - Gap analysis document

---

## Database Schema Changes

### Session 1 - New Tables
- `post_views` - Post view tracking
- `hashtags` - Hashtag registry
- `post_hashtags` - Post-hashtag associations
- `blocks` - User block list
- `mutes` - User mute list
- `reports` - Content reports
- `two_factor` - TOTP 2FA secrets & backup codes
- `password_resets` - Password reset tokens
- `messages.readAt` - Read receipt timestamp (Pulse, Wave)
- `messages.edited` - Edit flag (Pulse, Wave)

### Session 2 - Schema Changes
- `users.role` - Admin role column (default: 'user') on all 5 apps
- Database indexes on all foreign keys and query-heavy columns (see above)

### Sprint 2 - E2EE Schema Changes (Pulse, Wave)
- `identity_keys` - User identity keys + signed pre-keys
- `one_time_pre_keys` - One-time pre-keys with claim tracking
- `ratchet_sessions` - Encrypted Double Ratchet session state
- `prekey_messages` - X3DH initial bundles for offline delivery
- `messages.encrypted` - Flag for encrypted messages
- `messages.ciphertext` - Encrypted message content
- `messages.nonce` - AES-GCM nonce
- `messages.ratchetHeader` - Double Ratchet header (DH public key, chain length, message number)
- `verified_numbers` - Safety number verification records (Pulse, Wave)

### Sprint 2 - Group E2EE Schema (Wave only)
- `group_keys` - Chain keys per group member with versioning
- `group_key_packages` - Encrypted chain key packages for delivery

---

## Auth Patterns by App
- Nexus: `req.userId` from `decoded.userId`
- Lumina: `req.userId` from `decoded.id`
- Pulse: `req.userId` from `decoded.id`
- Wave: `req.user = decoded` (full object, use `req.user.id`)
- Whisper: `req.userId` from `decoded.id`

---

## Session 3: Completion Work - DX, Performance, Compliance, DevOps

### Prettier + ESLint Root Configuration
- `.prettierrc` - Consistent formatting (single quotes, trailing commas, 100 width)
- `.prettierignore` - Excludes node_modules, dist, build, .db, mobile
- `.eslintrc.json` - Node.js rules (eqeqeq, no-eval, prefer-const, no-var)
- `.eslintignore` - Excludes node_modules, dist, build, coverage, mobile
- Root `package.json` updated with `lint`, `lint:fix`, `format`, `format:check` scripts
- `eslint` ^8.50.0 and `prettier` ^3.0.0 added as root devDependencies

### Structured Logging with Pino
- `pino` + `pino-http` installed on all 5 servers
- `logger.js` created in each server directory with:
  - Configurable log level via `LOG_LEVEL` env var
  - ISO timestamps, structured level formatting
  - Standard serializers for err, req, res
- All `console.log()` replaced with `logger.info()` across all servers
- All `console.error()` replaced with `logger.error()` / `logger.fatal()`
- HTTP request logging via `pino-http` middleware on all 5 servers
- Scheduler files (Nexus, Whisper) also updated to use structured logging

### Debounced Database Writes
- `saveDB()` in all 5 `db.js` files now uses debounced writes (100ms)
- New `flushDB()` export for immediate synchronous write (graceful shutdown)
- `SIGINT` and `SIGTERM` handlers call `flushDB()` to prevent data loss
- Eliminates the performance bottleneck of `writeFileSync` on every mutation

### GDPR Data Export Endpoint
- `GET /api/account/export` added to all 5 apps in `account.js`
- Returns JSON with `Content-Disposition: attachment` header for download
- Exports all user data: profile, posts, messages, likes, comments, etc.
- Excludes sensitive fields (2FA secrets)
- App-specific table coverage (see below per app)

### Frontend: Analytics Dashboard (Nexus)
- `nexus/client/src/pages/Analytics.jsx` - Full analytics page with:
  - 5 summary stat cards (posts, views, likes, comments, avg engagement)
  - CSS bar chart for daily trends (views, likes, comments)
  - Top posts table with scores
  - Loading/error states
- Route: `/analytics` (protected)

### Frontend: Admin Dashboard (Nexus)
- `nexus/client/src/pages/Admin.jsx` - Full admin panel with:
  - Stats overview (users, posts, pending reports, today's posts)
  - Reports management (filter by status, review/resolve/dismiss actions)
  - User management (paginated, ban/unban toggle)
  - Post moderation (delete action)
  - Role check (non-admin sees "Access Denied")
- Route: `/admin` (protected)

### Frontend: Scheduled Post Composer (Nexus)
- `nexus/client/src/pages/ScheduledPosts.jsx` - List of scheduled posts with cancel
- `nexus/client/src/components/ScheduledPostComposer.jsx` - Composer with:
  - Text area for content
  - Native datetime-local picker
  - "Post Now" and "Schedule" buttons
  - Success/error feedback
- Route: `/scheduled` (protected)

### OpenAPI 3.0 Documentation
- `swagger.json` created for all 5 apps in their server directories
- Full endpoint documentation with request/response schemas
- Bearer JWT security scheme
- Tagged by feature (Auth, Posts, Messages, Admin, etc.)
- App-specific schemas (User, Post, Conversation, Group, etc.)

### Docker Containerization
- Individual `Dockerfile` for each app (node:20-alpine, non-root user, healthcheck)
- `docker-compose.yml` orchestrating all 5 services with named volumes
- `.dockerignore` excluding node_modules, .env, .db, .git
- Root `.env.example` for production secrets
- Root `package.json` updated with `docker:build`, `docker:up`, `docker:down`, `docker:logs` scripts

---

## New Files Created (All Sessions)

### Session 1 - Security & Features
- `*/server/middleware/security.js` - Rate limit, headers, sanitize, audit
- `*/server/socket.js` - WebSocket server (Pulse, Wave)
- `*/server/routes/analytics.js` - Content analytics & insights
- `*/server/routes/hashtags.js` - Smart hashtag system
- `*/server/routes/search.js` - Full-text content search
- `*/server/routes/moderation.js` - Block/mute/report (Nexus, Lumina, Whisper)
- `*/server/routes/messaging-features.js` - Read receipts, reactions, smart replies (Pulse, Wave)
- `*/server/routes/twofa.js` - Two-factor authentication
- `*/server/routes/password-reset.js` - Password reset

### Session 2 - Operational & Business
- `*/server/routes/account.js` - GDPR account deletion (all 5 apps)
- `*/server/routes/admin.js` - Admin panel routes (all 5 apps)
- `*/server/scheduler.js` - Scheduled post publisher (Nexus, Whisper)
- `*/server/.env.example` - Environment variable documentation
- `package.json` (root) - Monorepo config with workspaces
- `OPERATIONAL_GAP_ANALYSIS.md` - Gap analysis document

### Session 3 - Completion Work
- `*/server/logger.js` - Pino structured logger (all 5 apps)
- `*/server/swagger.json` - OpenAPI 3.0 documentation (all 5 apps)
- `*/server/Dockerfile` - Container build config (all 5 apps)
- `docker-compose.yml` - Multi-service orchestration
- `.dockerignore` - Docker build exclusions
- `.prettierrc` - Prettier configuration
- `.prettierignore` - Prettier exclusions
- `.eslintrc.json` - ESLint configuration
- `.eslintignore` - ESLint exclusions
- `.env.example` (root) - Production env template
- `nexus/client/src/pages/Analytics.jsx` - Analytics dashboard
- `nexus/client/src/pages/Admin.jsx` - Admin dashboard
- `nexus/client/src/pages/ScheduledPosts.jsx` - Scheduled posts list
- `nexus/client/src/components/ScheduledPostComposer.jsx` - Post scheduler UI

### Sprint 2 - E2EE Files (Pulse, Wave)
- `pulse/server/routes/crypto.js` - E2EE API routes (key management, session, relay)
- `wave/server/routes/crypto.js` - E2EE API routes (group-based)
- `pulse/server/keyRotation.js` - Signed pre-key rotation cron job
- `wave/server/keyRotation.js` - Signed pre-key rotation cron job
- `pulse/client/src/crypto/` - 6 crypto module files (key gen, X3DH, Double Ratchet, encrypt, store, protocol)
- `wave/client/src/crypto/` - 6 crypto module files

---

## Database Schema Changes

### Session 1 - New Tables
- `post_views`, `hashtags`, `post_hashtags`, `blocks`, `mutes`, `reports`
- `two_factor`, `password_resets`
- `messages.readAt`, `messages.edited` (Pulse, Wave)

### Session 2 - Schema Changes
- `users.role` - Admin role column (default: 'user') on all 5 apps
- Database indexes on all foreign keys and query-heavy columns

---

## Auth Patterns by App
- Nexus: `req.userId` from `decoded.userId`
- Lumina: `req.userId` from `decoded.id`
- Pulse: `req.userId` from `decoded.id`
- Wave: `req.user = decoded` (full object, use `req.user.id`)
- Whisper: `req.userId` from `decoded.id`

---

## Remaining Work (Future Sessions)

### Security Hardening
- Migrate JWT from localStorage to httpOnly cookies
- CSRF protection for cookie-based auth
- Content Security Policy headers (helmet csp)
- API key rotation mechanism
- Frontend error boundary components

### Database Improvements
- Migration system (currently ALTER TABLE with try/catch)
- Backup strategy (automated .db file backups)
- Redis or in-memory cache for hot data (feeds, trending hashtags)

### Performance
- Pagination cursors instead of offset-based
- Virtual scrolling on frontend for long lists

### Compliance & Legal
- Privacy policy page (frontend)
- Terms of service page (frontend)
- Cookie consent banner

### Mobile App
- Offline support / local caching
- Push notifications (FCM/APNs)
- Biometric authentication
- Deep linking

---

## Sprint 3 Changelog (v1.1.1)
- Version bumped 1.1.0 → 1.1.1 across all Expo apps + eas.json (build 3)
- Disappearing messages: DB tables, API routes, auto-cleanup cron (Pulse + Wave)
- E2EE status banner in all chat UIs (Pulse + Wave web + mobile)
- Disappearing messages toggle (⏱️) in chat headers
- Client-side conversation search for encrypted chats
- Pre-key replenishment auto-check on login/register
- All servers syntax OK, all web clients build clean

## Sprint 6 Changelog (v1.1.4)
- Version bumped 1.1.3 → 1.1.4 across all Expo apps + eas.json (build 6)
- Voice/video call signaling (WebRTC foundation):
  - call_sessions DB table with status tracking
  - Call initiate/answer/end/reject API endpoints
  - WebSocket signaling: offer, answer, ICE candidates, mute, video toggle, screen share
  - CallManager.jsx component with peer connection management
  - Voice/video call buttons in chat headers
  - CallScreen.js for mobile with duration timer
- Sticker packs:
  - sticker_packs + user_sticker_packs DB tables
  - 4 default packs: Smileys, Gestures, Hearts, Objects
  - Sticker picker UI in ChatInput with pack tabs and grid
  - Install/uninstall sticker packs API
- Offline message queue:
  - localStorage-based message queue when offline
  - Auto-flush on reconnection
  - isOnline state in AuthContext
- All servers syntax OK, all web clients build clean

## Sprint 5 Changelog (v1.1.3)
- Version bumped 1.1.2 → 1.1.3 across all Expo apps + eas.json (build 5)
- Push notification infrastructure: push_tokens + notifications DB tables
- Push token register/unregister API endpoints (Pulse + Wave)
- In-app notification center with dropdown, mark read, mark all read
- Notification bell in Navbar for both Pulse and Wave
- Read receipts: deliveredAt + readAt columns on messages
- Read receipt indicators on sent messages (✓ Sent → ✓ Delivered → ✓✓ Read)
- Real-time read receipt socket events
- Auto-delivery confirmation when receiving messages
- Group admin controls for Wave:
  - Member roles (owner/admin/member)
  - Mute/unmute members
  - Kick members
  - Ban/unban members
  - Transfer ownership
  - Group settings (description, privacy, member invites)
  - Leave group
  - Responsive member list panel with admin actions
- All servers syntax OK, all web clients build clean

## Sprint 4 Changelog (v1.1.2)
- Version bumped 1.1.1 → 1.1.2 across all Expo apps + eas.json (build 4)
- Multi-device key linking: DB table, 6 API endpoints, WebSocket relay, responsive UI
- DeviceManager.jsx (web) — fully responsive with CSS breakpoints at 640/768/1024px
- DeviceManagerScreen.js (mobile) — uses Dimensions API, FlatList, responsive to screen width
- Device links added to Pulse Navbar dropdown, Wave header, mobile Profile screens
- Typing indicators with real-time socket events + DB persistence
- Online status tracking with heartbeat keep-alive
- Emoji message reactions (6 emojis) with picker UI + reaction count badges
- E2EE status banner in all chat UIs
- Disappearing messages toggle in chat headers
- socket.io-client installed on Pulse + Wave web clients
- All servers syntax OK, all web clients build clean
