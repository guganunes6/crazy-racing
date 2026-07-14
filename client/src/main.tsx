import React, {
    useEffect,
    useMemo,
    useState
} from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import {
    getLifeOutcome,
    type BetRiskSide,
    type CompletedRaceReplay,
    type DraftedBetTicket,
    type RaceCard,
    type RaceEvent,
    type RacerState,
    type TicketStackKey
} from "@crazy-racing/shared";

import { Board } from "./board/Board";
import { Podium } from "./board/Podium";
import { BettingPhase } from "./components/betting/BettingPhase";
import { CurrentSideBetCard } from "./components/betting/CurrentSideBetCard";
import { DraftedTicketChoice } from "./components/betting/DraftedTicketChoice";
import { DraftedTicketIcon } from "./components/betting/DraftedTicketIcon";
import { PayoutSummary } from "./components/betting/PayoutSummary";
import { PrivateHand } from "./components/cards/PrivateHand";
import { PublicRaceDeck } from "./components/cards/PublicRaceDeck";
import { RaceReplay } from "./components/replay/RaceReplay";
import { useRaceAnimation } from "./animation/useRaceAnimation";

import "./styles.css";

const socket = io("http://localhost:3001");

const racerImages: Record<string, string> = {
    LION: "/src/assets/lion.svg",
    HOTDOG: "/src/assets/hotdog.svg",
    FISH: "/src/assets/fish.svg",
    QUEEN: "/src/assets/queen.svg"
};

type SocketResponse = {
    ok: boolean;
    error?: string;
    roomCode?: string;
};

type CurrentCardDisplay = {
    owner: string;
    name: string;
    fullName: string;
};

type PrivatePlayerState = {
    hand: RaceCard[];
    selectedSecretCards: RaceCard[];
};

type RoomKickedPayload = {
    reason?: string;
};

function App() {
    const [room, setRoom] = useState<any>(null);

    const [privateState, setPrivateState] =
        useState<PrivatePlayerState>({
            hand: [],
            selectedSecretCards: []
        });

    const [playerName, setPlayerName] = useState("");
    const [roomCodeInput, setRoomCodeInput] = useState("");
    const [error, setError] = useState("");
    const [selectedCards, setSelectedCards] = useState<string[]>([]);

    const [
        selectedDoubledTicketId,
        setSelectedDoubledTicketId
    ] = useState<string | null>(null);

    const [
        activeReplay,
        setActiveReplay
    ] = useState<CompletedRaceReplay | null>(null);

    useEffect(() => {
        function handleRoomUpdate(updatedRoom: any) {
            setRoom(updatedRoom);
        }

        function handlePrivateState(
            updatedPrivateState: PrivatePlayerState
        ) {
            setPrivateState(updatedPrivateState);
        }

        function handleRoomKicked(
            payload: RoomKickedPayload
        ) {
            setRoom(null);

            setPrivateState({
                hand: [],
                selectedSecretCards: []
            });

            setSelectedCards([]);

            setError(
                payload.reason ??
                "You are no longer in the room."
            );

            window.history.pushState(
                null,
                "",
                window.location.pathname
            );
        }

        socket.on("room:update", handleRoomUpdate);
        socket.on("player:private", handlePrivateState);
        socket.on("room:kicked", handleRoomKicked);

        const url = new URL(window.location.href);
        const joinCode = url.searchParams.get("room");

        if (joinCode) {
            setRoomCodeInput(joinCode.toUpperCase());
        }

        return () => {
            socket.off("room:update", handleRoomUpdate);
            socket.off("player:private", handlePrivateState);
            socket.off("room:kicked", handleRoomKicked);
        };
    }, []);

    useEffect(() => {
        if (
            activeReplay &&
            room?.phase !== "payouts" &&
            room?.phase !== "final"
        ) {
            setActiveReplay(null);
        }
    }, [
        activeReplay,
        room?.phase
    ]);

    const me = useMemo(() => {
        return room?.players.find(
            (player: any) => player.id === socket.id
        );
    }, [room]);

    const currentDraftPlayer = useMemo(() => {
        const currentPlayerId =
            room?.bettingDraft?.currentPlayerId;

        if (!currentPlayerId) {
            return null;
        }

        return (
            room.players.find(
                (player: any) =>
                    player.id === currentPlayerId
            ) ?? null
        );
    }, [room]);

    const currentRaceReplay =
        useMemo(() => {
            const replays:
                CompletedRaceReplay[] =
                room?.completedRaceReplays ??
                [];

            return (
                replays.find(
                    (replay) =>
                        replay.raceNumber ===
                        room?.raceNumber
                ) ?? null
            );
        }, [
            room?.completedRaceReplays,
            room?.raceNumber
        ]);

    const isHost =
        room?.hostSocketId === socket.id;

    const {
        visualRacers,
        activeEvent,
        activeCardOwner,
        isAnimating
    } = useRaceAnimation({
        racers: (room?.racers ?? []) as RacerState[],
        raceEvents: (room?.raceEvents ?? []) as RaceEvent[],
        raceNumber: room?.raceNumber ?? 0,
        enabled:
            room?.phase === "racing" ||
            room?.phase === "reshuffle-required"
    });

    function handleSocketResponse(
        response: SocketResponse
    ): boolean {
        if (!response.ok) {
            setError(
                response.error ??
                "An unknown error occurred."
            );

            return false;
        }

        setError("");
        return true;
    }

    function createRoom() {
        socket.emit(
            "room:create",
            {
                playerName: playerName.trim()
            },
            (response: SocketResponse) => {
                if (!handleSocketResponse(response)) {
                    return;
                }

                if (response.roomCode) {
                    window.history.pushState(
                        null,
                        "",
                        `/?room=${response.roomCode}`
                    );
                }
            }
        );
    }

    function joinRoom() {
        socket.emit(
            "room:join",
            {
                roomCode:
                    roomCodeInput.trim().toUpperCase(),
                playerName: playerName.trim()
            },
            (response: SocketResponse) => {
                if (!handleSocketResponse(response)) {
                    return;
                }

                if (response.roomCode) {
                    window.history.pushState(
                        null,
                        "",
                        `/?room=${response.roomCode}`
                    );
                }
            }
        );
    }

    function toggleReady() {
        if (!room) {
            return;
        }

        socket.emit("player:ready", {
            roomCode: room.roomCode
        });
    }

    function startGame() {
        if (!room) {
            return;
        }

        socket.emit(
            "game:start",
            {
                roomCode: room.roomCode
            },
            (response: SocketResponse) => {
                handleSocketResponse(response);
            }
        );
    }

    function confirmBettingDraft(
        stack: TicketStackKey,
        risk: BetRiskSide
    ) {
        if (!room) {
            return;
        }

        socket.emit(
            "betting:confirm",
            {
                roomCode: room.roomCode,
                stack,
                risk
            },
            (response: SocketResponse) => {
                handleSocketResponse(response);
            }
        );
    }

    function confirmDoubledTicket(
        ticketId: string
    ) {
        if (!room) {
            return;
        }

        socket.emit(
            "betting:double",
            {
                roomCode: room.roomCode,
                ticketId
            },
            (response: SocketResponse) => {
                handleSocketResponse(response);
            }
        );
    }

    function toggleCard(cardId: string) {
        if (me?.secretCardsSubmitted) {
            return;
        }

        setSelectedCards((current) => {
            if (current.includes(cardId)) {
                return current.filter(
                    (selectedId) =>
                        selectedId !== cardId
                );
            }

            return [...current, cardId];
        });
    }

    function submitSecretCards() {
        if (!room) {
            return;
        }

        socket.emit(
            "secret:submit",
            {
                roomCode: room.roomCode,
                cardIds: selectedCards
            },
            (response: SocketResponse) => {
                if (!handleSocketResponse(response)) {
                    return;
                }

                setSelectedCards([]);
            }
        );
    }

    function startRace() {
        if (!room) {
            return;
        }

        socket.emit(
            "race:start",
            {
                roomCode: room.roomCode
            },
            (response: SocketResponse) => {
                handleSocketResponse(response);
            }
        );
    }

    function stepRace() {
        if (!room) {
            return;
        }

        socket.emit(
            "race:step",
            {
                roomCode: room.roomCode
            },
            (response: SocketResponse) => {
                handleSocketResponse(response);
            }
        );
    }

    function reshuffleRaceDeck() {
        if (!room) {
            return;
        }

        socket.emit(
            "race:reshuffle",
            {
                roomCode: room.roomCode
            },
            (response: SocketResponse) => {
                handleSocketResponse(response);
            }
        );
    }

    function continueAfterPayouts() {
        if (!room) {
            return;
        }

        socket.emit("payouts:continue", {
            roomCode: room.roomCode
        });
    }

    function selectRaceAgain() {
        if (!room) {
            return;
        }

        socket.emit(
            "final:race-again",
            {
                roomCode: room.roomCode
            },
            (response: SocketResponse) => {
                handleSocketResponse(response);
            }
        );
    }

    function restartGame() {
        if (!room) {
            return;
        }

        socket.emit(
            "final:restart",
            {
                roomCode: room.roomCode
            },
            (response: SocketResponse) => {
                handleSocketResponse(response);
            }
        );
    }

    function copyRoomLink() {
        if (!room) {
            return;
        }

        const roomLink =
            `${window.location.origin}/?room=${room.roomCode}`;

        navigator.clipboard
            .writeText(roomLink)
            .catch(() => {
                setError(
                    "Could not copy the room link."
                );
            });
    }

    if (!room) {
        return (
            <main className="page center">
                <div className="card menu">
                    <h1>CRAZY RACING</h1>

                    <p>
                        Create a racing room or join an
                        existing one.
                    </p>

                    <input
                        type="text"
                        placeholder="Your name"
                        value={playerName}
                        onChange={(event) =>
                            setPlayerName(
                                event.target.value
                            )
                        }
                    />

                    <button
                        type="button"
                        onClick={createRoom}
                        disabled={!playerName.trim()}
                    >
                        Create Room
                    </button>

                    <button
                        type="button"
                        onClick={joinRoom}
                        disabled={
                            !playerName.trim() ||
                            !roomCodeInput.trim()
                        }
                    >
                        Join Room
                    </button>

                    <input
                        type="text"
                        placeholder="Room code"
                        value={roomCodeInput}
                        onChange={(event) =>
                            setRoomCodeInput(
                                event.target.value.toUpperCase()
                            )
                        }
                    />

                    {error && (
                        <p className="error">
                            {error}
                        </p>
                    )}
                </div>
            </main>
        );
    }

    return (
        <main className="page">
            <header className="topbar">
                <h1>CRAZY RACING</h1>

                <div className="roomInformation">
                    <span>
                        Room:{" "}
                        <strong>
                            {room.roomCode}
                        </strong>
                    </span>

                    <button
                        type="button"
                        onClick={copyRoomLink}
                    >
                        Copy Link
                    </button>
                </div>
            </header>

            {error && (
                <p className="error">
                    {error}
                </p>
            )}

            <section className="layout">
                <aside className="card playersPanel">
                    <h2>Players</h2>

                    <div className="playersList">
                        {room.players.map(
                            (player: any) => (
                                <div
                                    className={[
                                        "player",
                                        room.bettingDraft
                                            ?.currentPlayerId ===
                                            player.id
                                            ? "playerCurrentDrafter"
                                            : ""
                                    ]
                                        .filter(Boolean)
                                        .join(" ")}
                                    key={player.id}
                                >
                                    <div className="playerMainInformation">
                                        <span className="playerName">
                                            {player.name}
                                            {player.id ===
                                                socket.id
                                                ? " (you)"
                                                : ""}
                                        </span>

                                        <span className="playerMoney">
                                            ${player.money}
                                        </span>
                                    </div>

                                    {room.phase ===
                                        "lobby" && (
                                            <span
                                                className={
                                                    player.ready
                                                        ? "playerReady"
                                                        : "playerNotReady"
                                                }
                                            >
                                                {player.ready
                                                    ? "Ready"
                                                    : "Not ready"}
                                            </span>
                                        )}

                                    {player.secretCardsSubmitted && (
                                        <span className="secretSubmissionStatus">
                                            Secret card submitted
                                        </span>
                                    )}

                                    {player.raceAgain && (
                                        <span className="raceAgainStatus">
                                            Race again selected
                                        </span>
                                    )}

                                    <div className="playerDraftedTickets">
                                        {player.draftedTickets.map(
                                            (
                                                ticket:
                                                    DraftedBetTicket
                                            ) => (
                                                <DraftedTicketIcon
                                                    key={ticket.id}
                                                    ticket={ticket}
                                                />
                                            )
                                        )}
                                    </div>
                                </div>
                            )
                        )}
                    </div>

                    {room.phase === "lobby" && (
                        <div className="lobbyControls">
                            <button
                                type="button"
                                onClick={toggleReady}
                            >
                                {me?.ready
                                    ? "Unready"
                                    : "Ready"}
                            </button>

                            {isHost && (
                                <button
                                    type="button"
                                    onClick={startGame}
                                >
                                    Start Game
                                </button>
                            )}
                        </div>
                    )}
                </aside>

                <section className="card mainpanel">
                    <h2>
                        Race {room.raceNumber} -{" "}
                        {formatPhaseName(
                            room.phase
                        )}
                    </h2>

                    {room.phase === "betting" && (
                        <BettingPhase
                            socketPlayerId={socket.id}
                            currentPlayerName={
                                currentDraftPlayer
                                    ?.name ?? null
                            }
                            draft={
                                room.bettingDraft
                            }
                            availableTickets={
                                room.availableTickets
                            }
                            currentSideBet={
                                room.currentSideBet
                            }
                            publicDeckDefinitionIds={
                                room.publicRaceDeckDefinitionIds
                            }
                            privateHand={
                                privateState.hand
                            }
                            onConfirmDraft={
                                confirmBettingDraft
                            }
                        />
                    )}

                    {room.phase === "double-bet" && (
                        <section className="doubleBetPhase">
                            <h3>
                                Choose one betting ticket to double
                            </h3>

                            <p>
                                The selected ticket's positive or negative
                                payout will be multiplied by two.
                            </p>

                            {me?.doubledTicketId ? (
                                <p className="phaseConfirmation">
                                    Your doubled betting ticket is confirmed.
                                </p>
                            ) : (
                                <>
                                    <div className="doubleBetFullChoices">
                                        {me?.draftedTickets.map(
                                            (ticket: DraftedBetTicket) => (
                                                <DraftedTicketChoice
                                                    key={ticket.id}
                                                    ticket={ticket}
                                                    currentSideBet={
                                                        room.currentSideBet
                                                    }
                                                    selected={
                                                        selectedDoubledTicketId ===
                                                        ticket.id
                                                    }
                                                    onSelect={() =>
                                                        setSelectedDoubledTicketId(
                                                            ticket.id
                                                        )
                                                    }
                                                />
                                            )
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        disabled={
                                            selectedDoubledTicketId === null
                                        }
                                        onClick={() => {
                                            if (
                                                selectedDoubledTicketId === null
                                            ) {
                                                return;
                                            }

                                            confirmDoubledTicket(
                                                selectedDoubledTicketId
                                            );

                                            setSelectedDoubledTicketId(null);
                                        }}
                                    >
                                        Confirm x2 betting ticket
                                    </button>
                                </>
                            )}
                        </section>
                    )}

                    {room.phase === "secret-card" && (
                        <section className="secretCardPhase">
                            <PublicRaceDeck
                                definitionIds={
                                    room.publicRaceDeckDefinitionIds
                                }
                            />

                            <PrivateHand
                                cards={privateState.hand}
                                selectedCardIds={selectedCards}
                                selectable={
                                    !me?.secretCardsSubmitted
                                }
                                disabled={Boolean(
                                    me?.secretCardsSubmitted
                                )}
                                onToggleCard={toggleCard}
                            />

                            {!me?.secretCardsSubmitted && (
                                <button
                                    type="button"
                                    onClick={submitSecretCards}
                                >
                                    Confirm secret card(s)
                                </button>
                            )}

                            {me?.secretCardsSubmitted && (
                                <p className="phaseConfirmation">
                                    Your secret-card selection has been submitted.
                                    Waiting for the other players.
                                </p>
                            )}
                        </section>
                    )}

                    {room.phase ===
                        "ready-to-race" && (
                            <section className="readyToRacePhase">
                                <h3>
                                    All players submitted
                                    their secret cards
                                </h3>

                                {isHost ? (
                                    <button
                                        type="button"
                                        className="startRaceButton"
                                        onClick={startRace}
                                    >
                                        START RACE!!!
                                    </button>
                                ) : (
                                    <p>
                                        Waiting for the room host
                                        to start the race.
                                    </p>
                                )}
                            </section>
                        )}

                    {(
                        room.phase === "racing" ||
                        room.phase ===
                        "reshuffle-required"
                    ) && (
                            <section className="racePhase">
                                <Board
                                    racers={visualRacers}
                                    shortenedBy={
                                        room.shortenedBy ?? 0
                                    }
                                    remainingCards={room.deckRemaining ?? 0}
                                    activeEvent={activeEvent}
                                    activeCardOwner={activeCardOwner}
                                    isAnimating={isAnimating}
                                />

                                <CurrentCard
                                    card={
                                        room.currentCardDisplay
                                    }
                                />

                                {isHost && (
                                    <div className="raceControls">
                                        {room.phase ===
                                            "racing" && (
                                                <button
                                                    type="button"
                                                    onClick={stepRace}
                                                    disabled={isAnimating}
                                                >
                                                    Flip next card
                                                </button>
                                            )}

                                        {room.phase ===
                                            "reshuffle-required" && (
                                                <button
                                                    type="button"
                                                    className="reshuffleButton"
                                                    onClick={
                                                        reshuffleRaceDeck
                                                    }
                                                    disabled={isAnimating}
                                                >
                                                    Reshuffle race card
                                                    deck
                                                </button>
                                            )}
                                    </div>
                                )}

                                {!isHost && (
                                    <p className="hostControlMessage">
                                        The room host controls the
                                        racing deck.
                                    </p>
                                )}
                            </section>
                        )}

                    {room.phase === "payouts" && (
                        <section className="payoutPhase">
                            {activeReplay ? (
                                <RaceReplay
                                    replay={activeReplay}
                                    onExit={() =>
                                        setActiveReplay(
                                            null
                                        )
                                    }
                                />
                            ) : (
                                <>
                                    {room.payoutSummary ? (
                                        <PayoutSummary
                                            summary={
                                                room.payoutSummary
                                            }
                                            currentPlayerId={
                                                socket.id
                                            }
                                        />
                                    ) : (
                                        <p>
                                            Calculating race payouts...
                                        </p>
                                    )}

                                        {currentRaceReplay && (
                                            <button
                                                type="button"
                                                className="replayRaceButton"
                                                onClick={() =>
                                                    setActiveReplay(
                                                        currentRaceReplay
                                                    )
                                                }
                                            >
                                                Replay race
                                            </button>
                                        )}

                                    {isHost &&
                                        room.payoutSummary && (
                                            <button
                                                type="button"
                                                onClick={
                                                    continueAfterPayouts
                                                }
                                            >
                                                {room.raceNumber >= 3
                                                    ? "Show final ranking"
                                                    : "Continue to next race"}
                                            </button>
                                        )}

                                    {!isHost && (
                                        <p className="hostControlMessage">
                                            Waiting for the room host
                                            to continue.
                                        </p>
                                    )}
                                </>
                            )}
                        </section>
                    )}

                    {room.phase === "final" && (
                        <section className="finalPhase">
                            {activeReplay ? (
                                <RaceReplay
                                    replay={activeReplay}
                                    onExit={() =>
                                        setActiveReplay(null)
                                    }
                                />
                            ) : (
                                <>
                                    <h3>Final Results</h3>

                                    {[...room.players]
                                        .sort(
                                            (
                                                first: any,
                                                second: any
                                            ) =>
                                                second.money -
                                                first.money
                                        )
                                        .map(
                                            (
                                                player: any,
                                                index: number
                                            ) => {
                                                const lifeOutcome =
                                                    getLifeOutcome(
                                                        player.money
                                                    );

                                                return (
                                                    <article
                                                        className="finalResultCard"
                                                        key={player.id}
                                                    >
                                                        <div className="finalResultRanking">
                                                            <span>
                                                                #{index + 1}
                                                            </span>

                                                            <div>
                                                                <strong>
                                                                    {player.name}
                                                                </strong>

                                                                <span className="finalResultMoney">
                                                                    ${player.money}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="lifeOutcome">
                                                            <strong>
                                                                Life outcome{" "}
                                                                {lifeOutcome.amountLabel}
                                                            </strong>

                                                            <p>
                                                                {lifeOutcome.text}
                                                            </p>
                                                        </div>
                                                    </article>
                                                );
                                            }
                                        )}

                                    <section className="finalReplayHistory">
                                        <div className="finalReplayHistoryHeader">
                                            <div>
                                                <span>
                                                    Race history
                                                </span>

                                                <h3>
                                                    Replay completed races
                                                </h3>
                                            </div>

                                            <p>
                                                Choose any race to replay it
                                                independently.
                                            </p>
                                        </div>

                                        <div className="finalReplayButtons">
                                            {(
                                                room.completedRaceReplays ??
                                                []
                                            )
                                                .slice()
                                                .sort(
                                                    (
                                                        first:
                                                            CompletedRaceReplay,
                                                        second:
                                                            CompletedRaceReplay
                                                    ) =>
                                                        first.raceNumber -
                                                        second.raceNumber
                                                )
                                                .map(
                                                    (
                                                        replay:
                                                            CompletedRaceReplay
                                                    ) => (
                                                        <button
                                                            type="button"
                                                            key={
                                                                replay.raceNumber
                                                            }
                                                            className="finalReplayButton"
                                                            onClick={() =>
                                                                setActiveReplay(
                                                                    replay
                                                                )
                                                            }
                                                        >
                                                            <span>
                                                                Race{" "}
                                                                {replay.raceNumber}
                                                            </span>

                                                            <strong>
                                                                Replay race
                                                            </strong>
                                                        </button>
                                                    )
                                                )}
                                        </div>

                                        {(
                                            room.completedRaceReplays ??
                                            []
                                        ).length === 0 && (
                                                <p className="finalReplayUnavailable">
                                                    No race replays are available.
                                                </p>
                                            )}
                                    </section>

                                    <div className="raceAgainControls">
                                        <button
                                            type="button"
                                            onClick={selectRaceAgain}
                                            disabled={Boolean(
                                                me?.raceAgain
                                            )}
                                        >
                                            {me?.raceAgain
                                                ? "Race again selected"
                                                : "Race again!"}
                                        </button>

                                        {isHost && (
                                            <button
                                                type="button"
                                                className="restartGameButton"
                                                onClick={restartGame}
                                                disabled={
                                                    !room.canRestartGame
                                                }
                                            >
                                                Restart game
                                            </button>
                                        )}
                                    </div>

                                    <div className="raceAgainPlayers">
                                        <strong>
                                            Players racing again:
                                        </strong>

                                        {room.players
                                            .filter(
                                                (player: any) =>
                                                    player.id ===
                                                    room.hostSocketId ||
                                                    player.raceAgain
                                            )
                                            .map(
                                                (player: any) => (
                                                    <span
                                                        key={player.id}
                                                    >
                                                        {player.name}
                                                    </span>
                                                )
                                            )}
                                    </div>
                                </>
                            )}
                        </section>
                    )}
                </section>

                <aside className="card racersPanel">
                    <h2>Racers</h2>

                    <div className="racers">
                        {[
                            "LION",
                            "HOTDOG",
                            "FISH",
                            "QUEEN"
                        ].map((name) => (
                            <div
                                key={name}
                                className={
                                    `racerBadge ` +
                                    `racerBadge${name}`
                                }
                            >
                                <img
                                    src={
                                        racerImages[name]
                                    }
                                    alt={name}
                                />

                                <strong>
                                    {name}
                                </strong>
                            </div>
                        ))}
                    </div>

                    <Podium
                        podium={
                            room.podium ?? []
                        }
                    />

                    {room.currentSideBet &&
                        room.phase !== "lobby" && (
                            <CurrentSideBetCard
                                sideBet={
                                    room.currentSideBet
                                }
                            />
                        )}

                    <h2>Race Log</h2>

                    <div className="log">
                        {room.raceLog.length ===
                            0 ? (
                            <p>
                                No race events yet.
                            </p>
                        ) : (
                            room.raceLog.map(
                                (
                                    line: string,
                                    index: number
                                ) => (
                                    <p
                                        key={`${index}-${line}`}
                                    >
                                        {line}
                                    </p>
                                )
                            )
                        )}
                    </div>
                </aside>
            </section>
        </main>
    );
}

function CurrentCard({
    card
}: {
    card: CurrentCardDisplay | null;
}) {
    if (!card) {
        return (
            <div className="currentCard">
                <span>
                    Last card drawn
                </span>

                <strong>
                    No card has been drawn yet
                </strong>
            </div>
        );
    }

    return (
        <div className="currentCard">
            <span>
                Last card drawn
            </span>

            <strong>
                {card.fullName}
            </strong>
        </div>
    );
}

function formatPhaseName(
    phase: string
) {
    return phase
        .replace(/-/g, " ")
        .toUpperCase();
}

createRoot(
    document.getElementById(
        "root"
    )!
).render(<App />);