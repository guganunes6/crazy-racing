import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import {
  createRoom,
  addPlayer,
  removePlayer,
  toggleReady,
  canStart,
  startGame,
  autoAssignDemoBets,
  submitSecretCards,
  allSecretCardsSubmitted,
  beginRace,
  stepRace,
  finishPayouts
} from "./gameLogic.js";

const app = express();
app.use(cors());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

function publicRoom(room) {
  return {
    roomCode: room.roomCode,
    hostSocketId: room.hostSocketId,
    phase: room.phase,
    raceNumber: room.raceNumber,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      ready: p.ready,
      money: p.money,
      handCount: p.hand.length,
      bets: p.bets
    })),
    racers: room.racers,
    podium: room.podium,
    raceLog: room.raceLog.slice(-10),
    currentCard: room.currentCard
  };
}

function emitRoom(room) {
  io.to(room.roomCode).emit("room:update", publicRoom(room));

  for (const player of room.players) {
    io.to(player.id).emit("player:private", {
      hand: player.hand,
      selectedSecretCards: player.selectedSecretCards
    });
  }
}

io.on("connection", (socket) => {
  socket.on("room:create", ({ playerName }, callback) => {
    try {
      const room = createRoom(socket.id, playerName);
      rooms.set(room.roomCode, room);
      socket.join(room.roomCode);
      callback({ ok: true, roomCode: room.roomCode });
      emitRoom(room);
    } catch (error) {
      callback({ ok: false, error: error.message });
    }
  });

  socket.on("room:join", ({ roomCode, playerName }, callback) => {
    try {
      const room = rooms.get(String(roomCode).toUpperCase());
      if (!room) throw new Error("Room not found.");

      addPlayer(room, socket.id, playerName);
      socket.join(room.roomCode);
      callback({ ok: true, roomCode: room.roomCode });
      emitRoom(room);
    } catch (error) {
      callback({ ok: false, error: error.message });
    }
  });

  socket.on("player:ready", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    toggleReady(room, socket.id);
    emitRoom(room);
  });

  socket.on("game:start", ({ roomCode }, callback) => {
    try {
      const room = rooms.get(roomCode);
      if (!room) throw new Error("Room not found.");
      if (room.hostSocketId !== socket.id) throw new Error("Only host can start.");
      if (!canStart(room)) throw new Error("Need 2–9 ready players.");

      startGame(room);
      emitRoom(room);
      callback({ ok: true });
    } catch (error) {
      callback({ ok: false, error: error.message });
    }
  });

  socket.on("betting:auto-demo", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room || room.phase !== "betting") return;

    autoAssignDemoBets(room);
    emitRoom(room);
  });

  socket.on("secret:submit", ({ roomCode, cardIds }, callback) => {
    try {
      const room = rooms.get(roomCode);
      if (!room || room.phase !== "secret-card") throw new Error("Not secret card phase.");

      submitSecretCards(room, socket.id, cardIds);

      if (allSecretCardsSubmitted(room)) {
        beginRace(room);
      }

      emitRoom(room);
      callback({ ok: true });
    } catch (error) {
      callback({ ok: false, error: error.message });
    }
  });

  socket.on("race:step", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room || room.phase !== "racing") return;

    stepRace(room);
    emitRoom(room);
  });

  socket.on("payouts:continue", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room || room.phase !== "payouts") return;

    finishPayouts(room);
    emitRoom(room);
  });

  socket.on("disconnect", () => {
    for (const [roomCode, room] of rooms) {
      const wasInRoom = room.players.some((p) => p.id === socket.id);
      if (!wasInRoom) continue;

      removePlayer(room, socket.id);

      if (room.players.length === 0) {
        rooms.delete(roomCode);
      } else {
        emitRoom(room);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`CRAZY RACING server running on http://localhost:${PORT}`);
});
