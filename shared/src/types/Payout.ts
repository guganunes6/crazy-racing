import type {
    BetRiskSide,
    BetTicketTier
} from "../cards/BettingTickets.js";
import type { RacerName } from "../racers/Racers.js";
import type { SideBetId } from "../cards/SideBets.js";

export type TicketPayoutResult = {
    ticketId: string;
    ticketKind: "mascot" | "side-bet";

    label: string;

    tier: BetTicketTier;
    risk: BetRiskSide;

    mascot?: RacerName;
    sideBetId?: SideBetId;
    answer?: "YES" | "NO";

    correct: boolean;
    doubled: boolean;

    basePayout: number;
    finalPayout: number;
};

export type PlayerRacePayout = {
    playerId: string;
    playerName: string;

    moneyBefore: number;
    moneyChange: number;
    moneyAfter: number;

    tickets: TicketPayoutResult[];
};

export type RacePayoutSummary = {
    raceNumber: number;

    sideBetId: SideBetId;
    sideBetQuestion: string;
    sideBetResult: boolean;

    playerPayouts: PlayerRacePayout[];
};