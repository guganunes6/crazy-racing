import type {
    DisqualificationReason,
    RacerState
} from "@crazy-racing/shared";
import type { Room } from "../gameLogic.js";
import {
    recordRaceEvent,
    recordRaceState
} from "./RaceEvents.js";

export function finishRacer(
    room: Room,
    racer: RacerState
): void {
    if (
        racer.finished ||
        racer.dq
    ) {
        return;
    }

    racer.finished = true;

    const place =
        getHighestAvailablePlace(
            room
        );

    room.podium.push({
        place,
        racer: racer.name,
        status: "finished"
    });

    recordRaceEvent(room, {
        type: "RACER_FINISHED",
        racer: racer.name,
        place
    });

    recordRaceEvent(room, {
        type: "PODIUM_ASSIGNED",
        racer: racer.name,
        place,
        status: "finished",
        sharedPlace: false
    });

    recordRaceState(
        room,
        "FINISH"
    );
}

export function disqualifyRacer(
    room: Room,
    racer: RacerState,
    reason: string,
    reasonCode:
        DisqualificationReason =
        "other"
): void {
    disqualifyRacersTogether(
        room,
        [
            {
                racer,
                reason,
                reasonCode
            }
        ]
    );
}

export function disqualifyRacersTogether(
    room: Room,
    disqualifications: Array<{
        racer: RacerState;
        reason: string;
        reasonCode:
        DisqualificationReason;
    }>
): void {
    const valid =
        disqualifications.filter(
            ({ racer }) =>
                !racer.finished &&
                !racer.dq
        );

    if (valid.length === 0) {
        return;
    }

    const sharedPlace =
        getLowestAvailablePlace(
            room
        );

    const isShared =
        valid.length > 1;

    for (
        const {
            racer,
            reason,
            reasonCode
        } of valid
    ) {
        racer.dq = true;

        room.podium.push({
            place:
                sharedPlace,
            racer:
                racer.name,
            status: "DQ",
            reason
        });

        recordRaceEvent(room, {
            type:
                "RACER_DISQUALIFIED",
            racer:
                racer.name,
            reason,
            reasonCode
        });

        recordRaceEvent(room, {
            type:
                "PODIUM_ASSIGNED",
            racer:
                racer.name,
            place:
                sharedPlace,
            status:
                "DQ",
            sharedPlace:
                isShared
        });
    }

    recordRaceState(
        room,
        "DQ"
    );
}

export function checkRaceEnd(
    room: Room
): boolean {
    const completed =
        room.racers.filter(
            (racer) =>
                racer.finished ||
                racer.dq
        );

    if (
        completed.length < 3
    ) {
        return false;
    }

    const remaining =
        room.racers.filter(
            (racer) =>
                !racer.finished &&
                !racer.dq
        );

    for (const racer of remaining) {
        racer.finished = true;

        const place =
            getHighestAvailablePlace(
                room
            );

        room.podium.push({
            place,
            racer:
                racer.name,
            status:
                "remaining"
        });

        recordRaceEvent(room, {
            type:
                "PODIUM_ASSIGNED",
            racer:
                racer.name,
            place,
            status:
                "remaining",
            sharedPlace:
                false
        });
    }

    room.phase = "payouts";

    recordRaceEvent(room, {
        type: "RACE_ENDED",
        podium:
            room.podium.map(
                (entry) => ({
                    racer:
                        entry.racer,
                    place:
                        entry.place ?? 4,
                    status:
                        entry.status
                })
            )
    });

    return true;
}

export function getHighestAvailablePlace(
    room: Room
): number {
    const occupied =
        new Set(
            room.podium
                .map(
                    (entry) =>
                        entry.place
                )
                .filter(
                    (
                        place
                    ): place is number =>
                        place !== undefined
                )
        );

    for (
        let place = 1;
        place <= 4;
        place++
    ) {
        if (
            !occupied.has(place)
        ) {
            return place;
        }
    }

    return 4;
}

export function getLowestAvailablePlace(
    room: Room
): number {
    const occupied =
        new Set(
            room.podium
                .map(
                    (entry) =>
                        entry.place
                )
                .filter(
                    (
                        place
                    ): place is number =>
                        place !== undefined
                )
        );

    for (
        let place = 4;
        place >= 1;
        place--
    ) {
        if (
            !occupied.has(place)
        ) {
            return place;
        }
    }

    return 4;
}