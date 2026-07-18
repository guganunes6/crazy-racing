import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import type { CorsOptions } from "cors";
import {
    CARD_CATALOG_BY_ID,
    type BetRiskSide,
    type TicketStackKey,
} from "@crazy-racing/shared";

import {
    createRoom,
    addPlayer,
    reattachPlayer,
    markPlayerDisconnected,
    removePlayer,
    beginDisconnectedPlayerPause,
    setPauseVote,
    hasKickVoteMajority,
    toggleManualPause,
    assertRoomNotPaused,
    findPlayerBySocketId,
    toggleReady,
    canStart,
    startGame,
    submitSecretCards,
    beginRace,
    stepRace,
    reshuffleRace,
    confirmRaceResults,
    finishPayouts,
    selectRaceAgain,
    canRestartGame,
    restartGame,
    type Room,
} from "./gameLogic.js";

import {
    confirmDoubledTicket,
    confirmTicketDraft,
} from "./betting/BettingDraft.js";

import { getAvailableTickets } from "./betting/TicketStacks.js";

import { environment } from "./config/environment.js";
import { logger } from "./observability/logger.js";

import {
    ReconnectionManager,
    RECONNECT_GRACE_PERIOD_MS,
} from "./network/ReconnectionManager.js";

const app = express();
const startedAt = Date.now();
let isShuttingDown = false;

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use((request, response, next) => {
    const requestStartedAt = Date.now();

    response.on("finish", () => {
        if (request.path === "/health" || request.path === "/ready") {
            return;
        }

        logger.info("http_request", {
            method: request.method,
            path: request.path,
            statusCode: response.statusCode,
            durationMs: Date.now() - requestStartedAt,
        });
    });

    next();
});

app.use((_request, response, next) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
});

const corsOptions: CorsOptions = {
    origin(origin, callback) {
        // Requests without an Origin header include health checks and server tools.
        if (!origin || environment.clientOrigins.includes(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    methods: ["GET", "POST"],
};

app.use(cors(corsOptions));

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: corsOptions,
});

const rooms = new Map<string, Room>();

app.get("/health", (_request, response) => {
    response.status(200).json({
        status: "ok",
        version: environment.appVersion,
        environment: environment.nodeEnv,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
    });
});

app.get("/ready", (_request, response) => {
    if (isShuttingDown) {
        response.status(503).json({
            status: "shutting_down",
            timestamp: new Date().toISOString(),
        });
        return;
    }

    response.status(200).json({
        status: "ready",
        version: environment.appVersion,
        activeRooms: rooms.size,
        connectedSockets: io.engine.clientsCount,
        startedAt: new Date(startedAt).toISOString(),
        timestamp: new Date().toISOString(),
    });
});

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown error";
}

function requireSessionId(value: unknown): string {
    const sessionId = String(value ?? "").trim();

    if (sessionId.length < 8 || sessionId.length > 128) {
        throw new Error("Invalid player session.");
    }

    return sessionId;
}

function publicRoom(room: Room) {
    const currentDefinition = room.currentCard
        ? CARD_CATALOG_BY_ID[room.currentCard.definitionId]
        : undefined;

    return {
        roomCode: room.roomCode,

        hostPlayerId: room.hostPlayerId,

        hostSocketId: room.hostSocketId,

        phase: room.phase,

        raceNumber: room.raceNumber,

        shortenedBy: room.shortenedBy,

        deckRemaining: room.deck.length,

        publicRaceDeckDefinitionIds: room.publicRaceDeckDefinitionIds,

        currentCard: room.currentCard,

        currentCardDisplay: currentDefinition
            ? {
                owner: currentDefinition.racer,

                name: currentDefinition.name,

                fullName:
                    currentDefinition.racer === "GREEN"
                        ? `GREEN: ${currentDefinition.name}`
                        : `${currentDefinition.racer}: ${currentDefinition.name}`,
            }
            : null,

        currentSideBet: room.currentSideBet,

        availableTickets: getAvailableTickets(room.ticketStacks),

        bettingDraft: room.bettingDraft,

        canRestartGame: canRestartGame(room),

        pause: {
            isPaused: room.pause.manual || room.pause.disconnectedPlayers.length > 0,
            manual: room.pause.manual,
            reason:
                room.pause.disconnectedPlayers.length > 0
                    ? "PLAYER_DISCONNECTED"
                    : room.pause.manual
                        ? "MANUAL"
                        : null,
            disconnectedPlayers: room.pause.disconnectedPlayers.map((entry) => {
                const eligibleVoterCount = room.players.filter(
                    (player) =>
                        player.id !== entry.playerId &&
                        player.connectionState === "connected",
                ).length;

                return {
                    ...entry,
                    eligibleVoterCount,
                    requiredKickVoteCount: Math.ceil(eligibleVoterCount / 2),
                };
            }),
        },

        players: room.players.map((player) => ({
            id: player.id,

            name: player.name,

            ready: player.ready,

            money: player.money,

            handCount: player.hand.length,

            draftedTickets: player.draftedTickets,

            doubledTicketId: player.doubledTicketId,

            secretCardsSubmitted: player.selectedSecretCards.length > 0,

            raceAgain: player.raceAgain,

            connectionState: player.connectionState,
        })),

        racers: room.racers,

        podium: room.podium,

        payoutSummary: room.payoutSummary,

        completedRaceReplays: room.completedRaceReplays,

        raceLog: room.raceLog,

        raceEvents: room.raceEvents,
    };
}

function emitRoom(room: Room): void {
    io.to(room.roomCode).emit("room:update", publicRoom(room));

    for (const player of room.players) {
        io.to(player.socketId).emit("player:private", {
            hand: player.hand,

            selectedSecretCards: player.selectedSecretCards,
        });
    }
}

const reconnectionManager = new ReconnectionManager({
    onRoomChanged: emitRoom,

    onPlayerRemoved: (room, player, reason) => {
        io.to(player.socketId).emit("room:kicked", {
            reason,
            mayRejoin: true,
        });

        io.sockets.sockets.get(player.socketId)?.leave(room.roomCode);
    },

    removePlayer: (room, playerId) =>
        removePlayer(room, playerId, {
            allowRejoin: true,
        }),
});

function requireRoom(roomCode: unknown): Room {
    const room = rooms.get(
        String(roomCode ?? "")
            .trim()
            .toUpperCase(),
    );

    if (!room) {
        throw new Error("Room not found.");
    }

    return room;
}

function requireHost(room: Room, socketId: string): void {
    if (room.hostSocketId !== socketId) {
        throw new Error("Only the host can perform this action.");
    }
}

io.on("connection", (socket) => {
    logger.info("socket_connected", {
        socketId: socket.id,
        transport: socket.conn.transport.name,
    });

    socket.on("room:create", ({ playerName, sessionId }, callback) => {
        try {
            const room = createRoom(
                socket.id,
                requireSessionId(sessionId),
                playerName,
            );

            rooms.set(room.roomCode, room);

            socket.join(room.roomCode);

            callback({
                ok: true,
                roomCode: room.roomCode,
            });

            emitRoom(room);
        } catch (error) {
            callback({
                ok: false,
                error: getErrorMessage(error),
            });
        }
    });

    socket.on("room:join", ({ roomCode, playerName, sessionId }, callback) => {
        try {
            const room = rooms.get(String(roomCode).trim().toUpperCase());

            if (!room) {
                throw new Error("Room not found.");
            }

            const normalizedSessionId = requireSessionId(sessionId);

            const existingPlayer = room.players.find(
                (player) => player.sessionId === normalizedSessionId,
            );

            if (existingPlayer) {
                const reattachedPlayer = reattachPlayer(
                    room,
                    normalizedSessionId,
                    socket.id,
                );

                if (!reattachedPlayer) {
                    throw new Error("Your previous room session could not be restored.");
                }

                reconnectionManager.cancel(room.roomCode, reattachedPlayer.id);
            } else {
                addPlayer(
                    room,
                    socket.id,
                    normalizedSessionId,
                    playerName,
                );
            }

            socket.join(room.roomCode);

            callback({
                ok: true,
                roomCode: room.roomCode,
            });

            emitRoom(room);
        } catch (error) {
            callback({
                ok: false,
                error: getErrorMessage(error),
            });
        }
    });

    socket.on("room:leave", ({ roomCode }, callback) => {
        try {
            const room = requireRoom(roomCode);
            const player = findPlayerBySocketId(room, socket.id);

            if (!player) {
                throw new Error("Player not found in this room.");
            }

            reconnectionManager.cancel(room.roomCode, player.id);

            const removed = removePlayer(room, player.id, {
                allowRejoin: false,
                ban: false,
            });

            if (!removed) {
                throw new Error("Player could not be removed from the room.");
            }

            socket.leave(room.roomCode);

            callback?.({
                ok: true,
                roomCode: room.roomCode,
            });

            if (room.players.length === 0) {
                rooms.delete(room.roomCode);
                return;
            }

            emitRoom(room);
        } catch (error) {
            callback?.({
                ok: false,
                error: getErrorMessage(error),
            });
        }
    });

    socket.on("room:reconnect", ({ roomCode, sessionId }, callback) => {
        try {
            const normalizedRoomCode = String(roomCode).trim().toUpperCase();
            const room = rooms.get(normalizedRoomCode);

            if (!room) throw new Error("Room not found.");

            const player = reattachPlayer(
                room,
                requireSessionId(sessionId),
                socket.id,
            );

            if (!player) {
                throw new Error(
                    "Your previous room session has expired or the player was removed.",
                );
            }

            reconnectionManager.cancel(room.roomCode, player.id);

            socket.join(room.roomCode);
            callback({ ok: true, roomCode: room.roomCode });
            emitRoom(room);
        } catch (error) {
            callback({ ok: false, error: getErrorMessage(error) });
        }
    });

    socket.on(
        "pause:vote",
        ({ roomCode, disconnectedPlayerId, vote }, callback) => {
            try {
                const room = requireRoom(roomCode);
                const voter = findPlayerBySocketId(room, socket.id);

                if (!voter) {
                    throw new Error("Player not found.");
                }

                if (vote !== "KICK" && vote !== "WAIT") {
                    throw new Error("Invalid pause vote.");
                }

                setPauseVote(room, voter.id, disconnectedPlayerId, vote);

                if (hasKickVoteMajority(room, disconnectedPlayerId)) {
                    reconnectionManager.removeNow(
                        room,
                        disconnectedPlayerId,
                        "A majority of players voted to remove you.",
                    );
                } else {
                    emitRoom(room);
                }

                callback?.({ ok: true });
            } catch (error) {
                callback?.({
                    ok: false,
                    error: getErrorMessage(error),
                });
            }
        },
    );

    socket.on("pause:kick-now", ({ roomCode, playerId }, callback) => {
        try {
            const room = requireRoom(roomCode);
            requireHost(room, socket.id);

            const pause = room.pause.disconnectedPlayers.find(
                (entry) => entry.playerId === playerId,
            );

            if (!pause) {
                throw new Error("That player is not waiting to reconnect.");
            }

            reconnectionManager.removeNow(
                room,
                playerId,
                "The host removed you while you were disconnected.",
            );

            callback?.({ ok: true });
        } catch (error) {
            callback?.({
                ok: false,
                error: getErrorMessage(error),
            });
        }
    });

    socket.on("host:toggle-pause", ({ roomCode }, callback) => {
        try {
            const room = requireRoom(roomCode);
            requireHost(room, socket.id);
            toggleManualPause(room);
            emitRoom(room);
            callback?.({ ok: true });
        } catch (error) {
            callback?.({
                ok: false,
                error: getErrorMessage(error),
            });
        }
    });

    socket.on("host:kick-player", ({ roomCode, playerId }, callback) => {
        try {
            const room = requireRoom(roomCode);
            requireHost(room, socket.id);

            if (playerId === room.hostPlayerId) {
                throw new Error("The host cannot kick themselves.");
            }

            const removed = removePlayer(room, playerId, {
                allowRejoin: false,
                ban: true,
            });

            if (!removed) {
                throw new Error("Player not found.");
            }

            reconnectionManager.cancel(room.roomCode, playerId);

            io.to(removed.socketId).emit("room:kicked", {
                reason: "The host banned you from this room.",
                mayRejoin: false,
            });

            io.sockets.sockets.get(removed.socketId)?.leave(room.roomCode);

            emitRoom(room);
            callback?.({ ok: true });
        } catch (error) {
            callback?.({
                ok: false,
                error: getErrorMessage(error),
            });
        }
    });

    socket.on("player:ready", ({ roomCode }) => {
        const room = rooms.get(roomCode);

        if (!room) {
            return;
        }

        try {
            assertRoomNotPaused(room);
        } catch {
            return;
        }

        toggleReady(room, socket.id);

        emitRoom(room);
    });

    socket.on("game:start", ({ roomCode }, callback) => {
        try {
            const room = rooms.get(roomCode);

            if (!room) {
                throw new Error("Room not found.");
            }

            assertRoomNotPaused(room);

            if (room.hostSocketId !== socket.id) {
                throw new Error("Only the host can start the game.");
            }

            if (!canStart(room)) {
                throw new Error("Need 2-9 ready players.");
            }

            startGame(room);
            emitRoom(room);

            callback({
                ok: true,
            });
        } catch (error) {
            callback({
                ok: false,
                error: getErrorMessage(error),
            });
        }
    });

    socket.on(
        "betting:confirm",
        (
            {
                roomCode,
                stack,
                risk,
            }: {
                roomCode: string;
                stack: TicketStackKey;
                risk: BetRiskSide;
            },
            callback,
        ) => {
            try {
                const room = rooms.get(roomCode);

                if (!room) {
                    throw new Error("Room not found.");
                }

                assertRoomNotPaused(room);

                confirmTicketDraft(room, socket.id, stack, risk);

                emitRoom(room);

                callback({
                    ok: true,
                });
            } catch (error) {
                callback({
                    ok: false,
                    error: getErrorMessage(error),
                });
            }
        },
    );

    socket.on("betting:double", ({ roomCode, ticketId }, callback) => {
        try {
            const room = rooms.get(roomCode);

            if (!room) {
                throw new Error("Room not found.");
            }

            assertRoomNotPaused(room);

            confirmDoubledTicket(room, socket.id, ticketId);

            emitRoom(room);

            callback({
                ok: true,
            });
        } catch (error) {
            callback({
                ok: false,
                error: getErrorMessage(error),
            });
        }
    });

    socket.on("secret:submit", ({ roomCode, cardIds }, callback) => {
        try {
            const room = rooms.get(roomCode);

            if (!room) {
                throw new Error("Room not found.");
            }

            assertRoomNotPaused(room);

            submitSecretCards(room, socket.id, cardIds);

            emitRoom(room);

            callback({
                ok: true,
            });
        } catch (error) {
            callback({
                ok: false,
                error: getErrorMessage(error),
            });
        }
    });

    socket.on("race:start", ({ roomCode }, callback) => {
        try {
            const room = rooms.get(roomCode);

            if (!room) {
                throw new Error("Room not found.");
            }

            if (room.hostSocketId !== socket.id) {
                throw new Error("Only the host can start the race.");
            }

            assertRoomNotPaused(room);

            beginRace(room);
            emitRoom(room);

            callback({
                ok: true,
            });
        } catch (error) {
            callback({
                ok: false,
                error: getErrorMessage(error),
            });
        }
    });

    socket.on("race:step", ({ roomCode }, callback) => {
        try {
            const room = rooms.get(roomCode);

            if (!room) {
                throw new Error("Room not found.");
            }

            if (room.hostSocketId !== socket.id) {
                throw new Error("Only the host can flip cards.");
            }

            assertRoomNotPaused(room);

            stepRace(room);
            emitRoom(room);

            callback({
                ok: true,
            });
        } catch (error) {
            callback({
                ok: false,
                error: getErrorMessage(error),
            });
        }
    });

    socket.on("race:reshuffle", ({ roomCode }, callback) => {
        try {
            const room = rooms.get(roomCode);

            if (!room) {
                throw new Error("Room not found.");
            }

            if (room.hostSocketId !== socket.id) {
                throw new Error("Only the host can reshuffle the race deck.");
            }

            assertRoomNotPaused(room);

            reshuffleRace(room);

            emitRoom(room);

            callback({
                ok: true,
            });
        } catch (error) {
            callback({
                ok: false,
                error: getErrorMessage(error),
            });
        }
    });

    socket.on("race:check-results", ({ roomCode }, callback) => {
        try {
            const room = rooms.get(roomCode);

            if (!room) {
                throw new Error("Room not found.");
            }

            if (room.hostSocketId !== socket.id) {
                throw new Error("Only the host can check the race results.");
            }

            assertRoomNotPaused(room);

            confirmRaceResults(room);

            emitRoom(room);

            callback({
                ok: true,
            });
        } catch (error) {
            callback({
                ok: false,
                error: getErrorMessage(error),
            });
        }
    });

    socket.on("payouts:continue", ({ roomCode }) => {
        const room = rooms.get(roomCode);

        if (!room) {
            return;
        }

        if (room.hostSocketId !== socket.id) {
            return;
        }

        try {
            assertRoomNotPaused(room);
            finishPayouts(room);
            emitRoom(room);
        } catch {
            return;
        }
    });

    socket.on("final:race-again", ({ roomCode }, callback) => {
        try {
            const room = rooms.get(roomCode);

            if (!room) {
                throw new Error("Room not found.");
            }

            assertRoomNotPaused(room);

            selectRaceAgain(room, socket.id);

            emitRoom(room);

            callback({
                ok: true,
            });
        } catch (error) {
            callback({
                ok: false,
                error: getErrorMessage(error),
            });
        }
    });

    socket.on("final:restart", ({ roomCode }, callback) => {
        try {
            const room = rooms.get(roomCode);

            if (!room) {
                throw new Error("Room not found.");
            }

            if (room.hostSocketId !== socket.id) {
                throw new Error("Only the host can restart the game.");
            }

            assertRoomNotPaused(room);

            const kickedPlayerIds = restartGame(room);

            for (const kickedPlayerId of kickedPlayerIds) {
                io.to(kickedPlayerId).emit("room:kicked", {
                    reason:
                        "The host restarted the game with the players who selected Race again.",
                });

                io.sockets.sockets.get(kickedPlayerId)?.leave(room.roomCode);
            }

            emitRoom(room);

            callback({
                ok: true,
            });
        } catch (error) {
            callback({
                ok: false,
                error: getErrorMessage(error),
            });
        }
    });

    socket.on("disconnect", (reason) => {
        logger.info("socket_disconnected", {
            socketId: socket.id,
            reason,
        });

        for (const room of rooms.values()) {
            const player = markPlayerDisconnected(room, socket.id);

            if (player) {
                beginDisconnectedPlayerPause(room, player, RECONNECT_GRACE_PERIOD_MS);

                reconnectionManager.start(room, player);

                emitRoom(room);
            }
        }
    });
});

app.use((_request: Request, response: Response) => {
    response.status(404).json({
        error: "Not found",
    });
});

app.use(
    (error: unknown, request: Request, response: Response, _next: NextFunction) => {
        logger.error("unhandled_http_error", {
            error,
            method: request.method,
            path: request.path,
        });

        if (response.headersSent) {
            _next(error);
            return;
        }

        response.status(500).json({
            error: "Internal server error",
        });
    },
);

const listener = httpServer.listen(environment.port, "0.0.0.0", () => {
    logger.info("server_started", {
        port: environment.port,
        environment: environment.nodeEnv,
        version: environment.appVersion,
        allowedClientOrigins: environment.clientOrigins,
    });
});

function shutdown(signal: NodeJS.Signals): void {
    if (isShuttingDown) {
        return;
    }

    isShuttingDown = true;
    logger.info("shutdown_started", { signal });

    const forceExitTimer = setTimeout(() => {
        logger.error("shutdown_forced", {
            timeoutMs: environment.shutdownTimeoutMs,
        });
        process.exit(1);
    }, environment.shutdownTimeoutMs);

    forceExitTimer.unref();

    io.close(() => {
        clearTimeout(forceExitTimer);
        logger.info("shutdown_complete");
        process.exit(0);
    });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

process.on("uncaughtException", (error) => {
    logger.error("uncaught_exception", { error });
    shutdown("SIGTERM");
});

process.on("unhandledRejection", (reason) => {
    logger.error("unhandled_rejection", { reason });
});