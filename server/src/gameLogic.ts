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
    type CompletedRaceReplay,
    type DraftedBetTicket,
    type PodiumEntry,
    type RaceCard,
    type RaceEvent,
    type RacePayoutSummary,
    type RacerState,
    type SideBetDefinition,
    type TicketStackState,
} from "@crazy-racing/shared";
import { nanoid } from "nanoid";

import {
    createCompleteCardSupply,
    createInitialRaceDeck,
    drawRandomCardFromSupply,
    prepareDeckForRace,
    shuffle,
} from "./engine/Deck.js";
import { RaceEngine } from "./engine/RaceEngine.js";
import { recordRaceEvent } from "./engine/RaceEvents.js";
import { reshuffleRaceDeck } from "./engine/Reshuffle.js";
import { startBettingDraft } from "./betting/BettingDraft.js";
import { processRacePayouts } from "./betting/PayoutEngine.js";
import { createTicketStacks } from "./betting/TicketStacks.js";

export type GamePhase =
    | "lobby"
    | "betting"
    | "double-bet"
    | "secret-card"
    | "ready-to-race"
    | "racing"
    | "reshuffle-required"
    | "race-complete"
    | "payouts"
    | "final";

export type PauseVote = "KICK" | "WAIT";

export type DisconnectedPlayerPause = {
    playerId: string;
    playerName: string;
    disconnectedAt: number;
    deadline: number;
    kickVoterIds: string[];
    waitVoterIds: string[];
};

export type RoomPauseState = {
    manual: boolean;
    disconnectedPlayers: DisconnectedPlayerPause[];
};

export type Player = {
    /** Stable browser identity. */
    id: string;
    sessionId: string;

    /** Current Socket.IO connection. Changes after reconnecting. */
    socketId: string;
    connectionState: "connected" | "disconnected";
    lastSeen: number;

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
    hostPlayerId: string;
    hostSocketId: string;
    phase: GamePhase;
    raceNumber: number;
    shortenedBy: number;

    players: Player[];
    racers: RacerState[];
    podium: PodiumEntry[];

    raceLog: string[];
    raceEvents: RaceEvent[];
    nextRaceEventSequence: number;

    racePayoutProcessed: boolean;
    payoutSummary: RacePayoutSummary | null;

    completedRaceReplays: CompletedRaceReplay[];

    currentCard: RaceCard | null;
    deck: RaceCard[];
    discard: RaceCard[];
    availableCards: RaceCard[];

    publicRaceDeckDefinitionIds: string[];

    currentSideBet: SideBetDefinition;
    availableSideBetIds: string[];
    ticketStacks: TicketStackState[];
    bettingDraft: BettingDraftState;
    draftStartingPlayerIndex: number;

    pause: RoomPauseState;
    bannedSessionIds: string[];
    removedPlayers: Player[];

    createdAt: number;
};

export function createRoom(
    hostSocketId: string,
    hostSessionId: string,
    hostName: string,
): Room {
    return {
        roomCode: nanoid(6).toUpperCase(),
        hostPlayerId: hostSessionId,
        hostSocketId,
        phase: "lobby",
        raceNumber: 1,
        shortenedBy: 0,

        players: [createPlayer(hostSessionId, hostSocketId, hostName || "Host")],

        racers: createInitialRacers(),
        podium: [],

        raceLog: [],
        raceEvents: [],
        nextRaceEventSequence: 1,

        racePayoutProcessed: false,
        payoutSummary: null,

        completedRaceReplays: [],

        currentCard: null,
        deck: [],
        discard: [],
        availableCards: [],

        publicRaceDeckDefinitionIds: [],

        currentSideBet: SIDE_BETS[0],
        availableSideBetIds: SIDE_BETS.map((sideBet) => sideBet.id),
        ticketStacks: createTicketStacks(),
        bettingDraft: createEmptyBettingDraft(),
        draftStartingPlayerIndex: 0,

        pause: {
            manual: false,
            disconnectedPlayers: [],
        },
        bannedSessionIds: [],
        removedPlayers: [],

        createdAt: Date.now(),
    };
}

export function addPlayer(
    room: Room,
    socketId: string,
    sessionId: string,
    name: string,
): Player {
    if (room.bannedSessionIds.includes(sessionId)) {
        throw new Error("You have been banned from this room.");
    }

    const existingPlayer = room.players.find(
        (player) => player.sessionId === sessionId,
    );

    if (existingPlayer) {
        reattachPlayer(room, sessionId, socketId);
        return existingPlayer;
    }

    const removedPlayerIndex = room.removedPlayers.findIndex(
        (player) => player.sessionId === sessionId,
    );

    if (removedPlayerIndex >= 0) {
        const [restoredPlayer] = room.removedPlayers.splice(removedPlayerIndex, 1);

        restoredPlayer.socketId = socketId;
        restoredPlayer.connectionState = "connected";
        restoredPlayer.lastSeen = Date.now();
        restoredPlayer.name = name || restoredPlayer.name;
        room.players.push(restoredPlayer);
        return restoredPlayer;
    }

    if (room.players.length >= MAX_PLAYERS) {
        throw new Error("Room is full.");
    }

    if (room.phase !== "lobby") {
        throw new Error("The game has already started.");
    }

    const player = createPlayer(
        sessionId,
        socketId,
        name || `Player ${room.players.length + 1}`,
    );

    room.players.push(player);
    return player;
}

export function reattachPlayer(
    room: Room,
    sessionId: string,
    socketId: string,
): Player | null {
    const player = room.players.find(
        (candidate) => candidate.sessionId === sessionId,
    );

    if (!player) return null;

    player.socketId = socketId;
    player.connectionState = "connected";
    player.lastSeen = Date.now();

    room.pause.disconnectedPlayers = room.pause.disconnectedPlayers.filter(
        (entry) => entry.playerId !== player.id,
    );

    if (room.hostPlayerId === player.id) {
        room.hostSocketId = socketId;
    }

    return player;
}

export function markPlayerDisconnected(
    room: Room,
    socketId: string,
): Player | null {
    const player = findPlayerBySocketId(room, socketId);
    if (!player) return null;

    player.connectionState = "disconnected";
    player.lastSeen = Date.now();
    return player;
}

export function removePlayer(
    room: Room,
    playerId: string,
    options?: {
        allowRejoin?: boolean;
        ban?: boolean;
    },
): Player | null {
    const player = room.players.find((candidate) => candidate.id === playerId);

    if (!player) {
        return null;
    }

    room.players = room.players.filter((candidate) => candidate.id !== playerId);

    room.pause.disconnectedPlayers = room.pause.disconnectedPlayers.filter(
        (entry) => entry.playerId !== playerId,
    );

    if (options?.ban) {
        if (!room.bannedSessionIds.includes(player.sessionId)) {
            room.bannedSessionIds.push(player.sessionId);
        }
    } else if (options?.allowRejoin !== false) {
        room.removedPlayers = room.removedPlayers.filter(
            (candidate) => candidate.sessionId !== player.sessionId,
        );
        room.removedPlayers.push(player);
    }

    if (room.hostPlayerId === playerId && room.players.length > 0) {
        const nextHost =
            room.players.find(
                (candidate) => candidate.connectionState === "connected",
            ) ?? room.players[0];

        room.hostPlayerId = nextHost.id;
        room.hostSocketId = nextHost.socketId;
    }

    normalizeRoomAfterPlayerRemoval(room, playerId);
    return player;
}

function normalizeRoomAfterPlayerRemoval(
    room: Room,
    removedPlayerId: string,
): void {
    if (room.phase === "betting") {
        const oldOrder = room.bettingDraft.order;
        const oldTurnIndex = room.bettingDraft.turnIndex;

        const completedTurnsBeforeRemoval = oldOrder
            .slice(0, oldTurnIndex)
            .filter((playerId) => playerId !== removedPlayerId).length;

        room.bettingDraft.order = oldOrder.filter(
            (playerId) => playerId !== removedPlayerId,
        );
        room.bettingDraft.turnIndex = completedTurnsBeforeRemoval;

        if (room.bettingDraft.turnIndex >= room.bettingDraft.order.length) {
            room.bettingDraft.completed = true;
            room.bettingDraft.currentPlayerId = null;
            room.phase = room.raceNumber === 3 ? "double-bet" : "secret-card";
        } else {
            room.bettingDraft.currentPlayerId =
                room.bettingDraft.order[room.bettingDraft.turnIndex] ?? null;
        }
    }

    if (
        room.phase === "double-bet" &&
        room.players.length > 0 &&
        room.players.every((player) => player.doubledTicketId !== null)
    ) {
        room.phase = "secret-card";
    }

    if (
        room.phase === "secret-card" &&
        room.players.length > 0 &&
        room.players.every((player) => player.selectedSecretCards.length > 0)
    ) {
        room.phase = "ready-to-race";
    }
}

export function beginDisconnectedPlayerPause(
    room: Room,
    player: Player,
    gracePeriodMs: number,
): DisconnectedPlayerPause {
    const existing = room.pause.disconnectedPlayers.find(
        (entry) => entry.playerId === player.id,
    );

    if (existing) {
        return existing;
    }

    const disconnectedAt = Date.now();
    const pause: DisconnectedPlayerPause = {
        playerId: player.id,
        playerName: player.name,
        disconnectedAt,
        deadline: disconnectedAt + gracePeriodMs,
        kickVoterIds: [],
        waitVoterIds: [],
    };

    room.pause.disconnectedPlayers.push(pause);
    return pause;
}

export function setPauseVote(
    room: Room,
    voterId: string,
    disconnectedPlayerId: string,
    vote: PauseVote,
): DisconnectedPlayerPause {
    const pause = room.pause.disconnectedPlayers.find(
        (entry) => entry.playerId === disconnectedPlayerId,
    );

    if (!pause) {
        throw new Error("That player is no longer waiting to reconnect.");
    }

    if (voterId === disconnectedPlayerId) {
        throw new Error(
            "The disconnected player cannot vote on their own removal.",
        );
    }

    pause.kickVoterIds = pause.kickVoterIds.filter((id) => id !== voterId);
    pause.waitVoterIds = pause.waitVoterIds.filter((id) => id !== voterId);

    if (vote === "KICK") {
        pause.kickVoterIds.push(voterId);
    } else {
        pause.waitVoterIds.push(voterId);
    }

    return pause;
}

export function hasKickVoteMajority(
    room: Room,
    disconnectedPlayerId: string,
): boolean {
    const pause = room.pause.disconnectedPlayers.find(
        (entry) => entry.playerId === disconnectedPlayerId,
    );

    if (!pause) {
        return false;
    }

    const eligibleVoters = room.players.filter(
        (player) =>
            player.id !== disconnectedPlayerId &&
            player.connectionState === "connected",
    );

    const requiredKickVoteCount = Math.ceil(
        eligibleVoters.length / 2,
    );

    /*
     * The disconnected player is excluded. A kick succeeds when at least
     * half of the remaining connected players vote KICK, rounded up.
     *
     * Examples:
     * 3 connected players -> 2 votes required
     * 2 connected players -> 1 vote required
     * 1 connected player  -> 1 vote required
     */
    return (
        requiredKickVoteCount > 0 &&
        pause.kickVoterIds.length >= requiredKickVoteCount
    );
}

export function toggleManualPause(room: Room): void {
    room.pause.manual = !room.pause.manual;
}

export function isRoomPaused(room: Room): boolean {
    return room.pause.manual || room.pause.disconnectedPlayers.length > 0;
}

export function assertRoomNotPaused(room: Room): void {
    if (isRoomPaused(room)) {
        throw new Error("The game is currently paused.");
    }
}

export function toggleReady(room: Room, socketId: string): void {
    const player = findPlayerBySocketId(room, socketId);

    if (player) {
        player.ready = !player.ready;
        player.lastSeen = Date.now();
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
        throw new Error("Need 2-9 ready players.");
    }

    room.raceNumber = 1;

    room.draftStartingPlayerIndex = Math.floor(
        Math.random() * room.players.length,
    );

    for (const player of room.players) {
        player.raceAgain = false;
        player.money = STARTING_MONEY;
        player.hand = [];
        player.draftedTickets = [];
        player.doubledTicketId = null;
        player.selectedSecretCards = [];
    }

    room.availableSideBetIds = SIDE_BETS.map((sideBet) => sideBet.id);

    room.availableCards = createCompleteCardSupply();

    room.completedRaceReplays = [];

    setupFirstRace(room);
}

export function submitSecretCards(
    room: Room,
    socketId: string,
    cardIds: string[],
): void {
    if (room.phase !== "secret-card") {
        throw new Error("Secret-card selection is not active.");
    }

    const player = room.players.find(
        (candidate) => candidate.socketId === socketId,
    );

    if (!player) {
        throw new Error("Player not found.");
    }

    const requiredCards =
        room.players.length === 2 ? SECRET_CARDS_TWO_PLAYERS : SECRET_CARDS_OTHER;

    const uniqueCardIds = new Set(cardIds);

    const selectedCards = player.hand.filter((card) =>
        uniqueCardIds.has(card.id),
    );

    if (selectedCards.length !== requiredCards) {
        throw new Error(`Choose exactly ${requiredCards} card(s).`);
    }

    player.selectedSecretCards = selectedCards;

    if (allSecretCardsSubmitted(room)) {
        room.phase = "ready-to-race";
    }
}

export function allSecretCardsSubmitted(room: Room): boolean {
    const requiredCards =
        room.players.length === 2 ? SECRET_CARDS_TWO_PLAYERS : SECRET_CARDS_OTHER;

    return room.players.every(
        (player) => player.selectedSecretCards.length === requiredCards,
    );
}

export function beginRace(room: Room): void {
    if (room.phase !== "ready-to-race") {
        throw new Error("Not every player has submitted their secret cards.");
    }

    for (const player of room.players) {
        room.deck.push(...player.selectedSecretCards);

        const selectedIds = new Set(
            player.selectedSecretCards.map((card) => card.id),
        );

        player.hand = player.hand.filter((card) => !selectedIds.has(card.id));

        player.selectedSecretCards = [];
    }

    room.podium = [];
    const burnedCards = prepareDeckForRace(room);

    recordRaceEvent(room, {
        type: "CARDS_BURNED",

        reason: "RACE_START",

        cards: burnedCards.map((card) => ({
            id: card.id,
            definitionId: card.definitionId,
        })),
    });

    room.phase = "racing";
}

export function stepRace(room: Room): RaceCard | undefined {
    const engine = new RaceEngine(room);

    return engine.playNextCard();
}

export function reshuffleRace(room: Room): void {
    reshuffleRaceDeck(room);
}

export function confirmRaceResults(room: Room): void {
    if (room.phase !== "race-complete") {
        throw new Error("The race results are not ready to be checked.");
    }

    /*
     * Calculate payouts only after the host confirms that
     * everyone has finished watching the last card.
     */
    if (!room.racePayoutProcessed) {
        processRacePayouts(room);
    }

    archiveCompletedRaceReplay(room);

    room.phase = "payouts";
}

export function finishPayouts(room: Room): void {
    if (room.phase !== "payouts") {
        throw new Error("The race is not in the payout phase.");
    }

    if (!room.racePayoutProcessed) {
        processRacePayouts(room);
    }

    archiveCompletedRaceReplay(room);

    if (room.raceNumber >= 3) {
        room.phase = "final";
        return;
    }

    /*
     * Restore every physical card that formed the race deck:
     *
     * - room.deck contains cards that were not drawn;
     * - room.discard contains drawn cards and all burned cards.
     */
    room.deck = [...room.deck, ...room.discard];

    room.discard = [];
    room.currentCard = null;

    /*
     * The replacement private cards for the next race are
     * dealt from this existing racing deck.
     */
    shuffle(room.deck);

    room.raceNumber += 1;

    room.draftStartingPlayerIndex =
        (room.draftStartingPlayerIndex + 1) % room.players.length;

    setupFollowingRace(room);
}

export function selectRaceAgain(room: Room, socketId: string): void {
    if (room.phase !== "final") {
        throw new Error("Race-again selection is only available after the game.");
    }

    const player = room.players.find(
        (candidate) => candidate.socketId === socketId,
    );

    if (!player) {
        throw new Error("Player not found.");
    }

    player.raceAgain = true;
}

export function canRestartGame(room: Room): boolean {
    return room.players.some(
        (player) => player.id !== room.hostPlayerId && player.raceAgain,
    );
}

export function restartGame(room: Room): string[] {
    if (room.phase !== "final") {
        throw new Error("The game is not finished.");
    }

    if (!canRestartGame(room)) {
        throw new Error("At least one other player must choose Race again.");
    }

    const keptPlayers = room.players.filter(
        (player) => player.id === room.hostPlayerId || player.raceAgain,
    );

    const kickedPlayerIds = room.players
        .filter((player) => player.id !== room.hostPlayerId && !player.raceAgain)
        .map((player) => player.socketId);

    room.players = keptPlayers;

    /*
     * Return the retained players to the lobby.
     * The host must start the new game manually.
     */
    room.phase = "lobby";
    room.raceNumber = 1;
    room.shortenedBy = 0;

    room.racers = createInitialRacers();

    room.podium = [];
    room.raceLog = [];
    room.raceEvents = [];
    room.nextRaceEventSequence = 1;

    room.racePayoutProcessed = false;
    room.payoutSummary = null;

    room.completedRaceReplays = [];

    room.currentCard = null;
    room.deck = [];
    room.discard = [];
    room.availableCards = [];

    room.publicRaceDeckDefinitionIds = [];

    room.currentSideBet = SIDE_BETS[0];

    room.availableSideBetIds = SIDE_BETS.map((sideBet) => sideBet.id);

    room.ticketStacks = createTicketStacks();

    room.bettingDraft = createEmptyBettingDraft();

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

function setupFirstRace(room: Room): void {
    resetRaceBoardState(room);
    room.podium = [];

    room.deck = createInitialRaceDeck(room.players.length, room.availableCards);

    fillInitialPlayerHands(room);
    preparePreRaceDraft(room);
}

function setupFollowingRace(room: Room): void {
    /*
     * Keep the complete racing deck recovered from the
     * previous race. Do not create a new deck and do not
     * draw replacement cards from availableCards.
     */
    resetRaceBoardState(room);

    const cardsPerPlayer =
        room.players.length === 2 ? SECRET_CARDS_TWO_PLAYERS : SECRET_CARDS_OTHER;

    const requiredCardCount = room.players.length * cardsPerPlayer;

    if (room.deck.length < requiredCardCount) {
        throw new Error(
            `Cannot deal ${requiredCardCount} replacement card(s). ` +
            `The racing deck only contains ${room.deck.length}.`,
        );
    }

    /*
     * Deal replacement cards from the current racing deck.
     *
     * Standard games:
     * - each player submitted 1 card;
     * - each player now receives 1 card.
     *
     * Two-player games:
     * - each player submitted 2 cards;
     * - each player now receives 2 cards.
     */
    for (const player of room.players) {
        for (let cardIndex = 0; cardIndex < cardsPerPlayer; cardIndex++) {
            const replacementCard = room.deck.shift();

            if (!replacementCard) {
                throw new Error(`Unable to deal a replacement card to ${player.name}.`);
            }

            player.hand.push(replacementCard);
        }
    }

    preparePreRaceDraft(room);
}

function resetRaceBoardState(room: Room): void {
    room.shortenedBy = 0;

    room.racers = createInitialRacers();

    room.raceLog = [];
    room.raceEvents = [];
    room.nextRaceEventSequence = 1;

    room.racePayoutProcessed = false;
    room.payoutSummary = null;

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

function fillInitialPlayerHands(room: Room): void {
    const handSize = room.players.length === 2 ? 4 : 3;

    for (const player of room.players) {
        while (player.hand.length < handSize) {
            player.hand.push(drawRandomCardFromSupply(room.availableCards));
        }
    }
}

function preparePreRaceDraft(room: Room): void {
    room.publicRaceDeckDefinitionIds = room.deck.map((card) => card.definitionId);

    room.currentSideBet = drawRandomSideBet(room);

    room.ticketStacks = createTicketStacks();

    startBettingDraft(room, room.draftStartingPlayerIndex);
}

export function findPlayerBySocketId(
    room: Room,
    socketId: string,
): Player | null {
    return room.players.find((player) => player.socketId === socketId) ?? null;
}

function createPlayer(
    sessionId: string,
    socketId: string,
    name: string,
): Player {
    return {
        id: sessionId,
        sessionId,
        socketId,
        connectionState: "connected",
        lastSeen: Date.now(),
        name,
        ready: false,
        money: STARTING_MONEY,

        hand: [],
        selectedSecretCards: [],

        draftedTickets: [],
        doubledTicketId: null,

        raceAgain: false,
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
        finished: false,
    }));
}

function createEmptyBettingDraft(): BettingDraftState {
    return {
        order: [],
        turnIndex: 0,
        currentPlayerId: null,
        picksPerPlayer: 2,
        startingPlayerIndex: 0,
        completed: false,
    };
}

function drawRandomSideBet(room: Room): SideBetDefinition {
    if (room.availableSideBetIds.length === 0) {
        throw new Error("There are no side bets remaining.");
    }

    const randomIndex = Math.floor(
        Math.random() * room.availableSideBetIds.length,
    );

    const [selectedSideBetId] = room.availableSideBetIds.splice(randomIndex, 1);

    const selectedSideBet = SIDE_BETS.find(
        (sideBet) => sideBet.id === selectedSideBetId,
    );

    if (!selectedSideBet) {
        throw new Error(`Side bet not found: ${selectedSideBetId}`);
    }

    return selectedSideBet;
}

function archiveCompletedRaceReplay(room: Room): void {
    if (!room.payoutSummary) {
        return;
    }

    const replayAlreadyExists = room.completedRaceReplays.some(
        (replay) => replay.raceNumber === room.raceNumber,
    );

    if (replayAlreadyExists) {
        return;
    }

    const replay: CompletedRaceReplay = {
        raceNumber: room.raceNumber,

        initialRacers: createInitialRacers().map(cloneRacerState),

        events: room.raceEvents.map(cloneRaceEvent),

        podium: room.podium.map((entry) => ({
            ...entry,
        })),

        sideBet: {
            ...room.currentSideBet,
        },

        payoutSummary: {
            ...room.payoutSummary,

            playerPayouts: room.payoutSummary.playerPayouts.map((playerPayout) => ({
                ...playerPayout,

                tickets: playerPayout.tickets.map((ticket) => ({
                    ...ticket,
                })),
            })),
        },

        /*
         * Preserve the exact betting context
         * for this completed race.
         */
        players: room.players.map((player) => ({
            id: player.id,

            name: player.name,

            draftedTickets: player.draftedTickets.map((ticket) => ({
                ...ticket,
            })),

            doubledTicketId: player.doubledTicketId,
        })),
    };

    room.completedRaceReplays.push(replay);
}

function cloneRacerState(racer: RacerState): RacerState {
    return {
        ...racer,
    };
}

function cloneRaceEvent(event: RaceEvent): RaceEvent {
    if (event.type === "RACE_STATE") {
        return {
            ...event,
            racers: event.racers.map((racer) => ({
                ...racer,
            })),
        };
    }

    if (event.type === "RACE_ENDED") {
        return {
            ...event,
            podium: event.podium.map((entry) => ({
                ...entry,
            })),
        };
    }

    if (event.type === "TRACK_FOLDED") {
        return {
            ...event,
            disqualifiedRacers: [...event.disqualifiedRacers],
        };
    }

    return {
        ...event,
    };
}