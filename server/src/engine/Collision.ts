import type {
    RacerState
} from "@crazy-racing/shared";

import type {
    Room
} from "../gameLogic.js";

import {
    disqualifyRacersTogether
} from "./Podium.js";

import {
    recordRaceEvent
} from "./RaceEvents.js";

/**
 * Resolves every collision caused by the moving mascot.
 *
 * Returns true when at least one collision occurred.
 *
 * This function deliberately does not record a RACE_STATE.
 * Movement.ts records the movement snapshot first and the
 * collision snapshot afterwards. This prevents the client
 * from seeing the moving mascot at its destination before
 * its step-by-step movement animation begins.
 */
export function resolveCollisions(
    room: Room,
    movingRacer: RacerState
): boolean {
    if (
        movingRacer.finished ||
        movingRacer.dq
    ) {
        return false;
    }

    const affectedRacers =
        room.racers.filter(
            (otherRacer) =>
                otherRacer.name !==
                movingRacer.name &&
                !otherRacer.finished &&
                !otherRacer.dq &&
                otherRacer.lane ===
                movingRacer.lane &&
                otherRacer.position ===
                movingRacer.position
        );

    if (
        affectedRacers.length === 0
    ) {
        return false;
    }

    const knockedOutRacers: Array<{
        racer: RacerState;
        reason: string;
        reasonCode: "knockout";
    }> = [];

    for (
        const affectedRacer
        of affectedRacers
    ) {
        recordRaceEvent(room, {
            type: "COLLISION",

            movingRacer:
                movingRacer.name,

            affectedRacer:
                affectedRacer.name,

            lane:
                movingRacer.lane,

            position:
                movingRacer.position,

            affectedRacerWasFallen:
                affectedRacer.fallen
        });

        if (
            affectedRacer.fallen
        ) {
            knockedOutRacers.push({
                racer:
                    affectedRacer,

                reason:
                    `collided with ${movingRacer.name} while already fallen`,

                reasonCode:
                    "knockout"
            });

            continue;
        }

        affectedRacer.fallen =
            true;

        recordRaceEvent(room, {
            type:
                "RACER_FELL",

            racer:
                affectedRacer.name,

            cause:
                "COLLISION",

            causedBy:
                movingRacer.name
        });
    }

    disqualifyRacersTogether(
        room,
        knockedOutRacers
    );

    return true;
}