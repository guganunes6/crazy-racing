import type {
    AvailableTicket,
    BettingDraftState,
    DraftedBetTicket
} from "./Betting";
import type {
    PodiumEntry,
    RacerState,
    RaceCard
} from "../index";
import type { SideBetDefinition } from "../cards/SideBets";

export type PublicPlayerState = {
    id: string;
    name: string;
    ready: boolean;
    money: number;
    handCount: number;
    draftedTickets: DraftedBetTicket[];
    doubledTicketId: string | null;
    secretCardsSubmitted: boolean;
    raceAgain: boolean;
    connectionState: "connected" | "disconnected";
};

export type CurrentCardDisplay = {
    owner: string;
    name: string;
    fullName: string;
};

export type PublicGameState = {
    roomCode: string;
    hostPlayerId: string;
    hostSocketId: string;
    phase: string;
    raceNumber: number;
    shortenedBy: number;

    deckRemaining: number;
    publicRaceDeckDefinitionIds: string[];

    currentCard: RaceCard | null;
    currentCardDisplay: CurrentCardDisplay | null;

    currentSideBet: SideBetDefinition;
    availableTickets: AvailableTicket[];
    bettingDraft: BettingDraftState;

    players: PublicPlayerState[];
    racers: RacerState[];
    podium: PodiumEntry[];
    raceLog: string[];
};