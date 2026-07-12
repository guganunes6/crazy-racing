import {
    BOARD,
    RACERS,
    SIDE_BETS,
    STARTING_MONEY,
    MAX_PLAYERS,
    MIN_PLAYERS,
    SECRET_CARDS_TWO_PLAYERS,
    SECRET_CARDS_OTHER,
    type BettingDraftState,
    type DraftedBetTicket,
    type PodiumEntry,
    type RaceCard,
    type RacerState,
    type SideBetDefinition,
    type TicketStackState
} from "@crazy-racing/shared";
import { nanoid } from "nanoid";

import {
    createInitialRaceDeck,
    drawCatalogCard,
    prepareDeckForRace
} from "./engine/Deck.js";
import { RaceEngine } from "./engine/RaceEngine.js";
import { reshuffleRaceDeck } from "./engine/Reshuffle.js";
import { startBettingDraft } from "./betting/BettingDraft.js";
import { createTicketStacks } from "./betting/TicketStacks.js";

export type GamePhase =
    | "lobby"
    | "betting"
    | "double-bet"
    | "secret-card"
    | "ready-to-race"
    | "racing"
    | "reshuffle-required"
    | "payouts"
    | "final";

export type Player = {
    id: string;
    name: string;
    ready: boolean;
    money: number;

    hand: RaceCard[];
    selectedSecretCards: RaceCard[];

    draftedTickets: DraftedBetTicket[];
    doubledTicketId: string | null;

    raceAgain: boolean;
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

    publicRaceDeckDefinitionIds: string[];

    currentSideBet: SideBetDefinition;
    availableSideBetIds: string[];
    ticketStacks: TicketStackState[];
    bettingDraft: BettingDraftState;
    draftStartingPlayerIndex: number;

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

        publicRaceDeckDefinitionIds: [],

        currentSideBet: SIDE_BETS[0],
        availableSideBetIds: SIDE_BETS.map(
            (sideBet) => sideBet.id
        ),
        ticketStacks: createTicketStacks(),
        bettingDraft: createEmptyBettingDraft(),
        draftStartingPlayerIndex: 0,

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
        throw new Error(
            "The game has already started."
        );
    }

    room.players.push(
        createPlayer(
            socketId,
            name ||
            `Player ${room.players.length + 1}`
        )
    );
}

export function removePlayer(
    room: Room,
    socketId: string
): void {
    room.players = room.players.filter(
        (player) =>
            player.id !== socketId
    );

    if (
        room.hostSocketId === socketId &&
        room.players.length > 0
    ) {
        room.hostSocketId =
            room.players[0].id;
    }
}

export function toggleReady(
    room: Room,
    socketId: string
): void {
    const player = room.players.find(
        (candidate) =>
            candidate.id === socketId
    );

    if (player) {
        player.ready = !player.ready;
    }
}

export function canStart(
    room: Room
): boolean {
    return (
        room.players.length >= MIN_PLAYERS &&
        room.players.length <= MAX_PLAYERS &&
        room.players.every(
            (player) => player.ready
        )
    );
}

export function startGame(
    room: Room
): void {
    if (!canStart(room)) {
        throw new Error(
            "Need 2-9 ready players."
        );
    }

    room.raceNumber = 1;

    room.draftStartingPlayerIndex =
        Math.floor(
            Math.random() *
            room.players.length
        );

    for (const player of room.players) {
        player.raceAgain = false;
        player.money = STARTING_MONEY;
        player.hand = [];
        player.draftedTickets = [];
        player.doubledTicketId = null;
        player.selectedSecretCards = [];
    }

    room.availableSideBetIds = SIDE_BETS.map(
        (sideBet) => sideBet.id
    );

    setupFirstRace(room);
}

export function submitSecretCards(
    room: Room,
    socketId: string,
    cardIds: string[]
): void {
    if (room.phase !== "secret-card") {
        throw new Error(
            "Secret-card selection is not active."
        );
    }

    const player = room.players.find(
        (candidate) =>
            candidate.id === socketId
    );

    if (!player) {
        throw new Error(
            "Player not found."
        );
    }

    const requiredCards =
        room.players.length === 2
            ? SECRET_CARDS_TWO_PLAYERS
            : SECRET_CARDS_OTHER;

    const uniqueCardIds =
        new Set(cardIds);

    const selectedCards =
        player.hand.filter(
            (card) =>
                uniqueCardIds.has(card.id)
        );

    if (
        selectedCards.length !==
        requiredCards
    ) {
        throw new Error(
            `Choose exactly ${requiredCards} card(s).`
        );
    }

    player.selectedSecretCards =
        selectedCards;

    if (
        allSecretCardsSubmitted(room)
    ) {
        room.phase =
            "ready-to-race";
    }
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

export function beginRace(
    room: Room
): void {
    if (
        room.phase !==
        "ready-to-race"
    ) {
        throw new Error(
            "Not every player has submitted their secret cards."
        );
    }

    for (const player of room.players) {
        room.deck.push(
            ...player.selectedSecretCards
        );

        const selectedIds =
            new Set(
                player.selectedSecretCards.map(
                    (card) => card.id
                )
            );

        player.hand =
            player.hand.filter(
                (card) =>
                    !selectedIds.has(card.id)
            );

        player.selectedSecretCards = [];
    }

    room.podium = [];
    prepareDeckForRace(room);
    room.phase = "racing";
}

export function stepRace(
    room: Room
): RaceCard | undefined {
    const engine =
        new RaceEngine(room);

    return engine.playNextCard();
}

export function reshuffleRace(
    room: Room
): void {
    reshuffleRaceDeck(room);
}

export function finishPayouts(
    room: Room
): void {
    /*
     * Actual betting payout evaluation will be
     * implemented with the race-event tracker.
     */

    if (room.raceNumber >= 3) {
        room.phase = "final";
        return;
    }

    /*
     * Restore the complete racing deck from the
     * cards that were not drawn and all discarded
     * cards, including the three initial burned cards.
     *
     * Example with 3 players after Race 1:
     * 18 total cards are restored here.
     */
    room.deck = [
        ...room.deck,
        ...room.discard
    ];

    room.discard = [];
    room.currentCard = null;

    room.raceNumber += 1;

    room.draftStartingPlayerIndex =
        (
            room.draftStartingPlayerIndex +
            1
        ) %
        room.players.length;

    setupFollowingRace(room);
}

export function selectRaceAgain(
    room: Room,
    socketId: string
): void {
    if (room.phase !== "final") {
        throw new Error(
            "Race-again selection is only available after the game."
        );
    }

    const player = room.players.find(
        (candidate) =>
            candidate.id === socketId
    );

    if (!player) {
        throw new Error(
            "Player not found."
        );
    }

    player.raceAgain = true;
}

export function canRestartGame(
    room: Room
): boolean {
    return room.players.some(
        (player) =>
            player.id !== room.hostSocketId &&
            player.raceAgain
    );
}

export function restartGame(
    room: Room
): string[] {
    if (room.phase !== "final") {
        throw new Error(
            "The game is not finished."
        );
    }

    if (!canRestartGame(room)) {
        throw new Error(
            "At least one other player must choose Race again."
        );
    }

    const keptPlayers =
        room.players.filter(
            (player) =>
                player.id === room.hostSocketId ||
                player.raceAgain
        );

    const kickedPlayerIds =
        room.players
            .filter(
                (player) =>
                    player.id !== room.hostSocketId &&
                    !player.raceAgain
            )
            .map(
                (player) => player.id
            );

    room.players = keptPlayers;

    /*
     * Return the retained players to the lobby.
     * The host must start the new game manually.
     */
    room.phase = "lobby";
    room.raceNumber = 1;
    room.shortenedBy = 0;

    room.racers =
        createInitialRacers();

    room.podium = [];
    room.raceLog = [];
    room.currentCard = null;
    room.deck = [];
    room.discard = [];

    room.publicRaceDeckDefinitionIds =
        [];

    room.currentSideBet =
        SIDE_BETS[0];

    room.availableSideBetIds =
        SIDE_BETS.map(
            (sideBet) => sideBet.id
        );

    room.ticketStacks =
        createTicketStacks();

    room.bettingDraft =
        createEmptyBettingDraft();

    room.draftStartingPlayerIndex = 0;

    for (const player of room.players) {
        player.ready = false;
        player.raceAgain = false;
        player.money = STARTING_MONEY;

        player.hand = [];
        player.selectedSecretCards = [];

        player.draftedTickets = [];
        player.doubledTicketId = null;
    }

    return kickedPlayerIds;
}

function setupFirstRace(
    room: Room
): void {
    resetRaceBoardState(room);
    room.podium = [];

    room.deck =
        createInitialRaceDeck(
            room.players.length
        );

    fillInitialPlayerHands(room);
    preparePreRaceDraft(room);
}

function setupFollowingRace(
    room: Room
): void {
    /*
     * Do not replace room.deck here.
     *
     * It already contains the complete card pool
     * recovered from the previous race.
     */
    resetRaceBoardState(room);

    /*
     * Every player draws one new private card.
     * The card they select later will be added to
     * the existing racing deck.
     */
    for (const player of room.players) {
        player.hand.push(
            drawCatalogCard()
        );
    }

    preparePreRaceDraft(room);
}

function resetRaceBoardState(
    room: Room
): void {
    room.shortenedBy = 0;

    room.racers =
        createInitialRacers();

    room.raceLog = [];
    room.currentCard = null;

    /*
     * The discard pile has already been merged into
     * room.deck by finishPayouts() for later races.
     */
    room.discard = [];

    for (const player of room.players) {
        player.selectedSecretCards = [];
        player.draftedTickets = [];
        player.doubledTicketId = null;
        player.raceAgain = false;
    }
}

function fillInitialPlayerHands(
    room: Room
): void {
    const handSize =
        room.players.length === 2
            ? 4
            : 3;

    for (const player of room.players) {
        while (
            player.hand.length <
            handSize
        ) {
            player.hand.push(
                drawCatalogCard()
            );
        }
    }
}

function preparePreRaceDraft(
    room: Room
): void {
    room.publicRaceDeckDefinitionIds =
        room.deck.map(
            (card) =>
                card.definitionId
        );

    room.currentSideBet =
        drawRandomSideBet(room);

    room.ticketStacks =
        createTicketStacks();

    startBettingDraft(
        room,
        room.draftStartingPlayerIndex
    );
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

        draftedTickets: [],
        doubledTicketId: null,

        raceAgain: false
    };
}

function createInitialRacers():
    RacerState[] {
    return RACERS.map(
        (name, lane) => ({
            name,
            lane,
            position:
                BOARD.startPosition,
            facing: 1,
            fallen: false,
            dq: false,
            finished: false
        })
    );
}

function createEmptyBettingDraft():
    BettingDraftState {
    return {
        order: [],
        turnIndex: 0,
        currentPlayerId: null,
        picksPerPlayer: 2,
        startingPlayerIndex: 0,
        completed: false
    };
}

function drawRandomSideBet(
    room: Room
): SideBetDefinition {
    if (
        room.availableSideBetIds.length === 0
    ) {
        throw new Error(
            "There are no side bets remaining."
        );
    }

    const randomIndex =
        Math.floor(
            Math.random() *
            room.availableSideBetIds.length
        );

    const [selectedSideBetId] =
        room.availableSideBetIds.splice(
            randomIndex,
            1
        );

    const selectedSideBet =
        SIDE_BETS.find(
            (sideBet) =>
                sideBet.id === selectedSideBetId
        );

    if (!selectedSideBet) {
        throw new Error(
            `Side bet not found: ${selectedSideBetId}`
        );
    }

    return selectedSideBet;
}