import { nanoid } from "nanoid";
import {
    BOARD,
    RACERS,
    STARTING_MONEY,
    MAX_PLAYERS,
    MIN_PLAYERS,
    SECRET_CARDS_TWO_PLAYERS,
    SECRET_CARDS_OTHER,
    visibleStart,
    CARD_CATALOG,
    type RacerName,
    type RacerState,
    type PodiumEntry,
    type RaceCard,
    type RaceCardDefinition,
    type CardType,
    type CardAction
} from "@crazy-racing/shared";

type GamePhase =
    | "lobby"
    | "betting"
    | "secret-card"
    | "racing"
    | "payouts"
    | "final";

type Player = {
    id: string;
    name: string;
    ready: boolean;
    money: number;
    hand: RaceCard[];
    selectedSecretCards: RaceCard[];
    bets: {
        type: "mascot";
        racer: RacerName;
        risk: "safe" | "risky";
    }[];
};

type Room = {
    roomCode: string;
    hostSocketId: string;
    phase: GamePhase;
    raceNumber: number;
    shortenedBy: number;
    players: Player[];
    racers: RacerState[];
    podium: PodiumEntry[];
    raceLog: string[];
    currentCard: RaceCard | null;
    deck: RaceCard[];
    discard: RaceCard[];
    createdAt: number;
};

export function createRoom(hostSocketId: string, hostName: string): Room {
    const roomCode = nanoid(6).toUpperCase();

    return {
        roomCode,
        hostSocketId,
        phase: "lobby",
        raceNumber: 1,
        shortenedBy: 0,
        players: [
            {
                id: hostSocketId,
                name: hostName || "Host",
                ready: false,
                money: STARTING_MONEY,
                hand: [],
                selectedSecretCards: [],
                bets: []
            }
        ],
        racers: createInitialRacers(),
        podium: [],
        raceLog: [],
        currentCard: null,
        deck: [],
        discard: [],
        createdAt: Date.now()
    };
}

export function addPlayer(room: Room, socketId: string, name: string) {
    if (room.players.length >= MAX_PLAYERS) throw new Error("Room is full.");
    if (room.phase !== "lobby") throw new Error("Game already started.");

    room.players.push({
        id: socketId,
        name: name || `Player ${room.players.length + 1}`,
        ready: false,
        money: STARTING_MONEY,
        hand: [],
        selectedSecretCards: [],
        bets: []
    });
}

export function removePlayer(room: Room, socketId: string) {
    room.players = room.players.filter((p) => p.id !== socketId);

    if (room.hostSocketId === socketId && room.players.length > 0) {
        room.hostSocketId = room.players[0].id;
    }
}

export function toggleReady(room: Room, socketId: string) {
    const player = room.players.find((p) => p.id === socketId);
    if (player) player.ready = !player.ready;
}

export function canStart(room: Room) {
    return (
        room.players.length >= MIN_PLAYERS &&
        room.players.length <= MAX_PLAYERS &&
        room.players.every((p) => p.ready)
    );
}

export function startGame(room: Room) {
    if (!canStart(room)) throw new Error("Need 2–9 ready players.");

    room.phase = "betting";
    room.raceNumber = 1;
    room.shortenedBy = 0;

    room.players.forEach((p) => {
        p.money = STARTING_MONEY;
        p.bets = [];
        p.selectedSecretCards = [];
    });

    setupRace(room);
}

export function setupRace(room: Room) {
    room.shortenedBy = 0;
    room.racers = createInitialRacers();
    room.podium = [];
    room.raceLog = [];
    room.currentCard = null;
    room.discard = [];
    room.deck = createRaceDeck(room.players.length);

    const handSize = room.players.length === 2 ? 4 : 3;

    room.players.forEach((p) => {
        while (p.hand.length < handSize) {
            p.hand.push(drawRandomCard());
        }

        p.selectedSecretCards = [];
        p.bets = [];
    });
}

export function autoAssignDemoBets(room: Room) {
    room.players.forEach((p, index) => {
        p.bets = [
            {
                type: "mascot",
                racer: RACERS[index % RACERS.length],
                risk: "safe"
            }
        ];
    });

    room.phase = "secret-card";
}

export function submitSecretCards(
    room: Room,
    socketId: string,
    cardIds: string[]
) {
    const player = room.players.find((p) => p.id === socketId);
    if (!player) return;

    const needed =
        room.players.length === 2
            ? SECRET_CARDS_TWO_PLAYERS
            : SECRET_CARDS_OTHER;

    const selected = player.hand
        .filter((card) => cardIds.includes(card.id))
        .slice(0, needed);

    if (selected.length !== needed) {
        throw new Error(`Choose exactly ${needed} card(s).`);
    }

    player.selectedSecretCards = selected;
}

export function allSecretCardsSubmitted(room: Room) {
    const needed =
        room.players.length === 2
            ? SECRET_CARDS_TWO_PLAYERS
            : SECRET_CARDS_OTHER;

    return room.players.every((p) => p.selectedSecretCards.length === needed);
}

export function beginRace(room: Room) {
    for (const player of room.players) {
        room.deck.push(...player.selectedSecretCards);

        const selectedIds = new Set(player.selectedSecretCards.map((c) => c.id));
        player.hand = player.hand.filter((c) => !selectedIds.has(c.id));
    }

    shuffle(room.deck);
    burnThreeCards(room);

    room.phase = "racing";
}

export function stepRace(room: Room) {
    if (room.phase !== "racing") return;

    if (room.deck.length === 0) {
        handleReshuffle(room);
    }

    const card = room.deck.shift();
    if (!card) return;

    room.currentCard = card;
    room.discard.push(card);

    applyCard(room, card);
    checkRaceEnd(room);

    return card;
}

export function finishPayouts(room: Room) {
    const ordered = [...room.podium]
        .sort((a, b) => (a.place ?? 999) - (b.place ?? 999))
        .map((entry) => entry.racer);

    room.players.forEach((player) => {
        let payout = 0;

        for (const bet of player.bets) {
            const place = ordered.indexOf(bet.racer) + 1;
            payout += payoutForPlace(place, bet.risk);
        }

        player.money = Math.max(0, player.money + payout);
    });

    if (room.raceNumber >= 3) {
        room.phase = "final";
    } else {
        room.raceNumber += 1;
        room.phase = "betting";

        room.players.forEach((p) => {
            p.hand.push(drawRandomCard());
        });

        setupRace(room);
    }
}

function createInitialRacers(): RacerState[] {
    return RACERS.map((name, lane) => ({
        name,
        lane,
        position: BOARD.startPosition,
        facing: 1,
        fallen: false,
        dq: false,
        finished: false
    }));
}

function createRaceDeck(playerCount: number): RaceCard[] {
    const randomCardsByPlayerCount: Record<number, number> = {
        2: 10,
        3: 11,
        4: 10,
        5: 9,
        6: 8,
        7: 7,
        8: 6,
        9: 14
    };

    const cards: RaceCard[] = [];

    for (const racer of RACERS) {
        const startingCard = CARD_CATALOG.find(
            (card) => card.racer === racer && card.id === `${racer}_RECOVER_MOVE_1`
        );

        if (!startingCard) throw new Error(`Missing starting card for ${racer}`);

        cards.push(createRaceCardFromDefinition(startingCard));
    }

    const usedDefinitionIds = new Set(cards.map((card) => card.definitionId));

    const remainingDefinitions = CARD_CATALOG.filter(
        (definition) => !usedDefinitionIds.has(definition.id)
    );

    shuffle(remainingDefinitions);

    const count = randomCardsByPlayerCount[playerCount] ?? 8;

    cards.push(
        ...remainingDefinitions
            .slice(0, count)
            .map((definition) => createRaceCardFromDefinition(definition))
    );

    return cards;
}

function drawRandomCard(): RaceCard {
    const definition =
        CARD_CATALOG[Math.floor(Math.random() * CARD_CATALOG.length)];

    return createRaceCardFromDefinition(definition);
}

function createRaceCardFromDefinition(
    definition: RaceCardDefinition
): RaceCard {
    return {
        id: nanoid(8),
        definitionId: definition.id,
        racer: definition.racer,
        type: legacyCardType(definition),
        value: legacyCardValue(definition)
    };
}

function legacyCardType(definition: RaceCardDefinition): CardType {
    const lastAction = definition.actions[definition.actions.length - 1];

    if (lastAction.type === "MOVE") return "move";
    if (lastAction.type === "FALL_DOWN") return "fall";
    if (lastAction.type === "RECOVER") return "recover";
    if (lastAction.type === "TURN_AROUND") return "turn";
    if (lastAction.type === "SWERVE_LEFT") return "swerve-left";
    if (lastAction.type === "SWERVE_RIGHT") return "swerve-right";
    if (lastAction.type === "MOVE_TO_STAR") return "move-to-star";

    return "move";
}

function legacyCardValue(definition: RaceCardDefinition): number | null {
    const moveAction = definition.actions.find((action) => action.type === "MOVE");
    return moveAction?.type === "MOVE" ? moveAction.value : null;
}

function applyCard(room: Room, card: RaceCard) {
    const definition = CARD_CATALOG.find((def) => def.id === card.definitionId);
    if (!definition) return;

    if (definition.green) {
        applyGreenCard(room, definition);
        return;
    }

    if (definition.racer === "GREEN") return;

    const racer = room.racers.find((r) => r.name === definition.racer);
    if (!racer || racer.dq || racer.finished) return;

    for (const action of definition.actions) {
        if (racer.dq || racer.finished) return;
        executeAction(room, racer, action, definition);
    }
}

function applyGreenCard(room: Room, definition: RaceCardDefinition) {
    for (const action of definition.actions) {
        for (const racer of room.racers) {
            if (racer.dq || racer.finished) continue;
            executeAction(room, racer, action, definition);
        }
    }

    room.raceLog.push(`Green card: ${definition.name}.`);
}

function executeAction(
    room: Room,
    racer: RacerState,
    action: CardAction,
    definition: RaceCardDefinition
) {
    if (action.type === "RECOVER") {
        racer.fallen = false;
        racer.facing = 1;
        room.raceLog.push(`${racer.name} recovers.`);
        return;
    }

    if (action.type === "MOVE") {
        moveRacer(room, racer, action.value, definition.canCollide, definition.canFinish);
        return;
    }

    if (action.type === "MOVE_TO_STAR") {
        moveRacerToNextStar(room, racer, definition.canCollide, definition.canFinish);
        return;
    }

    if (action.type === "TURN_AROUND") {
        racer.facing = racer.facing === 1 ? -1 : 1;
        room.raceLog.push(`${racer.name} turns around.`);
        return;
    }

    if (action.type === "FALL_DOWN") {
        if (racer.fallen) {
            dqRacer(room, racer, "knocked out while already fallen");
        } else {
            racer.fallen = true;
            room.raceLog.push(`${racer.name} falls down.`);
        }
        return;
    }

    if (action.type === "SWERVE_LEFT") {
        swerveRacer(room, racer, -1, definition.canCollide);
        return;
    }

    if (action.type === "SWERVE_RIGHT") {
        swerveRacer(room, racer, 1, definition.canCollide);
    }
}

function moveRacer(
    room: Room,
    racer: RacerState,
    value: number,
    canCollide: boolean,
    canFinish: boolean
) {
    const movementValue = racer.fallen ? Math.sign(value || 1) : value;
    const direction = movementValue >= 0 ? racer.facing : -racer.facing;
    const steps = Math.abs(movementValue);

    for (let i = 0; i < steps; i++) {
        racer.position += direction;

        if (racer.position < getVisibleStartPosition(room.shortenedBy)) {
            dqRacer(room, racer, "ran off the back of the track");
            return;
        }

        if (canFinish && racer.position >= BOARD.finishPosition) {
            finishRacer(room, racer);
            return;
        }

        if (!canFinish && racer.position >= BOARD.finishPosition) {
            racer.position = BOARD.finishPosition;
            return;
        }

        if (canCollide) {
            checkCollision(room, racer);
        }

        if (racer.dq || racer.finished) return;
    }

    room.raceLog.push(`${racer.name} moves ${value}.`);
}

function moveRacerToNextStar(
    room: Room,
    racer: RacerState,
    canCollide: boolean,
    canFinish: boolean
) {
    const sortedStars =
        racer.facing === 1
            ? [...BOARD.stars].sort((a, b) => a - b)
            : [...BOARD.stars].sort((a, b) => b - a);

    const nextStar = sortedStars.find((star) =>
        racer.facing === 1 ? star > racer.position : star < racer.position
    );

    if (nextStar === undefined) {
        room.raceLog.push(`${racer.name} has no star to move to.`);
        return;
    }

    const distance = nextStar - racer.position;
    moveRacer(room, racer, distance * racer.facing, canCollide, canFinish);
}

function swerveRacer(
    room: Room,
    racer: RacerState,
    laneDelta: number,
    canCollide: boolean
) {
    racer.lane += laneDelta * racer.facing;

    if (racer.lane < 0 || racer.lane >= BOARD.laneCount) {
        dqRacer(room, racer, "swerved out of bounds");
        return;
    }

    if (canCollide) {
        checkCollision(room, racer);
    }

    room.raceLog.push(`${racer.name} swerves.`);
}

function handleReshuffle(room: Room) {
    room.raceLog.push("Deck empty. Reshuffling discard pile.");

    room.deck = [...room.discard];
    room.discard = [];
    shuffle(room.deck);
    burnThreeCards(room);

    room.shortenedBy = Math.min(room.shortenedBy + 1, BOARD.foldLines.length);

    const visibleStartPosition = getVisibleStartPosition(room.shortenedBy);

    for (const racer of room.racers) {
        if (!racer.finished && !racer.dq && racer.position < visibleStartPosition) {
            dqRacer(room, racer, "was under the folded track");
        }
    }

    room.raceLog.push(`Track shortened to fold line ${room.shortenedBy}.`);
}

function getVisibleStartPosition(shortenedBy: number) {
    return visibleStart(shortenedBy);
}

function burnThreeCards(room: Room) {
    room.discard.push(...room.deck.splice(0, 3));
}

function checkCollision(room: Room, movingRacer: RacerState) {
    for (const other of room.racers) {
        if (
            other.name !== movingRacer.name &&
            !other.dq &&
            !other.finished &&
            other.lane === movingRacer.lane &&
            other.position === movingRacer.position
        ) {
            if (other.fallen) {
                dqRacer(room, other, `collided with ${movingRacer.name} while fallen`);
            } else {
                other.fallen = true;
                room.raceLog.push(
                    `${movingRacer.name} collides with ${other.name}. ${other.name} falls.`
                );
            }
        }
    }
}

function finishRacer(room: Room, racer: RacerState) {
    racer.finished = true;

    const place = getHighestAvailablePodiumPlace(room);

    room.podium.push({
        place,
        racer: racer.name,
        status: "finished"
    });

    room.raceLog.push(`${racer.name} crosses the finish line in ${place} place.`);
}

function dqRacer(room: Room, racer: RacerState, reason: string) {
    racer.dq = true;

    const place = getLowestAvailablePodiumPlace(room);

    room.podium.push({
        place,
        racer: racer.name,
        status: "DQ",
        reason
    });

    room.raceLog.push(`${racer.name} is DQ and goes to ${place} place: ${reason}.`);
}

function getHighestAvailablePodiumPlace(room: Room) {
    const occupied = new Set(room.podium.map((p) => p.place));

    for (let place = 1; place <= 4; place++) {
        if (!occupied.has(place)) return place;
    }

    return 4;
}

function getLowestAvailablePodiumPlace(room: Room) {
    const occupied = new Set(room.podium.map((p) => p.place));

    for (let place = 4; place >= 1; place--) {
        if (!occupied.has(place)) return place;
    }

    return 4;
}

function checkRaceEnd(room: Room) {
    const completedCount = room.racers.filter((r) => r.finished || r.dq).length;

    if (completedCount >= 3) {
        for (const racer of room.racers) {
            if (!racer.finished && !racer.dq) {
                const place = getHighestAvailablePodiumPlace(room);

                racer.finished = true;

                room.podium.push({
                    place,
                    racer: racer.name,
                    status: "remaining"
                });
            }
        }

        room.phase = "payouts";
    }
}

function payoutForPlace(place: number, risk: "safe" | "risky") {
    if (place === 1) return risk === "risky" ? 15 : 10;
    if (place === 2) return risk === "risky" ? 5 : 7;
    if (place === 3) return risk === "risky" ? 2 : 5;
    return 0;
}

function shuffle<T>(array: T[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}