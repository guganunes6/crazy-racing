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

/**
 * Creates the complete finite supply of physical racing cards.
 *
 * CARD_CATALOG already contains:
 * - one definition for each single-copy card;
 * - two separate definitions for each duplicated green card.
 *
 * Therefore this creates exactly 53 card instances.
 */
export function createCompleteCardSupply(): RaceCard[] {
    return CARD_CATALOG.map((definition) =>
        createRaceCard(definition)
    );
}

/**
 * Creates the first public racing deck by removing cards
 * from the finite available-card supply.
 */
export function createInitialRaceDeck(
    playerCount: number,
    availableCards: RaceCard[]
): RaceCard[] {
    const deck: RaceCard[] = [];

    /*
     * The four guaranteed cards are physically removed
     * from the shared supply first.
     */
    for (const racer of RACERS) {
        const guaranteedDefinitionId =
            `${racer}_RECOVER_MOVE_2`;

        const guaranteedCard =
            takeCardByDefinitionId(
                availableCards,
                guaranteedDefinitionId
            );

        deck.push(guaranteedCard);
    }

    const randomCardCount =
        RANDOM_CARDS_BY_PLAYER_COUNT[playerCount] ?? 8;

    deck.push(
        ...drawRandomCardsFromSupply(
            availableCards,
            randomCardCount
        )
    );

    return deck;
}

/**
 * Removes and returns one random card from the finite supply.
 */
export function drawRandomCardFromSupply(
    availableCards: RaceCard[]
): RaceCard {
    if (availableCards.length === 0) {
        throw new Error(
            "There are no racing cards remaining in the supply."
        );
    }

    const randomIndex = Math.floor(
        Math.random() * availableCards.length
    );

    const [card] = availableCards.splice(randomIndex, 1);

    if (!card) {
        throw new Error(
            "Failed to draw a racing card from the supply."
        );
    }

    return card;
}

/**
 * Removes several random cards from the same finite supply.
 */
export function drawRandomCardsFromSupply(
    availableCards: RaceCard[],
    amount: number
): RaceCard[] {
    if (amount < 0) {
        throw new Error(
            "The number of cards to draw cannot be negative."
        );
    }

    if (availableCards.length < amount) {
        throw new Error(
            `Cannot draw ${amount} cards. ` +
            `Only ${availableCards.length} remain in the supply.`
        );
    }

    const cards: RaceCard[] = [];

    for (let index = 0; index < amount; index++) {
        cards.push(
            drawRandomCardFromSupply(availableCards)
        );
    }

    return cards;
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

export function drawTopCard(
    room: Room
): RaceCard | undefined {
    return room.deck.shift();
}

export function discardCard(
    room: Room,
    card: RaceCard
): void {
    room.discard.push(card);
}

export function burnThreeCards(
    room: Room
): RaceCard[] {
    const burnedCards =
        room.deck.splice(
            0,
            Math.min(
                3,
                room.deck.length
            )
        );

    room.discard.push(
        ...burnedCards
    );

    return burnedCards;
}

export function prepareDeckForRace(
    room: Room
): RaceCard[] {
    shuffle(room.deck);

    return burnThreeCards(
        room
    );
}

export function rebuildDeckFromDiscard(
    room: Room
): RaceCard[] {
    room.deck = [
        ...room.discard
    ];

    room.discard = [];

    shuffle(room.deck);

    return burnThreeCards(
        room
    );
}

export function shuffle<T>(
    items: T[]
): void {
    for (
        let index = items.length - 1;
        index > 0;
        index--
    ) {
        const randomIndex =
            Math.floor(
                Math.random() *
                (index + 1)
            );

        [
            items[index],
            items[randomIndex]
        ] = [
                items[randomIndex],
                items[index]
            ];
    }
}

function takeCardByDefinitionId(
    availableCards: RaceCard[],
    definitionId: string
): RaceCard {
    const cardIndex =
        availableCards.findIndex(
            (card) =>
                card.definitionId === definitionId
        );

    if (cardIndex < 0) {
        throw new Error(
            `Card is unavailable: ${definitionId}`
        );
    }

    const [card] =
        availableCards.splice(
            cardIndex,
            1
        );

    if (!card) {
        throw new Error(
            `Failed to remove card: ${definitionId}`
        );
    }

    return card;
}

function getLegacyCardType(
    definition: RaceCardDefinition
): CardType {
    const actions =
        definition.actions;

    if (
        actions.some(
            (action) =>
                action.type === "SWERVE_LEFT"
        )
    ) {
        return "swerve-left";
    }

    if (
        actions.some(
            (action) =>
                action.type === "SWERVE_RIGHT"
        )
    ) {
        return "swerve-right";
    }

    if (
        actions.some(
            (action) =>
                action.type === "MOVE_TO_STAR"
        )
    ) {
        return "move-to-star";
    }

    if (
        actions.some(
            (action) =>
                action.type === "FALL_DOWN"
        )
    ) {
        return "fall";
    }

    if (
        actions.some(
            (action) =>
                action.type === "TURN_AROUND"
        )
    ) {
        return "turn";
    }

    if (
        actions.some(
            (action) =>
                action.type === "RECOVER"
        ) &&
        !actions.some(
            (action) =>
                action.type === "MOVE"
        )
    ) {
        return "recover";
    }

    return "move";
}

function getLegacyCardValue(
    definition: RaceCardDefinition
): number | null {
    const moveAction =
        definition.actions.find(
            (action) =>
                action.type === "MOVE"
        );

    return moveAction?.type === "MOVE"
        ? moveAction.value
        : null;
}