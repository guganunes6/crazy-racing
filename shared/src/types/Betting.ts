import type {
    BetRiskSide,
    BetTicketTier
} from "../cards/BettingTickets";
import type { RacerName } from "../racers/Racers";
import type { SideBetId } from "../cards/SideBets";

export type TicketStackKey =
    | RacerName
    | "YES"
    | "NO";

export type DraftedMascotTicket = {
    id: string;
    kind: "mascot";
    racer: RacerName;
    tier: BetTicketTier;
    risk: BetRiskSide;
    doubled: boolean;
};

export type DraftedSideBetTicket = {
    id: string;
    kind: "side-bet";
    answer: "YES" | "NO";
    sideBetId: SideBetId;
    tier: BetTicketTier;
    risk: BetRiskSide;
    doubled: boolean;
};

export type DraftedBetTicket =
    | DraftedMascotTicket
    | DraftedSideBetTicket;

export type TicketStackState = {
    stack: TicketStackKey;
    remainingTiers: BetTicketTier[];
};

export type AvailableTicket = {
    stack: TicketStackKey;
    tier: BetTicketTier;
    kind: "mascot" | "side-bet";
};

export type BettingDraftState = {
    order: string[];
    turnIndex: number;
    currentPlayerId: string | null;
    picksPerPlayer: number;
    startingPlayerIndex: number;
    completed: boolean;
};

export type PlayerDraftState = {
    draftedTickets: DraftedBetTicket[];
    doubledTicketId: string | null;
};