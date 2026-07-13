import {
    BOARD,
    visibleStart,
    type RacerState
} from "@crazy-racing/shared";
import type { Room } from "../gameLogic.js";
import {
    resolveCollisions
} from "./Collision.js";
import {
    disqualifyRacer,
    disqualifyRacersTogether,
    finishRacer
} from "./Podium.js";
import {
    recordRaceEvent,
    recordRaceState
} from "./RaceEvents.js";

export type MovementOptions = {
    canCollide: boolean;
    canFinish: boolean;
};

export function moveRacer(
    room: Room,
    racer: RacerState,
    value: number,
    options: MovementOptions,
    moveToStar = false
): void {
    if (
        racer.finished ||
        racer.dq ||
        value === 0
    ) {
        return;
    }

    const startingPosition = racer.position;
    const crawling = racer.fallen;
    const effectiveValue = crawling
        ? Math.sign(value)
        : value;

    const movementDirection =
        effectiveValue >= 0
            ? racer.facing
            : racer.facing === 1
                ? -1
                : 1;

    const numberOfSteps = Math.abs(effectiveValue);
    let actualSteps = 0;

    for (
        let step = 0;
        step < numberOfSteps;
        step++
    ) {
        racer.position += movementDirection;
        actualSteps += 1;

        if (
            racer.position <
            visibleStart(room.shortenedBy)
        ) {
            disqualifyRacer(
                room,
                racer,
                "moved off the back of the track",
                "back-out-of-bounds"
            );

            return;
        }

        /*
         * The finish line lies between positions 12 and 13.
         * Green cards may move up to position 12, but cannot
         * cross into position 13.
         */
        if (
            !options.canFinish &&
            racer.position >= BOARD.finishPosition
        ) {
            racer.position = BOARD.finishPosition - 1;
            break;
        }

        if (
            options.canFinish &&
            racer.position >= BOARD.finishPosition
        ) {
            recordMovement(
                room,
                racer,
                startingPosition,
                value,
                actualSteps,
                crawling,
                moveToStar,
                options,
                true
            );

            finishRacer(room, racer);
            return;
        }

        if (options.canCollide) {
            resolveCollisions(room, racer);
        }

        if (
            racer.finished ||
            racer.dq
        ) {
            return;
        }
    }

    recordMovement(
        room,
        racer,
        startingPosition,
        value,
        actualSteps,
        crawling,
        moveToStar,
        options,
        true
    );
}

/**
 * Green cards affect every active mascot simultaneously.
 * They cannot collide or finish, but can still send racers
 * off the back of the track. Racers DQed by the same green
 * card movement therefore share a podium place.
 */
export function moveGreenRacersSimultaneously(
    room: Room,
    racers: RacerState[],
    value: number
): void {
    const disqualifications: Array<{
        racer: RacerState;
        reason: string;
        reasonCode: "back-out-of-bounds";
    }> = [];

    for (const racer of racers) {
        if (
            racer.finished ||
            racer.dq ||
            value === 0
        ) {
            continue;
        }

        const startingPosition = racer.position;
        const crawling = racer.fallen;
        const effectiveValue = crawling
            ? Math.sign(value)
            : value;

        const movementDirection =
            effectiveValue >= 0
                ? racer.facing
                : racer.facing === 1
                    ? -1
                    : 1;

        const numberOfSteps = Math.abs(effectiveValue);
        let actualSteps = 0;

        for (
            let step = 0;
            step < numberOfSteps;
            step++
        ) {
            racer.position += movementDirection;
            actualSteps += 1;

            if (
                racer.position <
                visibleStart(room.shortenedBy)
            ) {
                disqualifications.push({
                    racer,
                    reason: "moved off the back of the track",
                    reasonCode: "back-out-of-bounds"
                });
                break;
            }

            if (
                racer.position >=
                BOARD.finishPosition
            ) {
                racer.position = BOARD.finishPosition - 1;
                break;
            }
        }

        recordMovement(
            room,
            racer,
            startingPosition,
            value,
            actualSteps,
            crawling,
            false,
            {
                canCollide: false,
                canFinish: false
            },
            false
        );
    }

    disqualifyRacersTogether(
        room,
        disqualifications
    );

    recordRaceState(room, "MOVE");
}

export function moveRacerToNextStar(
    room: Room,
    racer: RacerState,
    options: MovementOptions
): void {
    if (
        racer.finished ||
        racer.dq
    ) {
        return;
    }

    const stars = [...BOARD.stars].sort(
        (first, second) =>
            racer.facing === 1
                ? first - second
                : second - first
    );

    const destination = stars.find(
        (starPosition) =>
            racer.facing === 1
                ? starPosition > racer.position
                : starPosition < racer.position
    );

    if (destination === undefined) {
        return;
    }

    const distance = Math.abs(
        destination - racer.position
    );

    moveRacer(
        room,
        racer,
        distance,
        options,
        true
    );
}

export function swerveRacer(
    room: Room,
    racer: RacerState,
    relativeDirection: "LEFT" | "RIGHT",
    canCollide: boolean,
    recordState = true
): void {
    if (
        racer.finished ||
        racer.dq
    ) {
        return;
    }

    const fromLane = racer.lane;
    const baseLaneDelta =
        relativeDirection === "LEFT"
            ? -1
            : 1;

    const actualLaneDelta =
        baseLaneDelta * racer.facing;

    racer.lane += actualLaneDelta;

    if (
        racer.lane < 0 ||
        racer.lane >= BOARD.laneCount
    ) {
        disqualifyRacer(
            room,
            racer,
            "swerved off the side of the track",
            "side-out-of-bounds"
        );

        return;
    }

    recordRaceEvent(room, {
        type: "RACER_SWERVED",
        racer: racer.name,
        fromLane,
        toLane: racer.lane,
        position: racer.position,
        direction: relativeDirection
    });

    if (canCollide) {
        resolveCollisions(room, racer);
    }

    if (recordState) {
        recordRaceState(room, "SWERVE");
    }
}

function recordMovement(
    room: Room,
    racer: RacerState,
    startingPosition: number,
    requestedDistance: number,
    actualSteps: number,
    crawling: boolean,
    moveToStar: boolean,
    options: MovementOptions,
    recordState: boolean
): void {
    recordRaceEvent(room, {
        type: "RACER_MOVED",
        racer: racer.name,
        fromPosition: startingPosition,
        toPosition: racer.position,
        lane: racer.lane,
        requestedDistance,
        actualDistance: actualSteps,
        facing: racer.facing,
        crawling,
        moveToStar,
        collisionsEnabled: options.canCollide,
        finishingEnabled: options.canFinish
    });

    if (recordState) {
        recordRaceState(room, "MOVE");
    }
}
