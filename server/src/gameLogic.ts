import { nanoid } from "nanoid";

import {
    BOARD,
    RACERS,
    type RacerName,
    type RacerState,
    type PodiumEntry,
    type RaceCard,
    MAX_PLAYERS,
    MIN_PLAYERS,
    STARTING_MONEY,
    SECRET_CARDS_TWO_PLAYERS,
    SECRET_CARDS_OTHER,
    visibleStart
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
    if (room.players.length >= MAX_PLAYERS) {
        throw new Error("Room is full.");
    }

    if (room.phase !== "lobby") {
        throw new Error("Game already started.");
    }

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
    if (!canStart(room)) {
        throw new Error("Need 2–9 ready players.");
    }

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
        const racer = RACERS[index % RACERS.length];

        p.bets = [
            {
                type: "mascot",
                racer,
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
        for (const card of player.selectedSecretCards) {
            room.deck.push(card);
        }

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
            if (bet.type === "mascot") {
                const place = ordered.indexOf(bet.racer) + 1;
                payout += payoutForPlace(place, bet.risk);
            }
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
        cards.push(createCard("move", racer, 1));
    }

    const count = randomCardsByPlayerCount[playerCount] ?? 8;

    for (let i = 0; i < count; i++) {
        cards.push(drawRandomCard());
    }

    return cards;
}

function drawRandomCard(): RaceCard {
    const racer = RACERS[Math.floor(Math.random() * RACERS.length)];

    const types: RaceCard["type"][] = [
        "move",
        "move",
        "move",
        "fall",
        "turn",
        "recover",
        "swerve-left",
        "swerve-right"
    ];

    const type = types[Math.floor(Math.random() * types.length)];

    if (type === "move") {
        const values = [-2, -1, 1, 2, 3];

        return createCard(
            type,
            racer,
            values[Math.floor(Math.random() * values.length)]
        );
    }

    return createCard(type, racer, null);
}

function createCard(
    type: RaceCard["type"],
    racer: RacerName,
    value: number | null
): RaceCard {
    return {
        id: nanoid(8),
        type,
        racer,
        value
    };
}

function applyCard(room: Room, card: RaceCard) {
    const racer = room.racers.find((r) => r.name === card.racer);
    if (!racer || racer.dq || racer.finished) return;

    if (card.type === "fall") {
        if (racer.fallen) {
            dqRacer(room, racer, "knocked out while already fallen");
        } else {
            racer.fallen = true;
            room.raceLog.push(`${racer.name} falls down.`);
        }

        return;
    }

    if (card.type === "turn") {
        racer.facing *= -1;
        room.raceLog.push(`${racer.name} turns around.`);
        return;
    }

    if (card.type === "recover") {
        racer.fallen = false;
        racer.facing = 1;
        room.raceLog.push(`${racer.name} recovers.`);
        return;
    }

    if (card.type === "swerve-left" || card.type === "swerve-right") {
        const laneDelta = card.type === "swerve-left" ? -1 : 1;
        racer.lane += laneDelta * racer.facing;

        if (racer.lane < 0 || racer.lane > 3) {
            dqRacer(room, racer, "swerved out of bounds");
            return;
        }

        checkCollision(room, racer);
        room.raceLog.push(`${racer.name} swerves.`);
        return;
    }

    if (card.type === "move") {
        const distance = racer.fallen ? Math.sign(card.value || 1) : card.value ?? 0;

        racer.position += distance * racer.facing;

        if (racer.position < getVisibleStartPosition(room.shortenedBy)) {
            dqRacer(room, racer, "ran off the back of the track");
            return;
        }

        if (racer.position >= BOARD.finishPosition) {
            finishRacer(room, racer);
            return;
        }

        checkCollision(room, racer);
        room.raceLog.push(`${racer.name} moves ${distance}.`);
    }
}

function handleReshuffle(room: Room) {
    room.raceLog.push("Deck empty. Reshuffling discard pile.");

    room.shortenedBy = Math.min(room.shortenedBy + 1, BOARD.foldLines.length);

    const visibleStartPosition = getVisibleStartPosition(room.shortenedBy);

    for (const racer of room.racers) {
        if (
            !racer.finished &&
            !racer.dq &&
            racer.position < visibleStartPosition
        ) {
            dqRacer(room, racer, "was under the folded track");
        }
    }

    room.deck = [...room.discard];
    room.discard = [];
    shuffle(room.deck);
    burnThreeCards(room);

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
                dqRacer(
                    room,
                    other,
                    `collided with ${movingRacer.name} while fallen`
                );
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