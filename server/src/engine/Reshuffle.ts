import {
    BOARD,
    visibleStart
} from "@crazy-racing/shared";
import type { Room } from "../gameLogic.js";
import {
    rebuildDeckFromDiscard
} from "./Deck.js";
import {
    checkRaceEnd,
    disqualifyRacersTogether
} from "./Podium.js";

export function reshuffleRaceDeck(
    room: Room
): void {
    if (room.phase !== "reshuffle-required") {
        throw new Error(
            "The racing deck does not need reshuffling."
        );
    }

    room.raceLog.push(
        "The racing deck is reshuffled."
    );

    rebuildDeckFromDiscard(room);

    if (
        room.shortenedBy <
        BOARD.foldLines.length
    ) {
        room.shortenedBy += 1;

        const newTrackStart = visibleStart(
            room.shortenedBy
        );

        room.raceLog.push(
            `The racing field folds to level ${room.shortenedBy}.`
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
                reason:
                    "was underneath the folded section of the track"
            }));

        disqualifyRacersTogether(
            room,
            racersUnderFold
        );
    }

    if (!checkRaceEnd(room)) {
        room.phase = "racing";
    }
}