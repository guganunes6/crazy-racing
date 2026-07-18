# CRAZY RACING

A multiplayer browser game for 2–9 players, built with React, TypeScript, Node.js and Socket.IO.

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- Git

## Install

The repository uses npm workspaces and one root lock file. Run installation only from the repository root:

```bash
npm install
```

Do not run `npm install` separately inside `client` or `server`.

## Local development

The committed development configuration uses:

```text
Client: http://localhost:5173
Server: http://localhost:3001
```

Start the server:

```bash
npm run dev:server
```

Start the client in another terminal:

```bash
npm run dev:client
```

Open `http://localhost:5173`.

## Environment configuration

### Client

The client reads `VITE_SERVER_URL`. Vite embeds this value into the browser bundle, so it is public and must never contain a secret.

Included files:

- `client/.env.example` — variable reference
- `client/.env.development` — local development
- `client/.env.production` — production template

For Cloudflare Pages, configure:

```text
VITE_SERVER_URL=https://your-render-service.onrender.com
```

Socket.IO automatically uses secure WebSockets when connecting to an HTTPS URL.

### Server

Supported variables:

| Variable | Purpose | Development default |
|---|---|---|
| `NODE_ENV` | `development`, `test`, or `production` | `development` |
| `PORT` | HTTP and Socket.IO port | `3001` |
| `CLIENT_URL` | One allowed browser origin | `http://localhost:5173` |
| `CLIENT_URLS` | Comma-separated allowed origins | unset |
| `APP_VERSION` | Version reported by health checks | `0.5.0` |
| `LOG_LEVEL` | `debug`, `info`, `warn`, or `error` | `debug` locally, `info` in production |

For Render, configure at least:

```text
NODE_ENV=production
CLIENT_URL=https://your-project.pages.dev
APP_VERSION=0.5.0
LOG_LEVEL=info
```

Render supplies `PORT` automatically. The server listens on `0.0.0.0`.

To allow more than one frontend origin:

```text
CLIENT_URLS=https://your-project.pages.dev,https://preview.example.pages.dev
```

## Verification and production build

Run the complete verification and build pipeline from the root:

```bash
npm run build
```

This performs:

1. Client TypeScript validation
2. Server TypeScript validation
3. Optimized Vite client build
4. Compiled Node.js server build

Generated output:

```text
client/dist
server/dist
```

Preview the client production build locally:

```bash
npm run preview:client
```

Start the compiled server locally:

```bash
npm start
```

When testing the compiled server locally, keep `NODE_ENV=development`, or provide production environment variables explicitly.

## Server health and readiness

Liveness endpoint:

```text
GET /health
```

Example response:

```json
{
  "status": "ok",
  "version": "0.5.0",
  "environment": "production",
  "uptimeSeconds": 120,
  "timestamp": "2026-07-18T12:00:00.000Z"
}
```

Readiness endpoint:

```text
GET /ready
```

It reports whether the process is accepting traffic, plus non-sensitive runtime totals such as active rooms and connected sockets.

Use `/health` as the Render health-check path.

## Production behaviour added in Milestone 5, Commit 2

- Optimized Vite production build
- Cloudflare Pages SPA fallback through `_redirects`
- Cache and browser security headers through `_headers`
- Structured JSON server logging
- HTTP 404 and error responses
- Process-level exception logging
- Graceful `SIGTERM` and `SIGINT` shutdown
- Health and readiness endpoints
- Source-map-enabled production server stack traces
- One root npm lock file for all workspaces

## Cloudflare Pages static output

The Cloudflare Pages build settings used in the next deployment commit will be:

```text
Root directory: /
Build command: npm run build:client
Build output directory: client/dist
```

`client/public/_headers` and `client/public/_redirects` are copied into the production build automatically by Vite.

## Render server output

The Render settings used in the next deployment commit will be:

```text
Build command: npm install && npm run build:server
Start command: npm start
Health check path: /health
```

## npm registry troubleshooting

The committed lock file uses the public npm registry. Check your local registry with:

```bash
npm config get registry
```

Expected value:

```text
https://registry.npmjs.org/
```

If another registry is configured:

```bash
npm config set registry https://registry.npmjs.org/
npm install
```

## Free deployment target

- Client: Cloudflare Pages
- Server and Socket.IO: Render Free Web Service
- HTTPS: supplied by both providers
- Custom domain: optional

Actual provider creation and public deployment are completed in Milestone 5, Commit 3.

## Milestone 5 — Commit 2 production build correction

The `shared` workspace is now compiled before the client and server. Production Node.js must never load TypeScript directly from `shared/src`.

The production build order is:

```text
shared -> client type-check -> server type-check -> client build -> server build
```

Run all commands from the repository root:

```bash
npm install
npm run build
npm start
```

Expected build output:

```text
shared/dist
client/dist
server/dist
```

The server package resolves `@crazy-racing/shared` through `shared/dist/index.js`, while TypeScript declarations are read from `shared/dist/index.d.ts`.

Local development remains available:

```bash
npm run dev:server
npm run dev:client
```

Each development command builds the shared workspace first. When changing files under `shared/src` while a development process is already running, restart the relevant client or server command so the shared package is rebuilt.

To verify the compiled server locally:

```bash
npm run build
npm start
```

Then open:

```text
http://localhost:3001/health
```

A successful response contains `"status":"ok"`.
