import {
    BOARD,
    visibleStart,
    type RacerState
} from "@crazy-racing/shared";

import type {
    Room
} from "../gameLogic.js";

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
        Math.abs(
            effectiveValue
        );

    let actualSteps = 0;
    let collisionOccurred = false;

    for (
        let step = 0;
        step < numberOfSteps;
        step += 1
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

        /*
         * The finish line lies between positions
         * BOARD.finishPosition - 1 and
         * BOARD.finishPosition.
         *
         * Cards that cannot finish may only move as far
         * as the final track space.
         */
        if (
            !options.canFinish &&
            racer.position >=
            BOARD.finishPosition
        ) {
            racer.position =
                BOARD.finishPosition -
                1;

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
                options,
                true
            );

            if (
                collisionOccurred
            ) {
                recordRaceState(
                    room,
                    "COLLISION"
                );
            }

            finishRacer(
                room,
                racer
            );

            return;
        }

        if (
            options.canCollide
        ) {
            collisionOccurred =
                resolveCollisions(
                    room,
                    racer
                ) ||
                collisionOccurred;
        }

        if (
            racer.finished ||
            racer.dq
        ) {
            return;
        }
    }

    /*
 * First record the completed movement and its snapshot.
 * The client can now animate from startingPosition to
 * racer.position without seeing the destination early.
 */
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

    /*
     * Apply the collision visual state only after the
     * movement animation snapshot.
     */
    if (
        collisionOccurred
    ) {
        recordRaceState(
            room,
            "COLLISION"
        );
    }
}

/**
 * Green cards affect every active mascot.
 *
 * Their gameplay effect is simultaneous:
 *
 * - no collisions;
 * - no finishing;
 * - racers moving beyond the rear boundary are
 *   disqualified together and receive the same
 *   podium position.
 *
 * For presentation purposes, every mascot receives
 * its own RACER_MOVED event followed immediately by
 * its own RACE_STATE snapshot. This allows the client
 * to animate Lion, Hotdog, Fish and Queen separately.
 */
export function moveGreenRacersSimultaneously(
    room: Room,
    racers: RacerState[],
    value: number
): void {
    const disqualifications: Array<{
        racer: RacerState;
        reason: string;
        reasonCode:
        "back-out-of-bounds";
    }> = [];

    for (
        const racer
        of racers
    ) {
        if (
            racer.finished ||
            racer.dq ||
            value === 0
        ) {
            continue;
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
            Math.abs(
                effectiveValue
            );

        let actualSteps = 0;

        for (
            let step = 0;
            step < numberOfSteps;
            step += 1
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
                disqualifications.push({
                    racer,

                    reason:
                        "moved off the back of the track",

                    reasonCode:
                        "back-out-of-bounds"
                });

                break;
            }

            /*
             * Green cards cannot finish.
             * A mascot stops on the final track space.
             */
            if (
                racer.position >=
                BOARD.finishPosition
            ) {
                racer.position =
                    BOARD.finishPosition -
                    1;

                break;
            }
        }

        /*
         * Record the complete movement for this mascot.
         * The client divides fromPosition → toPosition
         * into individual visual steps.
         */
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

        /*
         * This snapshot must immediately follow the
         * corresponding RACER_MOVED event.
         *
         * Without it, only the final RACER_MOVED event
         * — Queen in the normal racer order — is paired
         * with the single final snapshot.
         */
        recordRaceState(
            room,
            "MOVE"
        );
    }

    /*
     * DQs are applied together after every mascot has
     * completed the shared green-card movement.
     */
    disqualifyRacersTogether(
        room,
        disqualifications
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
            (
                first,
                second
            ) =>
                racer.facing === 1
                    ? first -
                    second
                    : second -
                    first
        );

    const destination =
        stars.find(
            (
                starPosition
            ) =>
                racer.facing === 1
                    ? starPosition >
                    racer.position
                    : starPosition <
                    racer.position
        );

    if (
        destination ===
        undefined
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
    canCollide: boolean,
    recordState = true
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

    recordRaceEvent(
        room,
        {
            type:
                "RACER_SWERVED",

            racer:
                racer.name,

            fromLane,

            toLane:
                racer.lane,

            position:
                racer.position,

            direction:
                relativeDirection
        }
    );

    if (
        canCollide
    ) {
        resolveCollisions(
            room,
            racer
        );
    }

    if (
        recordState
    ) {
        recordRaceState(
            room,
            "SWERVE"
        );
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
    recordRaceEvent(
        room,
        {
            type:
                "RACER_MOVED",

            racer:
                racer.name,

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
        }
    );

    if (
        recordState
    ) {
        recordRaceState(
            room,
            "MOVE"
        );
    }
}