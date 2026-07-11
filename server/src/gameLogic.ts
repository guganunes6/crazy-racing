import {
    BOARD,
    RACERS,
    STARTING_MONEY,
    MAX_PLAYERS,
    MIN_PLAYERS,
    SECRET_CARDS_TWO_PLAYERS,
    SECRET_CARDS_OTHER,
    type RacerName,
    type RacerState,
    type PodiumEntry,
    type RaceCard
} from "@crazy-racing/shared";
import { nanoid } from "nanoid";
import {
    createInitialRaceDeck,
    drawCatalogCard,
    prepareDeckForRace
} from "./engine/Deck.js";
import { RaceEngine } from "./engine/RaceEngine.js";

export type GamePhase =
    | "lobby"
    | "betting"
    | "secret-card"
    | "racing"
    | "payouts"
    | "final";

export type PlayerBet = {
    type: "mascot";
    racer: RacerName;
    risk: "safe" | "risky";
};

export type Player = {
    id: string;
    name: string;
    ready: boolean;
    money: number;
    hand: RaceCard[];
    selectedSecretCards: RaceCard[];
    bets: PlayerBet[];
};

export type Room = {
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

export function createRoom(
    hostSocketId: string,
    hostName: string
): Room {
    return {
        roomCode: nanoid(6).toUpperCase(),
        hostSocketId,
        phase: "lobby",
        raceNumber: 1,
        shortenedBy: 0,
        players: [
            createPlayer(
                hostSocketId,
                hostName || "Host"
            )
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

export function addPlayer(
    room: Room,
    socketId: string,
    name: string
): void {
    if (room.players.length >= MAX_PLAYERS) {
        throw new Error("Room is full.");
    }

    if (room.phase !== "lobby") {
        throw new Error("Game already started.");
    }

    room.players.push(
        createPlayer(
            socketId,
            name || `Player ${room.players.length + 1}`
        )
    );
}

export function removePlayer(
    room: Room,
    socketId: string
): void {
    room.players = room.players.filter(
        (player) => player.id !== socketId
    );

    if (
        room.hostSocketId === socketId &&
        room.players.length > 0
    ) {
        room.hostSocketId = room.players[0].id;
    }
}

export function toggleReady(
    room: Room,
    socketId: string
): void {
    const player = room.players.find(
        (candidate) => candidate.id === socketId
    );

    if (player) {
        player.ready = !player.ready;
    }
}

export function canStart(room: Room): boolean {
    return (
        room.players.length >= MIN_PLAYERS &&
        room.players.length <= MAX_PLAYERS &&
        room.players.every((player) => player.ready)
    );
}

export function startGame(room: Room): void {
    if (!canStart(room)) {
        throw new Error("Need 2–9 ready players.");
    }

    room.phase = "betting";
    room.raceNumber = 1;

    for (const player of room.players) {
        player.money = STARTING_MONEY;
        player.hand = [];
        player.bets = [];
        player.selectedSecretCards = [];
    }

    setupRace(room);
}

export function setupRace(room: Room): void {
    room.shortenedBy = 0;
    room.racers = createInitialRacers();
    room.podium = [];
    room.raceLog = [];
    room.currentCard = null;
    room.discard = [];
    room.deck = createInitialRaceDeck(
        room.players.length
    );

    const handSize =
        room.players.length === 2 ? 4 : 3;

    for (const player of room.players) {
        while (player.hand.length < handSize) {
            player.hand.push(drawCatalogCard());
        }

        player.selectedSecretCards = [];
        player.bets = [];
    }
}

export function autoAssignDemoBets(
    room: Room
): void {
    room.players.forEach((player, index) => {
        player.bets = [
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
): void {
    const player = room.players.find(
        (candidate) => candidate.id === socketId
    );

    if (!player) {
        throw new Error("Player not found.");
    }

    const requiredCards =
        room.players.length === 2
            ? SECRET_CARDS_TWO_PLAYERS
            : SECRET_CARDS_OTHER;

    const selectedCards = player.hand
        .filter((card) => cardIds.includes(card.id))
        .slice(0, requiredCards);

    if (selectedCards.length !== requiredCards) {
        throw new Error(
            `Choose exactly ${requiredCards} card(s).`
        );
    }

    player.selectedSecretCards = selectedCards;
}

export function allSecretCardsSubmitted(
    room: Room
): boolean {
    const requiredCards =
        room.players.length === 2
            ? SECRET_CARDS_TWO_PLAYERS
            : SECRET_CARDS_OTHER;

    return room.players.every(
        (player) =>
            player.selectedSecretCards.length ===
            requiredCards
    );
}

export function beginRace(room: Room): void {
    for (const player of room.players) {
        room.deck.push(...player.selectedSecretCards);

        const selectedCardIds = new Set(
            player.selectedSecretCards.map(
                (card) => card.id
            )
        );

        player.hand = player.hand.filter(
            (card) => !selectedCardIds.has(card.id)
        );

        player.selectedSecretCards = [];
    }

    prepareDeckForRace(room);
    room.phase = "racing";
}

export function stepRace(
    room: Room
): RaceCard | undefined {
    const engine = new RaceEngine(room);
    return engine.playNextCard();
}

export function finishPayouts(room: Room): void {
    const orderedRacers = [...room.podium]
        .sort(
            (first, second) =>
                (first.place ?? 999) -
                (second.place ?? 999)
        )
        .map((entry) => entry.racer);

    for (const player of room.players) {
        let payout = 0;

        for (const bet of player.bets) {
            const place =
                orderedRacers.indexOf(bet.racer) + 1;

            payout += payoutForPlace(
                place,
                bet.risk
            );
        }

        player.money = Math.max(
            0,
            player.money + payout
        );
    }

    if (room.raceNumber >= 3) {
        room.phase = "final";
        return;
    }

    room.raceNumber += 1;
    room.phase = "betting";

    for (const player of room.players) {
        player.hand.push(drawCatalogCard());
    }

    setupRace(room);
}

function createPlayer(
    id: string,
    name: string
): Player {
    return {
        id,
        name,
        ready: false,
        money: STARTING_MONEY,
        hand: [],
        selectedSecretCards: [],
        bets: []
    };
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

function payoutForPlace(
    place: number,
    risk: "safe" | "risky"
): number {
    if (place === 1) {
        return risk === "risky" ? 15 : 10;
    }

    if (place === 2) {
        return risk === "risky" ? 5 : 7;
    }

    if (place === 3) {
        return risk === "risky" ? 2 : 5;
    }

    return 0;
}