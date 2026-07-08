import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import "./styles.css";

const socket = io("http://localhost:3001");

const racerImages = {
  QUEEN: "/src/assets/queen.svg",
  FISH: "/src/assets/fish.svg",
  HOTDOG: "/src/assets/hotdog.svg",
  LION: "/src/assets/lion.svg"
};

const TRACK_SPACES = 14;
const START_POSITION = 2;
const FINISH_POSITION = 12;
const STAR_SPACES = [0, 7, 11, 13];

function App() {
  const [room, setRoom] = useState(null);
  const [privateState, setPrivateState] = useState({ hand: [], selectedSecretCards: [] });
  const [playerName, setPlayerName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [error, setError] = useState("");
  const [selectedCards, setSelectedCards] = useState([]);

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

  const me = useMemo(() => room?.players.find((p) => p.id === socket.id), [room]);

  function createRoom() {
    socket.emit("room:create", { playerName }, (res) => {
      if (!res.ok) return setError(res.error);
      window.history.pushState(null, "", `/?room=${res.roomCode}`);
      setError("");
    });
  }

  function joinRoom() {
    socket.emit("room:join", { roomCode: roomCodeInput, playerName }, (res) => {
      if (!res.ok) return setError(res.error);
      window.history.pushState(null, "", `/?room=${res.roomCode}`);
      setError("");
    });
  }

  function ready() {
    socket.emit("player:ready", { roomCode: room.roomCode });
  }

  function startGame() {
    socket.emit("game:start", { roomCode: room.roomCode }, (res) => {
      if (!res.ok) setError(res.error);
    });
  }

  function autoDemoBetting() {
    socket.emit("betting:auto-demo", { roomCode: room.roomCode });
  }

  function toggleCard(cardId) {
    setSelectedCards((current) =>
      current.includes(cardId)
        ? current.filter((id) => id !== cardId)
        : [...current, cardId]
    );
  }

  function submitSecretCards() {
    socket.emit("secret:submit", { roomCode: room.roomCode, cardIds: selectedCards }, (res) => {
      if (!res.ok) setError(res.error);
      else {
        setSelectedCards([]);
        setError("");
      }
    });
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

          <div className="separator">or</div>

          <input
            placeholder="Room code"
            value={roomCodeInput}
            onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
          />
          <button onClick={joinRoom}>Join Room</button>

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
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/?room=${room.roomCode}`)}
          >
            Copy Link
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="layout">
        <aside className="card">
          <h2>Players</h2>
          {room.players.map((p) => (
            <div className="player" key={p.id}>
              <span>{p.name} {p.id === socket.id ? "(you)" : ""}</span>
              <span>${p.money}</span>
              <span>{p.ready ? "Ready" : "Not ready"}</span>
            </div>
          ))}

          {room.phase === "lobby" && (
            <>
              <button onClick={ready}>{me?.ready ? "Unready" : "Ready"}</button>
              {room.hostSocketId === socket.id && <button onClick={startGame}>Start Game</button>}
            </>
          )}
        </aside>

        <section className="card mainpanel">
          <h2>Race {room.raceNumber} — {room.phase.toUpperCase()}</h2>

          {room.phase === "betting" && (
            <div>
              <p>This starter version auto-assigns demo bets. The full ticket draft is the next feature.</p>
              {room.hostSocketId === socket.id && (
                <button onClick={autoDemoBetting}>Auto Assign Demo Bets</button>
              )}
            </div>
          )}

          {room.phase === "secret-card" && (
            <div>
              <h3>Your hand</h3>
              <div className="cards">
                {privateState.hand.map((card) => (
                  <button
                    key={card.id}
                    className={selectedCards.includes(card.id) ? "gamecard selected" : "gamecard"}
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
              <Track racers={room.racers} />
              <CurrentCard card={room.currentCard} />
              <button onClick={stepRace}>Flip Next Card</button>
            </div>
          )}

          {room.phase === "payouts" && (
            <div>
              <h3>Podium</h3>
              <Podium podium={room.podium} />
              {room.hostSocketId === socket.id && <button onClick={continuePayouts}>Continue</button>}
            </div>
          )}

          {room.phase === "final" && (
            <div>
              <h3>Final Results</h3>
              {[...room.players]
                .sort((a, b) => b.money - a.money)
                .map((p, index) => (
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
            {["QUEEN", "FISH", "HOTDOG", "LION"].map((name) => (
              <div key={name} className="racerBadge">
                <img src={racerImages[name]} />
                <strong>{name}</strong>
              </div>
            ))}
          </div>

          <h2>Race Log</h2>
          <div className="log">
            {room.raceLog.map((line, i) => <p key={i}>{line}</p>)}
          </div>
        </aside>
      </section>
    </main>
  );
}

function Track({ racers }) {
    return (
        <div className="track">
            <div
                className="finishLine"
                style={{ left: `${(FINISH_POSITION / (TRACK_SPACES - 1)) * 100}%` }}
            />

            <div
                className="startLine"
                style={{ left: `${(START_POSITION / (TRACK_SPACES - 1)) * 100}%` }}
            />

            {racers.map((racer) => (
                <div className="lane" key={racer.name}>
                    {Array.from({ length: TRACK_SPACES }).map((_, index) => (
                        <div
                            key={index}
                            className={`spaceMarker ${index % 4 === 0 ? "longMarker" : "smallMarker"
                                }`}
                            style={{ left: `${(index / (TRACK_SPACES - 1)) * 100}%` }}
                        >
                            {STAR_SPACES.includes(index) && <span className="star">★</span>}
                        </div>
                    ))}

                    <img
                        className={`racerToken ${racer.fallen ? "fallen" : ""} ${racer.dq ? "dq" : ""
                            }`}
                        src={racerImages[racer.name]}
                        style={{
                            left: `${(Math.min(Math.max(racer.position, 0), TRACK_SPACES - 1) /
                                    (TRACK_SPACES - 1)) *
                                100
                                }%`
                        }}
                    />

                    <span className="laneName">{racer.name}</span>
                </div>
            ))}
        </div>
    );
}

function CurrentCard({ card }) {
  if (!card) return <p>No card flipped yet.</p>;

  return (
    <div className="currentCard">
      <strong>{card.racer}</strong> — {card.type} {card.value ?? ""}
    </div>
  );
}

function Podium({ podium }) {
  return (
    <div>
      {podium.map((entry, i) => (
        <div className="result" key={entry.racer}>
          #{i + 1} {entry.racer} {entry.status === "DQ" ? "(DQ)" : ""}
        </div>
      ))}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
