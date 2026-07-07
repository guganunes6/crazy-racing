# CRAZY RACING

A private multiplayer browser game inspired by chaotic mascot racing.

## Requirements

Install:

- Node.js 20+
- Git
- VS Code

Check:

```bash
node -v
npm -v
git --version
```

## Run locally

Terminal 1:

```bash
cd server
npm install
npm run dev
```

Terminal 2:

```bash
cd client
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Create a private GitHub repo

```bash
cd crazy-racing
git init
git add .
git commit -m "Initial CRAZY RACING multiplayer scaffold"
git branch -M main
git remote add origin git@github.com:YOUR_USERNAME/crazy-racing.git
git push -u origin main
```

Create the GitHub repo as **Private** before pushing.

## Current MVP features

- Create room
- Join room by room code or shared link
- 2–9 players
- Ready system
- Server-authoritative game state
- Automated setup
- Betting phase placeholder
- Secret card phase placeholder
- Automated race simulation
- Payout phase
- Final results after 3 races
- SVG assets for QUEEN, FISH, HOTDOG, LION

This is a starter implementation. The next step is to fully model every card, ticket, side bet, collision rule, and payout table.
