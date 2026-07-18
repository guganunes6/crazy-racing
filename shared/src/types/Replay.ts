import type {
    DraftedBetTicket
} from "./Betting.js";

import type {
    RacePayoutSummary
} from "./Payout.js";

import type {
    PodiumEntry
} from "./Podium.js";

import type {
    RaceEvent
} from "./RaceEvent.js";

import type {
    RacerState
} from "./Racer.js";

import type {
    SideBetDefinition
} from "../cards/SideBets.js";

export type ReplayPlayer = {
    id: string;
    name: string;

    draftedTickets:
    DraftedBetTicket[];

    doubledTicketId:
    string | null;
};

export type CompletedRaceReplay = {
    raceNumber: number;

    initialRacers:
    RacerState[];

    events:
    RaceEvent[];

    podium:
    PodiumEntry[];

    sideBet:
    SideBetDefinition;

    payoutSummary:
    RacePayoutSummary;

    players:
    ReplayPlayer[];
};