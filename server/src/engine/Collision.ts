import type {
    RacerState
} from "@crazy-racing/shared";
import type { Room } from "../gameLogic.js";
import {
    disqualifyRacersTogether
} from "./Podium.js";
import {
    recordRaceEvent,
    recordRaceState
} from "./RaceEvents.js";

export function resolveCollisions(
    room: Room,
    movingRacer: RacerState
): void {
    if (
        movingRacer.finished ||
        movingRacer.dq
    ) {
        return;
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

        if (affectedRacer.fallen) {
            knockedOutRacers.push({
                racer: affectedRacer,
                reason:
                    `collided with ${movingRacer.name} while already fallen`,
                reasonCode: "knockout"
            });

            continue;
        }

        affectedRacer.fallen = true;

        recordRaceEvent(room, {
            type: "RACER_FELL",
            racer:
                affectedRacer.name,
            cause: "COLLISION",
            causedBy:
                movingRacer.name
        });
    }

    disqualifyRacersTogether(
        room,
        knockedOutRacers
    );

    if (affectedRacers.length > 0) {
        recordRaceState(
            room,
            "COLLISION"
        );
    }
}