import {
    CARD_CATALOG_BY_ID,
    type RaceCard
} from "@crazy-racing/shared";
import type { Room } from "../gameLogic.js";
import {
    discardCard,
    drawTopCard
} from "./Deck.js";
import { executeCardDefinition } from "./CardExecutor.js";
import { checkRaceEnd } from "./Podium.js";
import { reshuffleAndFold } from "./Reshuffle.js";

export class RaceEngine {
    constructor(private readonly room: Room) { }

    playNextCard(): RaceCard | undefined {
        if (this.room.phase !== "racing") {
            return undefined;
        }

        if (this.room.deck.length === 0) {
            reshuffleAndFold(this.room);

            if (this.room.phase !== "racing") {
                return undefined;
            }
        }

        const card = drawTopCard(this.room);

        if (!card) {
            return undefined;
        }

        this.room.currentCard = card;
        discardCard(this.room, card);

        const definition = CARD_CATALOG_BY_ID[card.definitionId];

        if (!definition) {
            this.room.raceLog.push(
                `Unknown card drawn: ${card.definitionId}.`
            );

            return card;
        }

        /*
         * Every card draw gets one clear log entry using
         * the card's complete catalogue name.
         */
        const cardOwner =
            definition.racer === "GREEN"
                ? "GREEN"
                : definition.racer;

        this.room.raceLog.push(
            `CARD DRAWN — ${cardOwner}: ${definition.name}`
        );

        executeCardDefinition(this.room, definition);
        checkRaceEnd(this.room);

        return card;
    }
}