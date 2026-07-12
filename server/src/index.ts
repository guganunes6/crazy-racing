import express from "express";
import cors from "cors";
import {
    createServer
} from "http";
import {
    Server
} from "socket.io";
import {
    CARD_CATALOG_BY_ID,
    type BetRiskSide,
    type TicketStackKey
} from "@crazy-racing/shared";

import {
    createRoom,
    addPlayer,
    removePlayer,
    toggleReady,
    canStart,
    startGame,
    submitSecretCards,
    beginRace,
    stepRace,
    reshuffleRace,
    finishPayouts,
    selectRaceAgain,
    canRestartGame,
    restartGame,
    type Room
} from "./gameLogic.js";

import {
    confirmDoubledTicket,
    confirmTicketDraft
} from "./betting/BettingDraft.js";

import {
    getAvailableTickets
} from "./betting/TicketStacks.js";

const app = express();

app.use(cors());

const httpServer =
    createServer(app);

const io = new Server(
    httpServer,
    {
        cors: {
            origin:
                "http://localhost:5173",
            methods: [
                "GET",
                "POST"
            ]
        }
    }
);

const rooms =
    new Map<string, Room>();

app.get(
    "/health",
    (_request, response) => {
        response.json({
            ok: true
        });
    }
);

function getErrorMessage(
    error: unknown
): string {
    return error instanceof Error
        ? error.message
        : "Unknown error";
}

function publicRoom(
    room: Room
) {
    const currentDefinition =
        room.currentCard
            ? CARD_CATALOG_BY_ID[
            room.currentCard
                .definitionId
            ]
            : undefined;

    return {
        roomCode:
            room.roomCode,

        hostSocketId:
            room.hostSocketId,

        phase:
            room.phase,

        raceNumber:
            room.raceNumber,

        shortenedBy:
            room.shortenedBy,

        deckRemaining:
            room.deck.length,

        publicRaceDeckDefinitionIds:
            room.publicRaceDeckDefinitionIds,

        currentCard:
            room.currentCard,

        currentCardDisplay:
            currentDefinition
                ? {
                    owner:
                        currentDefinition.racer,

                    name:
                        currentDefinition.name,

                    fullName:
                        currentDefinition.racer ===
                            "GREEN"
                            ? `GREEN: ${currentDefinition.name}`
                            : `${currentDefinition.racer}: ${currentDefinition.name}`
                }
                : null,

        currentSideBet:
            room.currentSideBet,

        availableTickets:
            getAvailableTickets(
                room.ticketStacks
            ),

        bettingDraft:
            room.bettingDraft,

        canRestartGame:
            canRestartGame(room),

        players:
            room.players.map(
                (player) => ({
                    id:
                        player.id,

                    name:
                        player.name,

                    ready:
                        player.ready,

                    money:
                        player.money,

                    handCount:
                        player.hand.length,

                    draftedTickets:
                        player.draftedTickets,

                    doubledTicketId:
                        player.doubledTicketId,

                    secretCardsSubmitted:
                        player.selectedSecretCards
                            .length > 0,

                    raceAgain:
                        player.raceAgain
                })
            ),

        racers:
            room.racers,

        podium:
            room.podium,

        raceLog:
            room.raceLog,

        raceEvents:
            room.raceEvents
    };
}

function emitRoom(
    room: Room
): void {
    io.to(
        room.roomCode
    ).emit(
        "room:update",
        publicRoom(room)
    );

    for (
        const player of room.players
    ) {
        io.to(
            player.id
        ).emit(
            "player:private",
            {
                hand:
                    player.hand,

                selectedSecretCards:
                    player.selectedSecretCards
            }
        );
    }
}

io.on(
    "connection",
    (socket) => {
        socket.on(
            "room:create",
            (
                { playerName },
                callback
            ) => {
                try {
                    const room =
                        createRoom(
                            socket.id,
                            playerName
                        );

                    rooms.set(
                        room.roomCode,
                        room
                    );

                    socket.join(
                        room.roomCode
                    );

                    callback({
                        ok: true,
                        roomCode:
                            room.roomCode
                    });

                    emitRoom(room);
                } catch (error) {
                    callback({
                        ok: false,
                        error:
                            getErrorMessage(
                                error
                            )
                    });
                }
            }
        );

        socket.on(
            "room:join",
            (
                {
                    roomCode,
                    playerName
                },
                callback
            ) => {
                try {
                    const room =
                        rooms.get(
                            String(
                                roomCode
                            ).toUpperCase()
                        );

                    if (!room) {
                        throw new Error(
                            "Room not found."
                        );
                    }

                    addPlayer(
                        room,
                        socket.id,
                        playerName
                    );

                    socket.join(
                        room.roomCode
                    );

                    callback({
                        ok: true,
                        roomCode:
                            room.roomCode
                    });

                    emitRoom(room);
                } catch (error) {
                    callback({
                        ok: false,
                        error:
                            getErrorMessage(
                                error
                            )
                    });
                }
            }
        );

        socket.on(
            "player:ready",
            ({ roomCode }) => {
                const room =
                    rooms.get(
                        roomCode
                    );

                if (!room) {
                    return;
                }

                toggleReady(
                    room,
                    socket.id
                );

                emitRoom(room);
            }
        );

        socket.on(
            "game:start",
            (
                { roomCode },
                callback
            ) => {
                try {
                    const room =
                        rooms.get(
                            roomCode
                        );

                    if (!room) {
                        throw new Error(
                            "Room not found."
                        );
                    }

                    if (
                        room.hostSocketId !==
                        socket.id
                    ) {
                        throw new Error(
                            "Only the host can start the game."
                        );
                    }

                    if (
                        !canStart(room)
                    ) {
                        throw new Error(
                            "Need 2-9 ready players."
                        );
                    }

                    startGame(room);
                    emitRoom(room);

                    callback({
                        ok: true
                    });
                } catch (error) {
                    callback({
                        ok: false,
                        error:
                            getErrorMessage(
                                error
                            )
                    });
                }
            }
        );

        socket.on(
            "betting:confirm",
            (
                {
                    roomCode,
                    stack,
                    risk
                }: {
                    roomCode: string;
                    stack: TicketStackKey;
                    risk: BetRiskSide;
                },
                callback
            ) => {
                try {
                    const room =
                        rooms.get(
                            roomCode
                        );

                    if (!room) {
                        throw new Error(
                            "Room not found."
                        );
                    }

                    confirmTicketDraft(
                        room,
                        socket.id,
                        stack,
                        risk
                    );

                    emitRoom(room);

                    callback({
                        ok: true
                    });
                } catch (error) {
                    callback({
                        ok: false,
                        error:
                            getErrorMessage(
                                error
                            )
                    });
                }
            }
        );

        socket.on(
            "betting:double",
            (
                {
                    roomCode,
                    ticketId
                },
                callback
            ) => {
                try {
                    const room =
                        rooms.get(
                            roomCode
                        );

                    if (!room) {
                        throw new Error(
                            "Room not found."
                        );
                    }

                    confirmDoubledTicket(
                        room,
                        socket.id,
                        ticketId
                    );

                    emitRoom(room);

                    callback({
                        ok: true
                    });
                } catch (error) {
                    callback({
                        ok: false,
                        error:
                            getErrorMessage(
                                error
                            )
                    });
                }
            }
        );

        socket.on(
            "secret:submit",
            (
                {
                    roomCode,
                    cardIds
                },
                callback
            ) => {
                try {
                    const room =
                        rooms.get(
                            roomCode
                        );

                    if (!room) {
                        throw new Error(
                            "Room not found."
                        );
                    }

                    submitSecretCards(
                        room,
                        socket.id,
                        cardIds
                    );

                    emitRoom(room);

                    callback({
                        ok: true
                    });
                } catch (error) {
                    callback({
                        ok: false,
                        error:
                            getErrorMessage(
                                error
                            )
                    });
                }
            }
        );

        socket.on(
            "race:start",
            (
                { roomCode },
                callback
            ) => {
                try {
                    const room =
                        rooms.get(
                            roomCode
                        );

                    if (!room) {
                        throw new Error(
                            "Room not found."
                        );
                    }

                    if (
                        room.hostSocketId !==
                        socket.id
                    ) {
                        throw new Error(
                            "Only the host can start the race."
                        );
                    }

                    beginRace(room);
                    emitRoom(room);

                    callback({
                        ok: true
                    });
                } catch (error) {
                    callback({
                        ok: false,
                        error:
                            getErrorMessage(
                                error
                            )
                    });
                }
            }
        );

        socket.on(
            "race:step",
            (
                { roomCode },
                callback
            ) => {
                try {
                    const room =
                        rooms.get(
                            roomCode
                        );

                    if (!room) {
                        throw new Error(
                            "Room not found."
                        );
                    }

                    if (
                        room.hostSocketId !==
                        socket.id
                    ) {
                        throw new Error(
                            "Only the host can flip cards."
                        );
                    }

                    stepRace(room);
                    emitRoom(room);

                    callback({
                        ok: true
                    });
                } catch (error) {
                    callback({
                        ok: false,
                        error:
                            getErrorMessage(
                                error
                            )
                    });
                }
            }
        );

        socket.on(
            "race:reshuffle",
            (
                { roomCode },
                callback
            ) => {
                try {
                    const room =
                        rooms.get(
                            roomCode
                        );

                    if (!room) {
                        throw new Error(
                            "Room not found."
                        );
                    }

                    if (
                        room.hostSocketId !==
                        socket.id
                    ) {
                        throw new Error(
                            "Only the host can reshuffle the race deck."
                        );
                    }

                    reshuffleRace(
                        room
                    );

                    emitRoom(room);

                    callback({
                        ok: true
                    });
                } catch (error) {
                    callback({
                        ok: false,
                        error:
                            getErrorMessage(
                                error
                            )
                    });
                }
            }
        );

        socket.on(
            "payouts:continue",
            ({ roomCode }) => {
                const room =
                    rooms.get(
                        roomCode
                    );

                if (!room) {
                    return;
                }

                if (
                    room.hostSocketId !==
                    socket.id
                ) {
                    return;
                }

                finishPayouts(
                    room
                );

                emitRoom(room);
            }
        );

        socket.on(
            "final:race-again",
            (
                { roomCode },
                callback
            ) => {
                try {
                    const room =
                        rooms.get(
                            roomCode
                        );

                    if (!room) {
                        throw new Error(
                            "Room not found."
                        );
                    }

                    selectRaceAgain(
                        room,
                        socket.id
                    );

                    emitRoom(room);

                    callback({
                        ok: true
                    });
                } catch (error) {
                    callback({
                        ok: false,
                        error:
                            getErrorMessage(
                                error
                            )
                    });
                }
            }
        );

        socket.on(
            "final:restart",
            (
                { roomCode },
                callback
            ) => {
                try {
                    const room =
                        rooms.get(
                            roomCode
                        );

                    if (!room) {
                        throw new Error(
                            "Room not found."
                        );
                    }

                    if (
                        room.hostSocketId !==
                        socket.id
                    ) {
                        throw new Error(
                            "Only the host can restart the game."
                        );
                    }

                    const kickedPlayerIds =
                        restartGame(room);

                    for (
                        const kickedPlayerId
                        of kickedPlayerIds
                    ) {
                        io.to(
                            kickedPlayerId
                        ).emit(
                            "room:kicked",
                            {
                                reason:
                                    "The host restarted the game with the players who selected Race again."
                            }
                        );

                        io.sockets.sockets
                            .get(
                                kickedPlayerId
                            )
                            ?.leave(
                                room.roomCode
                            );
                    }

                    emitRoom(room);

                    callback({
                        ok: true
                    });
                } catch (error) {
                    callback({
                        ok: false,
                        error:
                            getErrorMessage(
                                error
                            )
                    });
                }
            }
        );

        socket.on(
            "disconnect",
            () => {
                for (
                    const [
                        roomCode,
                        room
                    ] of rooms
                ) {
                    const wasInRoom =
                        room.players.some(
                            (player) =>
                                player.id ===
                                socket.id
                        );

                    if (!wasInRoom) {
                        continue;
                    }

                    removePlayer(
                        room,
                        socket.id
                    );

                    if (
                        room.players.length ===
                        0
                    ) {
                        rooms.delete(
                            roomCode
                        );
                    } else {
                        emitRoom(room);
                    }
                }
            }
        );
    }
);

const PORT =
    process.env.PORT ||
    3001;

httpServer.listen(
    PORT,
    () => {
        console.log(
            `CRAZY RACING server running on http://localhost:${PORT}`
        );
    }
);