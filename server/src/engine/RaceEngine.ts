import {
    CARD_CATALOG_BY_ID,
    type RaceCard
} from "@crazy-racing/shared";
import type { Room } from "../gameLogic.js";
import {
    discardCard,
    drawTopCard
} from "./Deck.js";
import {
    executeCardDefinition
} from "./CardExecutor.js";
import {
    checkRaceEnd
} from "./Podium.js";

export class RaceEngine {
    constructor(private readonly room: Room) { }

    playNextCard(): RaceCard | undefined {
        if (this.room.phase !== "racing") {
            return undefined;
        }

        if (this.room.deck.length === 0) {
            this.room.phase = "reshuffle-required";
            return undefined;
        }

        const card = drawTopCard(this.room);

        if (!card) {
            this.room.phase = "reshuffle-required";
            return undefined;
        }

        this.room.currentCard = card;
        discardCard(this.room, card);

        const definition =
            CARD_CATALOG_BY_ID[card.definitionId];

        if (!definition) {
            this.room.raceLog.push(
                `Unknown card drawn: ${card.definitionId}.`
            );

            return card;
        }

        const owner =
            definition.racer === "GREEN"
                ? "GREEN"
                : definition.racer;

        this.room.raceLog.push(
            `CARD DRAWN - ${owner}: ${definition.name}`
        );

        executeCardDefinition(
            this.room,
            definition
        );

        checkRaceEnd(this.room);

        if (
            this.room.phase === "racing" &&
            this.room.deck.length === 0
        ) {
            this.room.phase = "reshuffle-required";
        }

        return card;
    }
}