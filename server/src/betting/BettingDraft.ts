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
        room.bettingDraft.turnIndex >=
        room.bettingDraft.order.length
    ) {
        room.bettingDraft.completed = true;
        room.bettingDraft.currentPlayerId = null;

        room.phase =
            room.raceNumber === 3
                ? "double-bet"
                : "secret-card";

        return;
    }

    room.bettingDraft.currentPlayerId =
        room.bettingDraft.order[
        room.bettingDraft.turnIndex
        ];
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