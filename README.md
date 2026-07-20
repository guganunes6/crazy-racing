# CRAZY RACING

<p align="center">
  <img src="docs/images/logo.png" alt="Crazy Racing Logo" width="220"/>
</p>

<p align="center">
    <strong>An online multiplayer betting and racing game inspired by <em>Hot Streak</em>.</strong><br>
    Draft betting tickets, secretly influence the race by choosing cards, and watch the action unfold live with your friends.
</p>

<p align="center">
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" />
    <img src="https://img.shields.io/badge/Node.js-24-339933?logo=node.js" />
    <img src="https://img.shields.io/badge/Socket.IO-4-010101?logo=socket.io" />
    <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite" />
    <img src="https://img.shields.io/badge/License-Personal-lightgrey" />
</p>

\---

## 🎮 Overview

Crazy Racing is a browser-based multiplayer game for **2–9 players** that combines hidden information, betting, and strategy.

Each game consists of **three races**, where players attempt to predict race outcomes while secretly influencing the race itself.

Unlike a traditional racing game, players **do not control the racers directly**. Instead, they build the racing deck by secretly contributing cards, making every race a combination of planning, probability and bluffing.

The game is designed to be played entirely online and synchronizes every action in real time using **Socket.IO**.

\---

## ✨ Main Features

* 🎮 Online multiplayer gameplay
* 👥 Supports **2–9 players**
* 🏁 Three-race game structure
* 🎲 Snake-draft betting system
* 🃏 Secret card selection before every race
* ⚡ Real-time synchronization using Socket.IO
* 🔄 Automatic player reconnection
* 📺 Race replay
* 🏆 Dynamic scoring and payouts
* 🎯 Side bets
* 💻 Browser-based (no installation required for players)
* ☁️ Production-ready deployment on Render + Cloudflare Pages

\---

# 🎲 Gameplay

Every match follows the same overall structure.

```text
Create Room
      │
      ▼
Players Join
      │
      ▼
Draft Betting Tickets
      │
      ▼
Choose Secret Racing Cards
      │
      ▼
Race 1
      │
      ▼
Race 2
      │
      ▼
Race 3
      │
      ▼
Final Results
```

Each race is affected by:

* Public racing cards
* Secret player-selected cards
* Randomized card order
* Racer interactions
* Side bets
* Previous race state

Because players secretly influence the racing deck, no race ever plays out exactly the same way.

\---

# 🛠 Tech Stack

## Frontend

* React
* TypeScript
* Vite
* Socket.IO Client

The frontend provides the complete game interface, including:

* Lobby
* Betting phase
* Card drafting
* Race visualization
* Replay viewer
* Results screen

\---

## Backend

* Node.js
* Express
* Socket.IO
* TypeScript

The backend is responsible for:

* Room management
* Player synchronization
* Game state
* Race engine
* Betting logic
* Replay generation
* Reconnection handling

\---

## Shared Package

The project contains a dedicated shared workspace used by both the frontend and backend.

It contains:

* Shared interfaces
* Models
* Enums
* Constants
* Utility functions

This ensures both applications always use exactly the same game definitions.

\---

# 📁 Repository Structure

The project uses **npm Workspaces** to organize the codebase.

```text
crazy-racing/
│
├── client/
│   ├── public/
│   ├── src/
│   └── package.json
│
├── server/
│   ├── src/
│   └── package.json
│
├── shared/
│   ├── src/
│   └── package.json
│
├── package.json
├── package-lock.json
└── README.md
```

### `client/`

Contains the React application responsible for rendering the user interface and communicating with the server.

\---

### `server/`

Contains the Express + Socket.IO server responsible for all multiplayer logic and race simulation.

\---

### `shared/`

Contains code shared between the frontend and backend.

Examples include:

* Models
* Game enums
* Shared types
* Constants

This package is compiled before both applications during every build.

\---

# 🚀 Installation

## Requirements

Before starting, ensure you have installed:

* Node.js **24 or newer**
* npm **10 or newer**
* Git

Verify your installation:

```bash
node -v
npm -v
git --version
```

\---

## Clone the Repository

```bash
git clone https://github.com/guganunes6/crazy-racing.git
```

Enter the project directory:

```bash
cd crazy-racing
```

\---

## Install Dependencies

The project uses **npm Workspaces**, therefore all dependencies should be installed from the repository root.

```bash
npm install
```

Do **not** run `npm install` inside the individual workspaces (`client`, `server` or `shared`).

\---

## Verify Installation

You can verify everything is installed correctly by running:

```bash
npm run check
```

This validates:

* Shared package
* Frontend
* Backend

without generating a production build.

\---

# 💻 Development

Crazy Racing is developed as an **npm Workspace** project composed of three packages:

* `client`
* `server`
* `shared`

During development, both the frontend and backend run independently while communicating through Socket.IO.

The shared package is automatically built before either application starts.

\---

## Development Environment

|Component|URL|
|-|-|
|Frontend|http://localhost:5173|
|Backend|http://localhost:3001|

\---

## Start the Backend

Open a terminal in the project root and run:

```bash
npm run dev:server
```

This command:

* Builds the shared package
* Starts the Express server
* Enables hot reload
* Starts Socket.IO

\---

## Start the Frontend

Open a second terminal:

```bash
npm run dev:client
```

This command:

* Builds the shared package
* Starts the Vite development server
* Enables React Fast Refresh

\---

## Open the Game

Navigate to:

```text
http://localhost:5173
```

The frontend will automatically connect to:

```text
http://localhost:3001
```

using the development environment configuration.

\---

## Development Tips

Whenever changes are made inside the `shared` workspace while the client or server is already running, restart the affected development process so the latest shared build is used.

A typical development cycle is:

```text
Edit code
     │
     ▼
Save changes
     │
     ▼
Restart dev process (if shared changed)
     │
     ▼
Refresh browser
```

\---

# 🧪 Local Production Testing

Before deploying to Render or Cloudflare Pages, it is highly recommended to verify the complete production build locally.

This ensures that:

* TypeScript compiles successfully
* Production bundles are generated correctly
* Socket.IO works over the production configuration
* CORS configuration is correct
* Environment variables are correctly configured

\---

## Step 1 — Build Everything

From the project root:

```bash
npm run build
```

This command performs:

* Clean previous builds
* Build the shared package
* Type-check the frontend
* Type-check the backend
* Build the frontend
* Build the backend

Generated output:

```text
client/dist
server/dist
shared/dist
```

\---

## Step 2 — Start the Production Backend

Open a terminal:

```bash
npm run start:local-production
```

This command starts the compiled backend using:

```text
NODE\_ENV=production
CLIENT\_URLS=http://localhost:4173
```

The server listens on:

```text
http://localhost:3001
```

\---

## Step 3 — Preview the Production Frontend

Open another terminal:

```bash
npm run preview:client
```

Vite serves the compiled frontend from:

```text
http://localhost:4173
```

This simulates how the frontend behaves once deployed.

\---

## Step 4 — Verify the Application

Open:

```text
http://localhost:4173
```

\---

## Health Endpoint

Verify the backend is running correctly:

```text
http://localhost:3001/health
```

Expected response:

```json
{
  "status": "ok",
  "version": "0.5.0"
}
```

\---

## Why Test Local Production?

Testing locally before deployment catches issues that don't appear in development, including:

* Missing production assets
* Incorrect imports
* Environment variable mistakes
* CORS configuration errors
* Socket.IO HTTPS issues

Fixing these locally is significantly faster than debugging deployed services.

\---

# 📜 Available npm Scripts

All commands should be executed from the repository root.

|Script|Description|
|-|-|
|`npm install`|Install all workspace dependencies|
|`npm run dev:client`|Start the React frontend|
|`npm run dev:server`|Start the Express backend|
|`npm run build`|Complete production build|
|`npm run build:shared`|Build the shared package|
|`npm run build:client`|Build the frontend|
|`npm run build:server`|Build the backend|
|`npm run check`|Type-check all workspaces|
|`npm run check:shared`|Type-check shared package|
|`npm run check:client`|Type-check frontend|
|`npm run check:server`|Type-check backend|
|`npm run clean`|Remove generated build files|
|`npm run preview:client`|Preview the production frontend|
|`npm run start`|Start the compiled backend|
|`npm run start:local-production`|Run the backend in local production mode|

\---

# 🏗 Architecture

Crazy Racing follows a classic client-server architecture.

```text
                     Players
                        │
                        ▼
               Web Browser (React)
                        │
                        │ HTTPS
                        │
                        ▼
             Cloudflare Pages (Frontend)
                        │
                        │ Socket.IO
                        │ HTTPS
                        ▼
         Render (Express + Socket.IO Server)
                        │
                        ▼
                  Game Engine
                        │
         ┌──────────────┼──────────────┐
         │              │              │
         ▼              ▼              ▼
   Room Manager   Betting Engine   Race Engine
                        │
                        ▼
                 Shared TypeScript
```

\---

## Project Architecture

The repository is divided into three independent workspaces.

```text
          npm Workspace
                │
     ┌──────────┼──────────┐
     │          │          │
     ▼          ▼          ▼
  client     server     shared
```

### Client

Responsible for:

* User interface
* Rendering races
* Sending player actions
* Displaying results

\---

### Server

Responsible for:

* Multiplayer synchronization
* Game rules
* Race simulation
* Betting logic
* Replay generation
* Room management

\---

### Shared

Responsible for:

* Shared interfaces
* Shared models
* Constants
* Utility functions
* Game definitions

\---

# 🔄 Development \& Deployment Workflow

The recommended workflow for new features is:

```text
Create Feature Branch
         │
         ▼
Develop Feature
         │
         ▼
Run npm run check
         │
         ▼
Run npm run build
         │
         ▼
Test Local Production
         │
         ▼
Commit Changes
         │
         ▼
Push to GitHub
         │
         ▼
Render Deploys Backend
         │
         ▼
Cloudflare Deploys Frontend
         │
         ▼
Production Testing
```

Following this workflow helps ensure that every change has been validated before reaching production.

\---

# ☁️ Deployment

Crazy Racing is designed to be deployed using **Cloudflare Pages** for the frontend and **Render** for the backend.

This combination provides:

* Fast global content delivery
* HTTPS by default
* Automatic deployments from GitHub
* Real-time WebSocket support through Socket.IO
* A completely free hosting solution for development and small-scale public deployments

The deployment architecture is illustrated below:

```text
                    Players
                       │
                       ▼
             Cloudflare Pages
               (React + Vite)
                       │
             HTTPS + Socket.IO
                       │
                       ▼
                    Render
         (Express + Socket.IO Server)
```

\---

# ☁️ Deploying the Backend (Render)

## 1\. Create a Web Service

Log in to Render and create a new **Web Service** connected to your GitHub repository.

Repository:

```text
guganunes6/crazy-racing
```

Branch:

```text
main
```

\---

## 2\. Build Command

Use:

```bash
npm ci --include=dev \&\& npm run build
```

This command:

* installs all workspace dependencies
* installs development dependencies required for TypeScript compilation
* builds the shared package
* validates the frontend
* validates the backend
* builds both applications

\---

## 3\. Start Command

```bash
npm start
```

This starts the compiled Express server located inside the server workspace.

\---

## 4\. Health Check

Health check path:

```text
/health
```

Render periodically calls this endpoint to ensure the application is healthy.

Example response:

```json
{
  "status": "ok",
  "version": "0.5.0",
  "environment": "production"
}
```

\---

## 5\. Auto Deploy

Enable:

```text
Auto Deploy: Yes
```

Every push to the `main` branch automatically deploys a new backend version.

\---

# ☁️ Deploying the Frontend (Cloudflare Pages)

Create a new Cloudflare Pages project connected to the same GitHub repository.

Repository:

```text
guganunes6/crazy-racing
```

Branch:

```text
main
```

\---

## Build Settings

Framework preset:

```text
Vite
```

Build command:

```bash
npm ci --include=dev \&\& npm run build
```

Build output directory:

```text
client/dist
```

Root directory:

```text
/
```

\---

## Automatic Deployments

Cloudflare automatically deploys every commit pushed to the configured branch.

No additional configuration is required after the initial setup.

\---

# 🌍 Environment Variables

## Frontend (Cloudflare Pages)

The frontend requires only one environment variable.

|Variable|Description|
|-|-|
|`VITE\_SERVER\_URL`|URL of the deployed Render backend|

Example:

```text
VITE\_SERVER\_URL=https://crazy-racing.onrender.com
```

Because this variable is embedded into the browser bundle during the build process, it **must never contain secrets**.

\---

## Backend (Render)

The backend supports the following environment variables.

|Variable|Required|Description|
|-|-|-|
|`NODE\_ENV`|✅|`production`|
|`NODE\_VERSION`|✅|Node version used during deployment|
|`CLIENT\_URLS`|✅|Allowed frontend origins|
|`APP\_VERSION`|Optional|Version exposed by `/health`|
|`LOG\_LEVEL`|Optional|Logging level|

Recommended production configuration:

```text
NODE\_ENV=production
NODE\_VERSION=24.18.0
CLIENT\_URLS=https://crazy-racing.pages.dev
APP\_VERSION=0.5.0
LOG\_LEVEL=info
```

If multiple frontend domains should be allowed, separate them with commas.

Example:

```text
CLIENT\_URLS=https://crazy-racing.pages.dev,https://preview.pages.dev
```

\---

# 🔒 Security Notes

The project intentionally keeps secrets out of the frontend.

Only variables beginning with:

```text
VITE\_
```

are exposed to the browser.

Everything else remains server-side.

Always verify that:

* API keys
* Tokens
* Passwords
* Private URLs

are never stored inside the frontend workspace.

\---

# 🚀 Production Checklist

Before pushing a release, verify the following:

* ✅ `npm run check`
* ✅ `npm run build`
* ✅ Local production tested
* ✅ Health endpoint working
* ✅ Multiplayer tested
* ✅ Replay tested
* ✅ Reconnection tested
* ✅ All three races completed successfully
* ✅ No TypeScript errors
* ✅ No console errors
* ✅ README updated

\---

# 🗺️ Roadmap

Some ideas for future improvements include:

# \- Milestone 6 - Player Profiles:

* Authentication
* Accounts
* Statistics
* Achievements
* Match History
* Discord Inegration

# \- Milestone 7 - Gameplay Expansion:

* New mascots
* New cards
* New tracks
* New sidebets
* New gamemodes
* Balance updates

# \- Milestone 8 - Community \& Competition:

* Private invitations
* Spectator rooms
* Matchmaking
* Ranked ladder
* Leaderboards
* Tournaments
* Seasons

# Happy racing! 🏁

