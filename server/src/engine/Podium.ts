import type { RacerState } from "@crazy-racing/shared";
import type { Room } from "../gameLogic.js";

export function finishRacer(
    room: Room,
    racer: RacerState
): void {
    if (racer.finished || racer.dq) {
        return;
    }

    racer.finished = true;

    const place = getHighestAvailablePlace(room);

    room.podium.push({
        place,
        racer: racer.name,
        status: "finished"
    });

    room.raceLog.push(
        `${racer.name} crosses the finish line and takes place ${place}.`
    );
}

export function disqualifyRacer(
    room: Room,
    racer: RacerState,
    reason: string
): void {
    disqualifyRacersTogether(room, [
        {
            racer,
            reason
        }
    ]);
}

export function disqualifyRacersTogether(
    room: Room,
    disqualifications: Array<{
        racer: RacerState;
        reason: string;
    }>
): void {
    const validDisqualifications = disqualifications.filter(
        ({ racer }) => !racer.finished && !racer.dq
    );

    if (validDisqualifications.length === 0) {
        return;
    }

    /*
     * Racers disqualified by the same event share the same
     * lowest available podium place.
     */
    const sharedPlace = getLowestAvailablePlace(room);

    for (const { racer, reason } of validDisqualifications) {
        racer.dq = true;

        room.podium.push({
            place: sharedPlace,
            racer: racer.name,
            status: "DQ",
            reason
        });

        room.raceLog.push(
            `${racer.name} is DQ and takes place ${sharedPlace}: ${reason}.`
        );
    }
}

export function checkRaceEnd(room: Room): boolean {
    const completedRacers = room.racers.filter(
        (racer) => racer.finished || racer.dq
    );

    if (completedRacers.length < 3) {
        return false;
    }

    const remainingRacers = room.racers.filter(
        (racer) => !racer.finished && !racer.dq
    );

    for (const racer of remainingRacers) {
        racer.finished = true;

        const place = getHighestAvailablePlace(room);

        room.podium.push({
            place,
            racer: racer.name,
            status: "remaining"
        });

        room.raceLog.push(
            `${racer.name} takes the final available place: ${place}.`
        );
    }

    room.phase = "payouts";
    return true;
}

export function getHighestAvailablePlace(room: Room): number {
    const occupiedPlaces = new Set(
        room.podium
            .map((entry) => entry.place)
            .filter((place): place is number => place !== undefined)
    );

    for (let place = 1; place <= 4; place++) {
        if (!occupiedPlaces.has(place)) {
            return place;
        }
    }

    return 4;
}

export function getLowestAvailablePlace(room: Room): number {
    const occupiedPlaces = new Set(
        room.podium
            .map((entry) => entry.place)
            .filter((place): place is number => place !== undefined)
    );

    for (let place = 4; place >= 1; place--) {
        if (!occupiedPlaces.has(place)) {
            return place;
        }
    }

    return 4;
}