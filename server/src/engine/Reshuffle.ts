import {
    BOARD,
    visibleStart
} from "@crazy-racing/shared";
import type { Room } from "../gameLogic.js";
import { rebuildDeckFromDiscard } from "./Deck.js";
import {
    checkRaceEnd,
    disqualifyRacersTogether
} from "./Podium.js";

export function reshuffleAndFold(room: Room): void {
    room.raceLog.push(
        "The racing deck is empty. Reshuffling."
    );

    /*
     * Order required by the rules:
     * 1. Shuffle the discard pile.
     * 2. Burn three cards.
     * 3. Fold the track.
     * 4. DQ racers behind the new fold line.
     */
    rebuildDeckFromDiscard(room);

    room.shortenedBy = Math.min(
        room.shortenedBy + 1,
        BOARD.foldLines.length
    );

    const newTrackStart = visibleStart(room.shortenedBy);

    room.raceLog.push(
        `The track folds to level ${room.shortenedBy}.`
    );

    const racersUnderFold = room.racers
        .filter(
            (racer) =>
                !racer.finished &&
                !racer.dq &&
                racer.position < newTrackStart
        )
        .map((racer) => ({
            racer,
            reason: "was underneath the folded section of the track"
        }));

    /*
     * All racers caught by the same fold are disqualified
     * simultaneously and therefore share a podium place.
     */
    disqualifyRacersTogether(room, racersUnderFold);

    checkRaceEnd(room);
}