import { nanoid } from "nanoid";
import {
    CARD_CATALOG,
    RACERS,
    type CardType,
    type RaceCard,
    type RaceCardDefinition
} from "@crazy-racing/shared";
import type { Room } from "../gameLogic.js";

const RANDOM_CARDS_BY_PLAYER_COUNT: Record<number, number> = {
    2: 10,
    3: 11,
    4: 10,
    5: 9,
    6: 8,
    7: 7,
    8: 6,
    9: 14
};

export function createInitialRaceDeck(playerCount: number): RaceCard[] {
    const cards: RaceCard[] = [];

    /*
     * These remain the four guaranteed starting cards.
     * We are currently using Recover then Move 1 for each mascot.
     */
    for (const racer of RACERS) {
        const startingDefinition = CARD_CATALOG.find(
            (definition) =>
                definition.racer === racer &&
                definition.id === `${racer}_RECOVER_MOVE_1`
        );

        if (!startingDefinition) {
            throw new Error(`Missing starting card for ${racer}.`);
        }

        cards.push(createRaceCard(startingDefinition));
    }

    const startingDefinitionIds = new Set(
        cards.map((card) => card.definitionId)
    );

    const availableDefinitions = CARD_CATALOG.filter(
        (definition) => !startingDefinitionIds.has(definition.id)
    );

    shuffle(availableDefinitions);

    const randomCardCount = RANDOM_CARDS_BY_PLAYER_COUNT[playerCount] ?? 8;

    cards.push(
        ...availableDefinitions
            .slice(0, randomCardCount)
            .map(createRaceCard)
    );

    return cards;
}

export function drawCatalogCard(): RaceCard {
    const definition =
        CARD_CATALOG[Math.floor(Math.random() * CARD_CATALOG.length)];

    if (!definition) {
        throw new Error("The racing-card catalog is empty.");
    }

    return createRaceCard(definition);
}

export function createRaceCard(
    definition: RaceCardDefinition
): RaceCard {
    return {
        id: nanoid(8),
        definitionId: definition.id,
        racer: definition.racer,
        type: getLegacyCardType(definition),
        value: getLegacyCardValue(definition)
    };
}

export function drawTopCard(room: Room): RaceCard | undefined {
    return room.deck.shift();
}

export function discardCard(room: Room, card: RaceCard): void {
    room.discard.push(card);
}

export function burnThreeCards(room: Room): void {
    const burnedCards = room.deck.splice(0, 3);
    room.discard.push(...burnedCards);

    room.raceLog.push(`${burnedCards.length} card(s) discarded.`);
}

export function prepareDeckForRace(room: Room): void {
    shuffle(room.deck);
    burnThreeCards(room);
}

export function rebuildDeckFromDiscard(room: Room): void {
    room.deck = [...room.discard];
    room.discard = [];

    shuffle(room.deck);
    burnThreeCards(room);
}

export function shuffle<T>(items: T[]): void {
    for (let index = items.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(Math.random() * (index + 1));

        [items[index], items[randomIndex]] = [
            items[randomIndex],
            items[index]
        ];
    }
}

function getLegacyCardType(
    definition: RaceCardDefinition
): CardType {
    const actions = definition.actions;

    if (actions.some((action) => action.type === "SWERVE_LEFT")) {
        return "swerve-left";
    }

    if (actions.some((action) => action.type === "SWERVE_RIGHT")) {
        return "swerve-right";
    }

    if (actions.some((action) => action.type === "MOVE_TO_STAR")) {
        return "move-to-star";
    }

    if (actions.some((action) => action.type === "FALL_DOWN")) {
        return "fall";
    }

    if (actions.some((action) => action.type === "TURN_AROUND")) {
        return "turn";
    }

    if (
        actions.some((action) => action.type === "RECOVER") &&
        !actions.some((action) => action.type === "MOVE")
    ) {
        return "recover";
    }

    return "move";
}

function getLegacyCardValue(
    definition: RaceCardDefinition
): number | null {
    const moveAction = definition.actions.find(
        (action) => action.type === "MOVE"
    );

    return moveAction?.type === "MOVE"
        ? moveAction.value
        : null;
}