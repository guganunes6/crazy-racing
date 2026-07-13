import {
    BOARD,
    type RaceEvent,
    type RacerName,
    type SideBetId
} from "@crazy-racing/shared";
import type { Room } from "../gameLogic.js";

type RaceStateEvent = Extract<
    RaceEvent,
    { type: "RACE_STATE" }
>;

export function evaluateSideBet(
    room: Room,
    sideBetId: SideBetId
): boolean {
    switch (sideBetId) {
        case "LION_BOTTOM_2":
            return finishedInBottomTwo(room, "LION");

        case "HOTDOG_BOTTOM_2":
            return finishedInBottomTwo(room, "HOTDOG");

        case "FISH_BOTTOM_2":
            return finishedInBottomTwo(room, "FISH");

        case "QUEEN_BOTTOM_2":
            return finishedInBottomTwo(room, "QUEEN");

        case "OUT_OF_BOUNDS_DQ":
            return hasOutOfBoundsDisqualification(room);

        case "TWO_FALLEN_AT_SAME_TIME":
            return hadTwoFallenRacers(room);

        case "KNOCKOUT_DQ":
            return hadKnockoutDisqualification(room);

        case "TWO_AT_FINISH_LINE_SPACE":
            return hadTwoAtFinishLineSpace(room);

        case "CRAWL_IN_FINAL_STRETCH":
            return hadCrawlInFinalStretch(room);

        case "TWO_STOPPED_SAME_SPACE":
            return hadTwoStoppedOnSameSpace(room);

        case "FINAL_STRETCH_EMPTY_WHEN_FIRST_WINS":
            return wasFinalStretchEmptyWhenFirstPlaceWon(room);

        case "AT_LEAST_ONE_DQ":
            return hadAtLeastOneDisqualification(room);
    }
}

function finishedInBottomTwo(
    room: Room,
    racer: RacerName
): boolean {
    const podiumEntry = room.podium.find(
        (entry) => entry.racer === racer
    );

    if (!podiumEntry?.place) {
        return false;
    }

    return podiumEntry.place >= 3;
}

function hasOutOfBoundsDisqualification(
    room: Room
): boolean {
    return room.raceEvents.some(
        (event) =>
            event.type === "RACER_DISQUALIFIED" &&
            (
                event.reasonCode === "back-out-of-bounds" ||
                event.reasonCode === "side-out-of-bounds"
            )
    );
}

function hadTwoFallenRacers(
    room: Room
): boolean {
    return getRaceStateEvents(room).some(
        (event) => {
            const fallenActiveRacers = event.racers.filter(
                (racer) =>
                    racer.fallen &&
                    !racer.dq &&
                    !racer.finished
            );

            return fallenActiveRacers.length >= 2;
        }
    );
}

function hadKnockoutDisqualification(
    room: Room
): boolean {
    return room.raceEvents.some(
        (event) =>
            event.type === "RACER_DISQUALIFIED" &&
            event.reasonCode === "knockout"
    );
}

function hadTwoAtFinishLineSpace(
    room: Room
): boolean {
    /*
     * The finish-line space is the final regular position
     * immediately before the finish line.
     */
    const finishLineSpace =
        BOARD.finishPosition - 1;

    return getRaceStateEvents(room).some(
        (event) => {
            const racersAtFinishLineSpace =
                event.racers.filter(
                    (racer) =>
                        !racer.dq &&
                        !racer.finished &&
                        racer.position === finishLineSpace
                );

            return racersAtFinishLineSpace.length >= 2;
        }
    );
}

function hadCrawlInFinalStretch(
    room: Room
): boolean {
    const finalStretchStart =
        BOARD.foldLines[
        BOARD.foldLines.length - 1
        ];

    return room.raceEvents.some(
        (event) => {
            if (
                event.type !== "RACER_MOVED" ||
                !event.crawling
            ) {
                return false;
            }

            /*
             * Counts crawling into, within, or out of the
             * final-stretch area.
             */
            return (
                event.fromPosition >= finalStretchStart ||
                event.toPosition >= finalStretchStart
            );
        }
    );
}

function hadTwoStoppedOnSameSpace(
    room: Room
): boolean {
    return getRaceStateEvents(room).some(
        (event) => {
            const activeRacers = event.racers.filter(
                (racer) =>
                    !racer.dq &&
                    !racer.finished
            );

            for (
                let firstIndex = 0;
                firstIndex < activeRacers.length;
                firstIndex++
            ) {
                for (
                    let secondIndex = firstIndex + 1;
                    secondIndex < activeRacers.length;
                    secondIndex++
                ) {
                    const first = activeRacers[firstIndex];
                    const second = activeRacers[secondIndex];

                    if (
                        first.lane === second.lane &&
                        first.position === second.position
                    ) {
                        return true;
                    }
                }
            }

            return false;
        }
    );
}

function wasFinalStretchEmptyWhenFirstPlaceWon(
    room: Room
): boolean {
    const firstPlaceEvent = room.raceEvents.find(
        (event) =>
            event.type === "RACER_FINISHED" &&
            event.place === 1
    );

    if (!firstPlaceEvent) {
        return false;
    }

    const stateAfterFirstPlace = room.raceEvents.find(
        (event): event is RaceStateEvent =>
            event.type === "RACE_STATE" &&
            event.sequence > firstPlaceEvent.sequence &&
            event.source === "FINISH"
    );

    if (!stateAfterFirstPlace) {
        return false;
    }

    const finalStretchStart =
        BOARD.foldLines[
        BOARD.foldLines.length - 1
        ];

    const otherRacerInFinalStretch =
        stateAfterFirstPlace.racers.some(
            (racer) =>
                !racer.finished &&
                !racer.dq &&
                racer.position >= finalStretchStart &&
                racer.position < BOARD.finishPosition
        );

    return !otherRacerInFinalStretch;
}

function hadAtLeastOneDisqualification(
    room: Room
): boolean {
    return room.raceEvents.some(
        (event) =>
            event.type === "RACER_DISQUALIFIED"
    );
}

function getRaceStateEvents(
    room: Room
): RaceStateEvent[] {
    return room.raceEvents.filter(
        (event): event is RaceStateEvent =>
            event.type === "RACE_STATE"
    );
}