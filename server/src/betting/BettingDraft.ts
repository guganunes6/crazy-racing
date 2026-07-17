import { nanoid } from "nanoid";
import {
    type BetRiskSide,
    type DraftedBetTicket,
    type RacerName,
    type TicketStackKey
} from "@crazy-racing/shared";
import type { Room } from "../gameLogic.js";
import {
    getAvailableTickets,
    takeTicketFromStack
} from "./TicketStacks.js";

export function startBettingDraft(
    room: Room,
    startingPlayerIndex: number
): void {
    const playerIds = room.players.map(
        (player) => player.id
    );

    const rotatedPlayers = rotateArray(
        playerIds,
        startingPlayerIndex
    );

    const picksPerPlayer =
        room.players.length === 2 ? 3 : 2;

    const order: string[] = [];

    for (
        let round = 0;
        round < picksPerPlayer;
        round++
    ) {
        const roundOrder =
            round % 2 === 0
                ? rotatedPlayers
                : [...rotatedPlayers].reverse();

        order.push(...roundOrder);
    }

    room.bettingDraft = {
        order,
        turnIndex: 0,
        currentPlayerId: order[0] ?? null,
        picksPerPlayer,
        startingPlayerIndex,
        completed: false
    };

    room.phase = "betting";
}

export function confirmTicketDraft(
    room: Room,
    socketId: string,
    stack: TicketStackKey,
    risk: BetRiskSide
): void {
    if (room.phase !== "betting") {
        throw new Error("The betting draft is not active.");
    }

    const player = room.players.find(
        (candidate) => candidate.socketId === socketId
    );

    if (!player) {
        throw new Error("Player not found.");
    }

    if (room.bettingDraft.currentPlayerId !== player.id) {
        throw new Error("It is not your drafting turn.");
    }

    const availableTicket = getAvailableTickets(
        room.ticketStacks
    ).find((ticket) => ticket.stack === stack);

    if (!availableTicket) {
        throw new Error(
            "That ticket is no longer available."
        );
    }

    const tier = takeTicketFromStack(
        room.ticketStacks,
        stack
    );

    let draftedTicket: DraftedBetTicket;

    if (stack === "YES" || stack === "NO") {
        draftedTicket = {
            id: nanoid(10),
            kind: "side-bet",
            answer: stack,
            sideBetId: room.currentSideBet.id,
            tier,
            risk,
            doubled: false
        };
    } else {
        draftedTicket = {
            id: nanoid(10),
            kind: "mascot",
            racer: stack as RacerName,
            tier,
            risk,
            doubled: false
        };
    }

    player.draftedTickets.push(draftedTicket);

    advanceDraft(room);
}

export function confirmDoubledTicket(
    room: Room,
    socketId: string,
    ticketId: string
): void {
    if (room.phase !== "double-bet") {
        throw new Error(
            "Doubled-ticket selection is not active."
        );
    }

    const player = room.players.find(
        (candidate) => candidate.socketId === socketId
    );

    if (!player) {
        throw new Error("Player not found.");
    }

    if (player.doubledTicketId) {
        throw new Error(
            "You already selected a doubled ticket."
        );
    }

    const ticket = player.draftedTickets.find(
        (candidate) => candidate.id === ticketId
    );

    if (!ticket) {
        throw new Error("Ticket not found.");
    }

    ticket.doubled = true;
    player.doubledTicketId = ticket.id;

    const allPlayersSelected = room.players.every(
        (candidate) =>
            candidate.doubledTicketId !== null
    );

    if (allPlayersSelected) {
        room.phase = "secret-card";
    }
}

function advanceDraft(room: Room): void {
    room.bettingDraft.turnIndex += 1;

    if (
        room.bettingDraft.turnIndex <
        room.bettingDraft.order.length
    ) {
        room.bettingDraft.currentPlayerId =
            room.bettingDraft.order[
            room.bettingDraft.turnIndex
            ];

        return;
    }

    /*
     * A player may have missed one or more selections because they were
     * disconnected while the original snake draft continued.
     *
     * Before leaving the betting phase, calculate every player's deficit.
     * When at least one player is short, begin a supplemental snake draft
     * containing only the players who still need tickets. Supplemental
     * rounds continue until everyone owns picksPerPlayer tickets.
     */
    const supplementalOrder =
        createSupplementalSnakeOrder(room);

    if (supplementalOrder.length > 0) {
        room.bettingDraft.order =
            supplementalOrder;

        room.bettingDraft.turnIndex = 0;

        room.bettingDraft.currentPlayerId =
            supplementalOrder[0] ?? null;

        room.bettingDraft.completed = false;

        return;
    }

    room.bettingDraft.completed = true;
    room.bettingDraft.currentPlayerId = null;

    room.phase =
        room.raceNumber === 3
            ? "double-bet"
            : "secret-card";
}

function createSupplementalSnakeOrder(
    room: Room
): string[] {
    const target =
        room.bettingDraft.picksPerPlayer;

    const rotatedPlayers = rotateArray(
        room.players,
        room.bettingDraft.startingPlayerIndex
    );

    const missingByPlayerId =
        new Map<string, number>();

    for (const player of rotatedPlayers) {
        const missing = Math.max(
            0,
            target -
            player.draftedTickets.length
        );

        if (missing > 0) {
            missingByPlayerId.set(
                player.id,
                missing
            );
        }
    }

    if (missingByPlayerId.size === 0) {
        return [];
    }

    const maxMissing = Math.max(
        ...missingByPlayerId.values()
    );

    const order: string[] = [];

    for (
        let round = 0;
        round < maxMissing;
        round += 1
    ) {
        const playersNeedingThisRound =
            rotatedPlayers.filter(
                (player) =>
                    (missingByPlayerId.get(
                        player.id
                    ) ?? 0) >
                    round
            );

        const roundOrder =
            round % 2 === 0
                ? playersNeedingThisRound
                : [...playersNeedingThisRound]
                    .reverse();

        order.push(
            ...roundOrder.map(
                (player) => player.id
            )
        );
    }

    return order;
}

function rotateArray<T>(
    values: T[],
    startIndex: number
): T[] {
    if (values.length === 0) {
        return [];
    }

    const normalizedIndex =
        ((startIndex % values.length) +
            values.length) %
        values.length;

    return [
        ...values.slice(normalizedIndex),
        ...values.slice(0, normalizedIndex)
    ];
}