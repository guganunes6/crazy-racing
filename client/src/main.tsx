import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import { Board } from "./board/Board";
import { Podium } from "./board/Podium";
import "./styles.css";
import { CardGallery } from "./components/cards/CardGallery";

const socket = io("http://localhost:3001");

const racerImages: Record<string, string> = {
    QUEEN: "/src/assets/queen.svg",
    FISH: "/src/assets/fish.svg",
    HOTDOG: "/src/assets/hotdog.svg",
    LION: "/src/assets/lion.svg"
};

function App() {
    const [room, setRoom] = useState<any>(null);
    const [privateState, setPrivateState] = useState<any>({
        hand: [],
        selectedSecretCards: []
    });
    const [playerName, setPlayerName] = useState("");
    const [roomCodeInput, setRoomCodeInput] = useState("");
    const [error, setError] = useState("");
    const [selectedCards, setSelectedCards] = useState<string[]>([]);

    React.useEffect(() => {
        socket.on("room:update", setRoom);
        socket.on("player:private", setPrivateState);

        const url = new URL(window.location.href);
        const joinCode = url.searchParams.get("room");
        if (joinCode) setRoomCodeInput(joinCode);

        return () => {
            socket.off("room:update", setRoom);
            socket.off("player:private", setPrivateState);
        };
    }, []);

    const me = useMemo(
        () => room?.players.find((p: any) => p.id === socket.id),
        [room]
    );

    function createRoom() {
        socket.emit("room:create", { playerName }, (res: any) => {
            if (!res.ok) return setError(res.error);
            window.history.pushState(null, "", `/?room=${res.roomCode}`);
            setError("");
        });
    }

    function joinRoom() {
        socket.emit(
            "room:join",
            { roomCode: roomCodeInput, playerName },
            (res: any) => {
                if (!res.ok) return setError(res.error);
                window.history.pushState(null, "", `/?room=${res.roomCode}`);
                setError("");
            }
        );
    }

    function ready() {
        socket.emit("player:ready", { roomCode: room.roomCode });
    }

    function startGame() {
        socket.emit("game:start", { roomCode: room.roomCode }, (res: any) => {
            if (!res.ok) setError(res.error);
        });
    }

    function autoDemoBetting() {
        socket.emit("betting:auto-demo", { roomCode: room.roomCode });
    }

    function toggleCard(cardId: string) {
        setSelectedCards((current) =>
            current.includes(cardId)
                ? current.filter((id) => id !== cardId)
                : [...current, cardId]
        );
    }

    function submitSecretCards() {
        socket.emit(
            "secret:submit",
            { roomCode: room.roomCode, cardIds: selectedCards },
            (res: any) => {
                if (!res.ok) setError(res.error);
                else {
                    setSelectedCards([]);
                    setError("");
                }
            }
        );
    }

    function stepRace() {
        socket.emit("race:step", { roomCode: room.roomCode });
    }

    function continuePayouts() {
        socket.emit("payouts:continue", { roomCode: room.roomCode });
    }

    if (!room) {
        return (
            <main className="page center">
                <div className="card menu">
                    <h1>CRAZY RACING</h1>
                    <p>Private multiplayer chaos racing game.</p>

                    <input
                        placeholder="Your name"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                    />

                    <button onClick={createRoom}>Create Room</button>

                    <button onClick={joinRoom}>Join Room</button>

                    <input
                        placeholder="Room code"
                        value={roomCodeInput}
                        onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    />

                    {error && <p className="error">{error}</p>}
                </div>
            </main>
        );
    }

    return (
        <main className="page">
            <header className="topbar">
                <h1>CRAZY RACING</h1>

                <div>
                    Room: <strong>{room.roomCode}</strong>
                    <button
                        onClick={() =>
                            navigator.clipboard.writeText(
                                `${window.location.origin}/?room=${room.roomCode}`
                            )
                        }
                    >
                        Copy Link
                    </button>
                </div>
            </header>

            {error && <p className="error">{error}</p>}

            <section className="layout">
                <aside className="card">
                    <h2>Players</h2>

                    {room.players.map((p: any) => (
                        <div className="player" key={p.id}>
                            <span>
                                {p.name} {p.id === socket.id ? "(you)" : ""}
                            </span>
                            <span>${p.money}</span>
                            <span>{p.ready ? "Ready" : "Not ready"}</span>
                        </div>
                    ))}

                    {room.phase === "lobby" && (
                        <>
                            <button onClick={ready}>{me?.ready ? "Unready" : "Ready"}</button>

                            {room.hostSocketId === socket.id && (
                                <button onClick={startGame}>Start Game</button>
                            )}
                        </>
                    )}
                </aside>

                <section className="card mainpanel">
                    <h2>
                        Race {room.raceNumber} — {room.phase.toUpperCase()}
                    </h2>

                    {room.phase === "betting" && (
                        <div>
                            <CardGallery />

                            {room.hostSocketId === socket.id && (
                                <button onClick={autoDemoBetting}>
                                    Continue with demo betting
                                </button>
                            )}
                        </div>
                    )}

                    {room.phase === "secret-card" && (
                        <div>
                            <h3>Your hand</h3>

                            <div className="cards">
                                {privateState.hand.map((card: any) => (
                                    <button
                                        key={card.id}
                                        className={
                                            selectedCards.includes(card.id)
                                                ? "gamecard selected"
                                                : "gamecard"
                                        }
                                        onClick={() => toggleCard(card.id)}
                                    >
                                        <strong>{card.racer}</strong>
                                        <span>{card.type}</span>
                                        {card.value && <span>{card.value}</span>}
                                    </button>
                                ))}
                            </div>

                            <button onClick={submitSecretCards}>Submit Secret Card(s)</button>
                        </div>
                    )}

                    {room.phase === "racing" && (
                        <div>
                            <div className="raceDeckStatus">
                                Racing deck:{" "}
                                <strong>{room.deckRemaining ?? 0} cards remaining</strong>
                            </div>

                            <Board
                                racers={room.racers}
                                shortenedBy={room.shortenedBy ?? 0}
                            />

                            <CurrentCard card={room.currentCardDisplay} />

                            <button onClick={stepRace}>
                                Flip Next Card
                            </button>
                        </div>
                    )}

                    {room.phase === "payouts" && (
                        <div>
                            <h3>Race Finished</h3>

                            {room.hostSocketId === socket.id && (
                                <button onClick={continuePayouts}>Continue</button>
                            )}
                        </div>
                    )}

                    {room.phase === "final" && (
                        <div>
                            <h3>Final Results</h3>

                            {[...room.players]
                                .sort((a: any, b: any) => b.money - a.money)
                                .map((p: any, index: number) => (
                                    <div className="result" key={p.id}>
                                        #{index + 1} {p.name} — ${p.money}
                                    </div>
                                ))}
                        </div>
                    )}
                </section>

                <aside className="card">
                    <h2>Racers</h2>

                    <div className="racers">
                        {["LION", "HOTDOG", "FISH", "QUEEN"].map((name) => (
                            <div key={name} className="racerBadge">
                                <img src={racerImages[name]} />
                                <strong>{name}</strong>
                            </div>
                        ))}
                    </div>

                    <Podium podium={room.podium ?? []} />

                    <h2>Race Log</h2>

                    <div className="log">
                        {room.raceLog.map((line: string, i: number) => (
                            <p key={i}>{line}</p>
                        ))}
                    </div>
                </aside>
            </section>
        </main>
    );
}

type CurrentCardDisplay = {
    owner: string;
    name: string;
    fullName: string;
};

function CurrentCard({
    card
}: {
    card: CurrentCardDisplay | null;
}) {
    if (!card) {
        return (
            <div className="currentCard">
                No card has been drawn yet.
            </div>
        );
    }

    return (
        <div className="currentCard">
            <span>Last card drawn</span>
            <strong>{card.fullName}</strong>
        </div>
    );
}

createRoot(document.getElementById("root")!).render(<App />);