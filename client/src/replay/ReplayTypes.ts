import type {
    RaceEvent,
    RacerName,
    RacerState
} from "@crazy-racing/shared";

export type ReplaySpeed =
    | 0.5
    | 1
    | 2
    | 4;

export type ReplayCardOwner =
    | RacerName
    | "GREEN"
    | null;

export type ReplayFrame = {
    id: string;

    sequence: number;
    racers: RacerState[];

    trigger: RaceEvent | null;
    cardOwner: ReplayCardOwner;

    shortenedBy: number;
    logEntries: string[];
};

export type ReplayCardGroup = {
    id: string;
    cardEvent: Extract<
        RaceEvent,
        { type: "CARD_DRAWN" }
    > | null;

    frames: ReplayFrame[];
};

export type RaceReplayModel = {
    initialFrame: ReplayFrame;
    cardGroups: ReplayCardGroup[];
    allLogEntries: string[];
};