# Deployment Guide

## Prerequisites
1. Create accounts on [Render](https://render.com) (free tier)
2. Push this repo to GitHub
3. Connect your GitHub repo to Render

## Step 1: Deploy Backends

Deploy each backend as a **Web Service** on Render:
1. New > Web Service > Connect GitHub repo
2. Set Root Directory to the server folder (e.g., `nexus/server`)
3. Build Command: `npm install`
4. Start Command: `node index.js`
5. Set environment variables:
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = (generate a random string)
   - `CORS_ORIGIN` = (your frontend URL, e.g., `https://nexus-web.onrender.com`)
   - `PORT` = (assigned by Render automatically)

Repeat for all 5 backends.

## Step 2: Deploy Frontends

Deploy each frontend as a **Static Site** on Render:
1. New > Static Site > Connect GitHub repo
2. Set Root Directory to the client folder (e.g., `nexus/client`)
3. Build Command: `npm install && npm run build`
4. Publish Directory: `dist`
5. Set environment variable:
   - `VITE_API_URL` = (your backend URL, e.g., `https://nexus-api.onrender.com/api`)

Repeat for all 5 frontends.

## Step 3: Update CORS

After deploying frontends, update each backend's `CORS_ORIGIN` env var to include the frontend URL.

## Step 4: Configure Rewrites (Static Sites)

For each static site, add a rewrite rule in Render dashboard:
- Source: `/*`
- Destination: `/index.html`

This enables client-side routing.

## Environment Variables Reference

| Variable | Where | Description |
|---|---|---|
| `NODE_ENV` | Backend | Set to `production` |
| `JWT_SECRET` | Backend | Random string for JWT signing |
| `CORS_ORIGIN` | Backend | Comma-separated frontend URLs |
| `PORT` | Backend | Assigned by Render |
| `VITE_API_URL` | Frontend | Backend API URL (e.g., `https://nexus-api.onrender.com/api`) |

## Alternative: Docker Compose (Self-Hosted)

```bash
docker-compose up -d
```

This runs all 5 apps locally with Docker.
