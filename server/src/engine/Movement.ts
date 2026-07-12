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

    const startingPosition =
        racer.position;

    const crawling =
        racer.fallen;

    const effectiveValue =
        crawling
            ? Math.sign(value)
            : value;

    const movementDirection =
        effectiveValue >= 0
            ? racer.facing
            : racer.facing === 1
                ? -1
                : 1;

    const numberOfSteps =
        Math.abs(effectiveValue);

    let actualSteps = 0;

    for (
        let step = 0;
        step < numberOfSteps;
        step++
    ) {
        racer.position +=
            movementDirection;

        actualSteps += 1;

        if (
            racer.position <
            visibleStart(
                room.shortenedBy
            )
        ) {
            disqualifyRacer(
                room,
                racer,
                "moved off the back of the track",
                "back-out-of-bounds"
            );

            return;
        }

        if (
            !options.canFinish &&
            racer.position >=
            BOARD.finishPosition
        ) {
            racer.position =
                BOARD.finishPosition;

            break;
        }

        if (
            options.canFinish &&
            racer.position >=
            BOARD.finishPosition
        ) {
            recordMovement(
                room,
                racer,
                startingPosition,
                value,
                actualSteps,
                crawling,
                moveToStar,
                options
            );

            finishRacer(
                room,
                racer
            );

            return;
        }

        if (options.canCollide) {
            resolveCollisions(
                room,
                racer
            );
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
        options
    );
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

    const stars =
        [...BOARD.stars].sort(
            (first, second) =>
                racer.facing === 1
                    ? first - second
                    : second - first
        );

    const destination =
        stars.find(
            (starPosition) =>
                racer.facing === 1
                    ? starPosition >
                    racer.position
                    : starPosition <
                    racer.position
        );

    if (
        destination === undefined
    ) {
        return;
    }

    const distance =
        Math.abs(
            destination -
            racer.position
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
    relativeDirection:
        | "LEFT"
        | "RIGHT",
    canCollide: boolean
): void {
    if (
        racer.finished ||
        racer.dq
    ) {
        return;
    }

    const fromLane =
        racer.lane;

    const baseLaneDelta =
        relativeDirection ===
            "LEFT"
            ? -1
            : 1;

    const actualLaneDelta =
        baseLaneDelta *
        racer.facing;

    racer.lane +=
        actualLaneDelta;

    if (
        racer.lane < 0 ||
        racer.lane >=
        BOARD.laneCount
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
        direction:
            relativeDirection
    });

    if (canCollide) {
        resolveCollisions(
            room,
            racer
        );
    }

    recordRaceState(
        room,
        "SWERVE"
    );
}

function recordMovement(
    room: Room,
    racer: RacerState,
    startingPosition: number,
    requestedDistance: number,
    actualSteps: number,
    crawling: boolean,
    moveToStar: boolean,
    options: MovementOptions
): void {
    recordRaceEvent(room, {
        type: "RACER_MOVED",
        racer: racer.name,
        fromPosition:
            startingPosition,
        toPosition:
            racer.position,
        lane:
            racer.lane,
        requestedDistance,
        actualDistance:
            actualSteps,
        facing:
            racer.facing,
        crawling,
        moveToStar,
        collisionsEnabled:
            options.canCollide,
        finishingEnabled:
            options.canFinish
    });

    recordRaceState(
        room,
        "MOVE"
    );
}