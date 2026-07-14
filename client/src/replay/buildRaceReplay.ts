import type {
    CompletedRaceReplay,
    RaceEvent,
    RacerState
} from "@crazy-racing/shared";

import type {
    RaceReplayModel,
    ReplayCardGroup,
    ReplayCardOwner,
    ReplayFrame
} from "./ReplayTypes";

type RaceStateEvent = Extract<
    RaceEvent,
    { type: "RACE_STATE" }
>;

type CardDrawnEvent = Extract<
    RaceEvent,
    { type: "CARD_DRAWN" }
>;

export function buildRaceReplay(
    replay: CompletedRaceReplay
): RaceReplayModel {
    const sortedEvents = [
        ...replay.events
    ].sort(
        (first, second) =>
            first.sequence - second.sequence
    );

    const initialFrame: ReplayFrame = {
        id: `race-${replay.raceNumber}-initial`,
        sequence: 0,

        racers: cloneRacers(
            replay.initialRacers
        ),

        trigger: null,
        cardOwner: null,

        shortenedBy: 0,
        logEntries: []
    };

    const cardGroups: ReplayCardGroup[] = [];

    let currentGroup:
        ReplayCardGroup | null = null;

    let currentCardOwner:
        ReplayCardOwner = null;

    let shortenedBy = 0;
    let pendingLogEntries: string[] = [];

    for (const event of sortedEvents) {
        if (event.type === "CARD_DRAWN") {
            currentCardOwner =
                event.owner;

            currentGroup = {
                id:
                    `race-${replay.raceNumber}-card-` +
                    `${event.sequence}`,

                cardEvent: event,
                frames: []
            };

            cardGroups.push(
                currentGroup
            );

            pendingLogEntries = [
                formatReplayEvent(event)
            ].filter(
                (entry): entry is string =>
                    Boolean(entry)
            );

            continue;
        }

        if (event.type === "TRACK_FOLDED") {
            shortenedBy =
                event.foldLevel;
        }

        if (event.type !== "RACE_STATE") {
            const formatted =
                formatReplayEvent(event);

            if (formatted) {
                pendingLogEntries.push(
                    formatted
                );
            }

            continue;
        }

        const trigger =
            findTriggerEvent(
                sortedEvents,
                event.sequence
            );

        const frame =
            createFrame(
                replay.raceNumber,
                event,
                trigger,
                currentCardOwner,
                shortenedBy,
                pendingLogEntries
            );

        pendingLogEntries = [];

        if (!currentGroup) {
            currentGroup = {
                id:
                    `race-${replay.raceNumber}-` +
                    `opening`,

                cardEvent: null,
                frames: []
            };

            cardGroups.push(
                currentGroup
            );
        }

        currentGroup.frames.push(
            frame
        );
    }

    const groupsWithFrames =
        cardGroups.filter(
            (group) =>
                group.frames.length > 0
        );

    return {
        initialFrame,
        cardGroups: groupsWithFrames,

        allLogEntries:
            sortedEvents
                .map(formatReplayEvent)
                .filter(
                    (
                        entry
                    ): entry is string =>
                        Boolean(entry)
                )
    };
}

function createFrame(
    raceNumber: number,
    stateEvent: RaceStateEvent,
    trigger: RaceEvent | null,
    cardOwner: ReplayCardOwner,
    shortenedBy: number,
    logEntries: string[]
): ReplayFrame {
    return {
        id:
            `race-${raceNumber}-frame-` +
            `${stateEvent.sequence}`,

        sequence:
            stateEvent.sequence,

        racers:
            cloneRacers(
                stateEvent.racers
            ),

        trigger,
        cardOwner,

        shortenedBy,
        logEntries: [
            ...logEntries
        ]
    };
}

function findTriggerEvent(
    events: RaceEvent[],
    snapshotSequence: number
): RaceEvent | null {
    for (
        let index =
            events.length - 1;
        index >= 0;
        index -= 1
    ) {
        const event =
            events[index];

        if (
            event.sequence <
            snapshotSequence &&
            event.type !==
            "RACE_STATE"
        ) {
            return event;
        }
    }

    return null;
}

function cloneRacers(
    racers: RacerState[]
): RacerState[] {
    return racers.map(
        (racer) => ({
            ...racer
        })
    );
}

export function formatReplayEvent(
    event: RaceEvent
): string | null {
    switch (event.type) {
        case "CARD_DRAWN":
            return (
                `CARD DRAWN - ${event.owner}: ` +
                `${event.cardName}`
            );

        case "RACER_MOVED":
            if (event.crawling) {
                return (
                    `${event.racer} crawls from ` +
                    `${event.fromPosition} to ` +
                    `${event.toPosition}.`
                );
            }

            if (event.moveToStar) {
                return (
                    `${event.racer} moves to the ` +
                    `star at position ` +
                    `${event.toPosition}.`
                );
            }

            return (
                `${event.racer} moves from ` +
                `${event.fromPosition} to ` +
                `${event.toPosition}.`
            );

        case "RACER_SWERVED":
            return (
                `${event.racer} swerves ` +
                `${event.direction.toLowerCase()}.`
            );

        case "RACER_FELL":
            return event.causedBy
                ? (
                    `${event.racer} falls after ` +
                    `being hit by ` +
                    `${event.causedBy}.`
                )
                : `${event.racer} falls down.`;

        case "RACER_RECOVERED":
            return (
                `${event.racer} recovers and ` +
                `faces the finish line.`
            );

        case "RACER_TURNED":
            return event.facing === 1
                ? (
                    `${event.racer} turns and ` +
                    `faces the finish line.`
                )
                : (
                    `${event.racer} turns away ` +
                    `from the finish line.`
                );

        case "COLLISION":
            return (
                `${event.movingRacer} collides ` +
                `with ${event.affectedRacer}.`
            );

        case "RACER_DISQUALIFIED":
            return (
                `${event.racer} is DQ: ` +
                `${event.reason}.`
            );

        case "RACER_FINISHED":
            return (
                `${event.racer} finishes in ` +
                `place ${event.place}.`
            );

        case "PODIUM_ASSIGNED":
            return null;

        case "DECK_RESHUFFLED":
            return (
                `The racing deck is ` +
                `reshuffled.`
            );

        case "TRACK_FOLDED":
            return (
                `The racing field folds to ` +
                `level ${event.foldLevel}.`
            );

        case "RACE_ENDED":
            return "The race has ended.";

        case "RACE_STATE":
            return null;
    }
}