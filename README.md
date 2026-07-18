# CRAZY RACING

A multiplayer browser game for 2–9 players, built with React, TypeScript, Node.js and Socket.IO.

## Requirements

- Node.js 20 or newer
- npm
- Git

## Install

From the repository root:

```bash
npm install
```

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

Included files:

- `server/.env.example` — variable reference
- `server/.env.development` — local development
- `server/.env.production` — production template

For Render, configure at least:

```text
NODE_ENV=production
CLIENT_URL=https://your-project.pages.dev
```

Render supplies `PORT` automatically. The server listens on `0.0.0.0` for hosted environments.

To allow more than one frontend origin:

```text
CLIENT_URLS=https://your-project.pages.dev,https://preview.example.pages.dev
```

Local private overrides may be placed in `.env.local` or `.env.production.local`; those files are ignored by Git.

## Production build

Build the client and server:

```bash
npm run build
```

Generated output:

```text
client/dist
server/dist
```

Start the compiled server:

```bash
npm start
```

## Health check

The server exposes:

```text
GET /health
```

Expected response:

```json
{
  "ok": true
}
```

## Free deployment target

This configuration is prepared for:

- Client: Cloudflare Pages
- Server and Socket.IO: Render Free Web Service
- HTTPS: supplied by both providers
- Custom domain: optional

The provider setup and public deployment guide will be completed in the later Milestone 5 deployment commits.
