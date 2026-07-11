import type { RacerState } from "@crazy-racing/shared";
import type { Room } from "../gameLogic.js";
import {
    disqualifyRacersTogether
} from "./Podium.js";

export function resolveCollisions(
    room: Room,
    movingRacer: RacerState
): void {
    if (movingRacer.finished || movingRacer.dq) {
        return;
    }

    const stationaryRacers = room.racers.filter(
        (otherRacer) =>
            otherRacer.name !== movingRacer.name &&
            !otherRacer.finished &&
            !otherRacer.dq &&
            otherRacer.lane === movingRacer.lane &&
            otherRacer.position === movingRacer.position
    );

    if (stationaryRacers.length === 0) {
        return;
    }

    const knockedOutRacers: Array<{
        racer: RacerState;
        reason: string;
    }> = [];

    for (const stationaryRacer of stationaryRacers) {
        if (stationaryRacer.fallen) {
            knockedOutRacers.push({
                racer: stationaryRacer,
                reason: `collided with ${movingRacer.name} while already fallen`
            });

            continue;
        }

        stationaryRacer.fallen = true;

        room.raceLog.push(
            `${movingRacer.name} collides with ${stationaryRacer.name}. ` +
            `${stationaryRacer.name} falls down.`
        );
    }

    /*
     * If several already-fallen racers are hit in the same space,
     * they are DQed by the same collision event and share a place.
     */
    disqualifyRacersTogether(room, knockedOutRacers);
}