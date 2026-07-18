import type { RacerName } from "../racers/Racers.js";

export type DisqualificationReason =
    | "back-out-of-bounds"
    | "side-out-of-bounds"
    | "knockout"
    | "fold"
    | "other";

export type RaceEventPayload =
    | {
        type: "CARD_DRAWN";
        cardId: string;
        definitionId: string;
        owner: RacerName | "GREEN";
        cardName: string;
    }
    | {
        type: "RACER_MOVED";
        racer: RacerName;
        fromPosition: number;
        toPosition: number;
        lane: number;
        requestedDistance: number;
        actualDistance: number;
        facing: 1 | -1;
        crawling: boolean;
        moveToStar: boolean;
        collisionsEnabled: boolean;
        finishingEnabled: boolean;
    }
    | {
        type: "RACER_SWERVED";
        racer: RacerName;
        fromLane: number;
        toLane: number;
        position: number;
        direction: "LEFT" | "RIGHT";
    }
    | {
        type: "RACER_FELL";
        racer: RacerName;
        cause: "CARD" | "COLLISION";
        causedBy?: RacerName;
    }
    | {
        type: "RACER_RECOVERED";
        racer: RacerName;
    }
    | {
        type: "RACER_TURNED";
        racer: RacerName;
        facing: 1 | -1;
    }
    | {
        type: "COLLISION";
        movingRacer: RacerName;
        affectedRacer: RacerName;
        lane: number;
        position: number;
        affectedRacerWasFallen: boolean;
    }
    | {
        type: "RACER_DISQUALIFIED";
        racer: RacerName;
        reason: string;
        reasonCode: DisqualificationReason;
    }
    | {
        type: "RACER_FINISHED";
        racer: RacerName;
        place: number;
    }
    | {
        type: "PODIUM_ASSIGNED";
        racer: RacerName;
        place: number;
        status: "finished" | "DQ" | "remaining";
        sharedPlace: boolean;
    }
    | {
        type: "DECK_RESHUFFLED";
        cardCount: number;
        burnedCardCount: number;
    }
    | {
        type: "CARDS_BURNED";

        reason:
        | "RACE_START"
        | "RESHUFFLE";

        cards: Array<{
            id: string;
            definitionId: string;
        }>;
    }
    | {
        type: "TRACK_FOLDED";
        foldLevel: number;
        newStartPosition: number;
        disqualifiedRacers: RacerName[];
    }
    | {
        type: "RACE_STATE";
        source:
        | "CARD"
        | "MOVE"
        | "SWERVE"
        | "COLLISION"
        | "FALL"
        | "RECOVER"
        | "TURN"
        | "FOLD"
        | "FINISH"
        | "DQ";
        racers: Array<{
            name: RacerName;
            lane: number;
            position: number;
            facing: 1 | -1;
            fallen: boolean;
            dq: boolean;
            finished: boolean;
        }>;
    }
    | {
        type: "RACE_ENDED";
        podium: Array<{
            racer: RacerName;
            place: number;
            status: "finished" | "DQ" | "remaining";
        }>;
    };

export type RaceEvent = RaceEventPayload & {
    sequence: number;
    createdAt: number;
};