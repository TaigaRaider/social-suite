# Social Suite

Five full-stack social media platforms with unique modern designs.

| App | Port | Theme |
|-----|------|-------|
| **Facebook** | [localhost:5173](http://localhost:5173) | Blue & white |
| **Lumina** | [localhost:5174](http://localhost:5174) | Purple-pink gradient |
| **Pulse** | [localhost:5175](http://localhost:5175) | Electric blue |
| **Wave** | [localhost:5176](http://localhost:5176) | Teal green |
| **Whisper** | [localhost:5177](http://localhost:5177) | Minimalist black |

## Quick Start

```bash
# Start all apps at once (Windows)
start-all.bat

# Or start individually
cd facebook/server && node index.js    # Backend
cd facebook/client && npm run dev      # Frontend
```

## Tech Stack

- **Backend:** Node.js + Express + SQLite (sql.js) + JWT
- **Frontend:** React + Vite + React Router

## Documentation

See [docs/README.md](docs/README.md) for full documentation.
