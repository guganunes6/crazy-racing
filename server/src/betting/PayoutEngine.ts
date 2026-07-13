import {
    createMascotBetTicket,
    createSideBetTicket,
    type DraftedBetTicket,
    type PlayerRacePayout,
    type RacePayoutSummary,
    type TicketPayoutResult
} from "@crazy-racing/shared";
import type {
    Player,
    Room
} from "../gameLogic.js";
import {
    evaluateSideBet
} from "./SideBetEvaluator.js";

export function processRacePayouts(
    room: Room
): RacePayoutSummary {
    if (room.racePayoutProcessed) {
        if (!room.payoutSummary) {
            throw new Error(
                "The payout was processed but no summary exists."
            );
        }

        return room.payoutSummary;
    }

    const sideBetResult = evaluateSideBet(
        room,
        room.currentSideBet.id
    );

    const playerPayouts =
        room.players.map((player) =>
            processPlayerPayout(
                room,
                player,
                sideBetResult
            )
        );

    const summary: RacePayoutSummary = {
        raceNumber: room.raceNumber,

        sideBetId:
            room.currentSideBet.id,

        sideBetQuestion:
            room.currentSideBet.text,

        sideBetResult,

        playerPayouts
    };

    room.payoutSummary = summary;
    room.racePayoutProcessed = true;

    return summary;
}

function processPlayerPayout(
    room: Room,
    player: Player,
    sideBetResult: boolean
): PlayerRacePayout {
    const moneyBefore =
        player.money;

    const tickets =
        player.draftedTickets.map(
            (ticket) =>
                evaluateTicket(
                    room,
                    ticket,
                    sideBetResult
                )
        );

    const moneyChange =
        tickets.reduce(
            (total, ticket) =>
                total + ticket.finalPayout,
            0
        );

    /*
     * Players cannot have less than zero money.
     */
    player.money = Math.max(
        0,
        player.money + moneyChange
    );

    return {
        playerId: player.id,
        playerName: player.name,

        moneyBefore,
        moneyChange:
            player.money - moneyBefore,
        moneyAfter:
            player.money,

        tickets
    };
}

function evaluateTicket(
    room: Room,
    ticket: DraftedBetTicket,
    sideBetResult: boolean
): TicketPayoutResult {
    if (ticket.kind === "mascot") {
        return evaluateMascotTicket(
            room,
            ticket
        );
    }

    return evaluateSideBetTicket(
        ticket,
        sideBetResult
    );
}

function evaluateMascotTicket(
    room: Room,
    ticket: Extract<
        DraftedBetTicket,
        { kind: "mascot" }
    >
): TicketPayoutResult {
    const podiumEntry = room.podium.find(
        (entry) =>
            entry.racer === ticket.racer
    );

    const place =
        podiumEntry?.place ?? 4;

    const ticketDefinition =
        createMascotBetTicket(
            ticket.racer,
            ticket.tier,
            ticket.risk
        );

    let basePayout = 0;

    if (place === 1) {
        basePayout =
            ticketDefinition.payouts.first;
    } else if (place === 2) {
        basePayout =
            ticketDefinition.payouts.second;
    } else if (place === 3) {
        basePayout =
            ticketDefinition.payouts.third;
    }

    const multiplier =
        ticket.doubled ? 2 : 1;

    return {
        ticketId: ticket.id,
        ticketKind: "mascot",

        label:
            `${ticket.racer} - ${capitalize(ticket.tier)} - ` +
            `${capitalize(ticket.risk)}`,

        tier: ticket.tier,
        risk: ticket.risk,
        mascot: ticket.racer,

        correct: place <= 3,
        doubled: ticket.doubled,

        basePayout,
        finalPayout:
            basePayout * multiplier
    };
}

function evaluateSideBetTicket(
    ticket: Extract<
        DraftedBetTicket,
        { kind: "side-bet" }
    >,
    sideBetResult: boolean
): TicketPayoutResult {
    const selectedAnswerIsCorrect =
        (
            ticket.answer === "YES" &&
            sideBetResult
        ) ||
        (
            ticket.answer === "NO" &&
            !sideBetResult
        );

    const ticketDefinition =
        createSideBetTicket(
            ticket.answer,
            ticket.tier,
            ticket.risk
        );

    const basePayout =
        selectedAnswerIsCorrect
            ? ticketDefinition.correctPayout
            : ticketDefinition.incorrectPayout;

    const multiplier =
        ticket.doubled ? 2 : 1;

    return {
        ticketId: ticket.id,
        ticketKind: "side-bet",

        label:
            `${ticket.answer} - ${capitalize(ticket.tier)} - ` +
            `${capitalize(ticket.risk)}`,

        tier: ticket.tier,
        risk: ticket.risk,

        sideBetId:
            ticket.sideBetId,

        answer:
            ticket.answer,

        correct:
            selectedAnswerIsCorrect,

        doubled:
            ticket.doubled,

        basePayout,

        finalPayout:
            basePayout * multiplier
    };
}

function capitalize(
    value: string
): string {
    return (
        value.charAt(0).toUpperCase() +
        value.slice(1).toLowerCase()
    );
}