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
import {
    recordRaceEvent,
    recordRaceState
} from "./RaceEvents.js";

export class RaceEngine {
    constructor(
        private readonly room: Room
    ) { }

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
            return card;
        }

        recordRaceEvent(this.room, {
            type: "CARD_DRAWN",
            cardId: card.id,
            definitionId: definition.id,
            owner: definition.racer,
            cardName: definition.name
        });

        executeCardDefinition(
            this.room,
            definition
        );

        recordRaceState(
            this.room,
            "CARD"
        );

        checkRaceEnd(this.room);

        if (
            this.room.phase === "racing" &&
            this.room.deck.length === 0
        ) {
            this.room.phase =
                "reshuffle-required";
        }

        return card;
    }
}