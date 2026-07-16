import {
    BOARD,
    visibleStart
} from "@crazy-racing/shared";

import type {
    Room
} from "../gameLogic.js";

import {
    rebuildDeckFromDiscard
} from "./Deck.js";

import {
    checkRaceEnd,
    disqualifyRacersTogether
} from "./Podium.js";

import {
    recordRaceEvent,
    recordRaceState
} from "./RaceEvents.js";

export function reshuffleRaceDeck(
    room: Room
): void {
    if (
        room.phase !==
        "reshuffle-required"
    ) {
        throw new Error(
            "The racing deck does not need reshuffling."
        );
    }

    const cardCountBeforeBurn =
        room.discard.length;

    const burnedCards =
        rebuildDeckFromDiscard(
            room
        );

    recordRaceEvent(room, {
        type: "DECK_RESHUFFLED",

        cardCount:
            cardCountBeforeBurn,

        burnedCardCount:
            burnedCards.length
    });

    recordRaceEvent(room, {
        type: "CARDS_BURNED",

        reason:
            "RESHUFFLE",

        cards:
            burnedCards.map(
                (card) => ({
                    id:
                        card.id,

                    definitionId:
                        card.definitionId
                })
            )
    });

    if (
        room.shortenedBy <
        BOARD.foldLines.length
    ) {
        room.shortenedBy += 1;

        const newStartPosition =
            visibleStart(
                room.shortenedBy
            );

        const racersUnderFold =
            room.racers.filter(
                (racer) =>
                    !racer.finished &&
                    !racer.dq &&
                    racer.position <
                    newStartPosition
            );

        disqualifyRacersTogether(
            room,
            racersUnderFold.map(
                (racer) => ({
                    racer,

                    reason:
                        "was underneath the folded section of the track",

                    reasonCode:
                        "fold" as const
                })
            )
        );

        recordRaceEvent(room, {
            type:
                "TRACK_FOLDED",

            foldLevel:
                room.shortenedBy,

            newStartPosition,

            disqualifiedRacers:
                racersUnderFold.map(
                    (racer) =>
                        racer.name
                )
        });

        recordRaceState(
            room,
            "FOLD"
        );
    }

    if (!checkRaceEnd(room)) {
        room.phase =
            "racing";
    }
}