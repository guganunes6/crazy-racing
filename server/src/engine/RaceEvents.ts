import type {
    RaceEvent,
    RaceEventPayload
} from "@crazy-racing/shared";
import type { Room } from "../gameLogic.js";

export function recordRaceEvent(
    room: Room,
    payload: RaceEventPayload
): RaceEvent {
    const event: RaceEvent = {
        ...payload,
        sequence: room.nextRaceEventSequence,
        createdAt: Date.now()
    };

    room.nextRaceEventSequence += 1;
    room.raceEvents.push(event);

    const logMessage = formatRaceEvent(event);

    if (logMessage) {
        room.raceLog.push(logMessage);
    }

    return event;
}

export function recordRaceState(
    room: Room,
    source: Extract<
        RaceEventPayload,
        { type: "RACE_STATE" }
    >["source"]
): void {
    recordRaceEvent(room, {
        type: "RACE_STATE",
        source,
        racers: room.racers.map((racer) => ({
            name: racer.name,
            lane: racer.lane,
            position: racer.position,
            facing: racer.facing,
            fallen: racer.fallen,
            dq: racer.dq,
            finished: racer.finished
        }))
    });
}

function formatRaceEvent(
    event: RaceEvent
): string | null {
    switch (event.type) {
        case "CARD_DRAWN":
            return `CARD DRAWN - ${event.owner}: ${event.cardName}`;

        case "RACER_MOVED":
            if (event.crawling) {
                return (
                    `${event.racer} crawls from position ` +
                    `${event.fromPosition} to ${event.toPosition}.`
                );
            }

            if (event.moveToStar) {
                return (
                    `${event.racer} moves to the star at ` +
                    `position ${event.toPosition}.`
                );
            }

            return (
                `${event.racer} moves from position ` +
                `${event.fromPosition} to ${event.toPosition}.`
            );

        case "RACER_SWERVED":
            return (
                `${event.racer} swerves ${event.direction.toLowerCase()} ` +
                `from lane ${event.fromLane + 1} to lane ${event.toLane + 1}.`
            );

        case "RACER_FELL":
            return event.cause === "COLLISION" && event.causedBy
                ? `${event.racer} falls after being hit by ${event.causedBy}.`
                : `${event.racer} falls down.`;

        case "RACER_RECOVERED":
            return (
                `${event.racer} recovers and faces the finish line.`
            );

        case "RACER_TURNED":
            return event.facing === 1
                ? `${event.racer} turns and faces the finish line.`
                : `${event.racer} turns away from the finish line.`;

        case "COLLISION":
            return (
                `${event.movingRacer} collides with ` +
                `${event.affectedRacer} at position ${event.position}.`
            );

        case "RACER_DISQUALIFIED":
            return `${event.racer} is DQ: ${event.reason}.`;

        case "RACER_FINISHED":
            return `${event.racer} finishes in place ${event.place}.`;

        case "PODIUM_ASSIGNED":
            return (
                `${event.racer} is assigned to podium place ` +
                `${event.place}.`
            );

        case "DECK_RESHUFFLED":
            return (
                `The racing deck is reshuffled with ` +
                `${event.cardCount} cards. ${event.burnedCardCount} cards are discarded.`
            );

        case "TRACK_FOLDED":
            if (event.disqualifiedRacers.length === 0) {
                return `The racing field folds to level ${event.foldLevel}.`;
            }

            return (
                `The racing field folds to level ${event.foldLevel}. ` +
                `DQ: ${event.disqualifiedRacers.join(", ")}.`
            );

        case "RACE_ENDED":
            return "The race has ended.";

        case "RACE_STATE":
            return null;
    }
}