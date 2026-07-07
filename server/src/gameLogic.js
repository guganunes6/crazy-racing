import { nanoid } from "nanoid";

export const RACERS = ["QUEEN", "FISH", "HOTDOG", "LION"];

const START_MONEY = 10;
const MAX_PLAYERS = 9;
const MIN_PLAYERS = 2;

export function createRoom(hostSocketId, hostName) {
  const roomCode = nanoid(6).toUpperCase();

  return {
    roomCode,
    hostSocketId,
    phase: "lobby",
    raceNumber: 1,
    players: [
      {
        id: hostSocketId,
        name: hostName || "Host",
        ready: false,
        money: START_MONEY,
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

export function addPlayer(room, socketId, name) {
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
    money: START_MONEY,
    hand: [],
    selectedSecretCards: [],
    bets: []
  });
}

export function removePlayer(room, socketId) {
  room.players = room.players.filter((p) => p.id !== socketId);

  if (room.hostSocketId === socketId && room.players.length > 0) {
    room.hostSocketId = room.players[0].id;
  }
}

export function toggleReady(room, socketId) {
  const player = room.players.find((p) => p.id === socketId);
  if (player) player.ready = !player.ready;
}

export function canStart(room) {
  return (
    room.players.length >= MIN_PLAYERS &&
    room.players.length <= MAX_PLAYERS &&
    room.players.every((p) => p.ready)
  );
}

export function startGame(room) {
  if (!canStart(room)) {
    throw new Error("Need 2–9 ready players.");
  }

  room.phase = "betting";
  room.raceNumber = 1;
  room.players.forEach((p) => {
    p.money = START_MONEY;
    p.bets = [];
    p.selectedSecretCards = [];
  });

  setupRace(room);
}

export function setupRace(room) {
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

export function autoAssignDemoBets(room) {
  // Placeholder until the full betting ticket draft is implemented.
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

export function submitSecretCards(room, socketId, cardIds) {
  const player = room.players.find((p) => p.id === socketId);
  if (!player) return;

  const needed = room.players.length === 2 ? 2 : 1;
  const selected = player.hand.filter((card) => cardIds.includes(card.id)).slice(0, needed);

  if (selected.length !== needed) {
    throw new Error(`Choose exactly ${needed} card(s).`);
  }

  player.selectedSecretCards = selected;
}

export function allSecretCardsSubmitted(room) {
  const needed = room.players.length === 2 ? 2 : 1;
  return room.players.every((p) => p.selectedSecretCards.length === needed);
}

export function beginRace(room) {
  for (const player of room.players) {
    for (const card of player.selectedSecretCards) {
      room.deck.push(card);
    }

    const selectedIds = new Set(player.selectedSecretCards.map((c) => c.id));
    player.hand = player.hand.filter((c) => !selectedIds.has(c.id));
  }

  shuffle(room.deck);

  // Burn 3 cards.
  room.discard.push(...room.deck.splice(0, 3));

  room.phase = "racing";
}

export function stepRace(room) {
  if (room.phase !== "racing") return;

  if (room.deck.length === 0) {
    room.raceLog.push("Deck empty. Reshuffling discard pile.");
    room.deck = [...room.discard];
    room.discard = [];
    shuffle(room.deck);
    room.discard.push(...room.deck.splice(0, 3));
  }

  const card = room.deck.shift();
  room.currentCard = card;
  room.discard.push(card);

  applyCard(room, card);
  checkRaceEnd(room);

  return card;
}

export function finishPayouts(room) {
  const ordered = room.podium.map((entry) => entry.racer);

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

function createInitialRacers() {
  return RACERS.map((name, lane) => ({
    name,
    lane,
    position: 0,
    facing: 1,
    fallen: false,
    dq: false,
    finished: false
  }));
}

function createRaceDeck(playerCount) {
  const randomCardsByPlayerCount = {
    2: 10,
    3: 11,
    4: 10,
    5: 9,
    6: 8,
    7: 7,
    8: 6,
    9: 14
  };

  const cards = [];

  for (const racer of RACERS) {
    cards.push(createCard("move", racer, 1));
  }

  const count = randomCardsByPlayerCount[playerCount] ?? 8;
  for (let i = 0; i < count; i++) {
    cards.push(drawRandomCard());
  }

  return cards;
}

function drawRandomCard() {
  const racer = RACERS[Math.floor(Math.random() * RACERS.length)];
  const types = ["move", "move", "move", "fall", "turn", "recover", "swerve-left", "swerve-right"];
  const type = types[Math.floor(Math.random() * types.length)];

  if (type === "move") {
    const values = [-2, -1, 1, 2, 3];
    return createCard(type, racer, values[Math.floor(Math.random() * values.length)]);
  }

  return createCard(type, racer, null);
}

function createCard(type, racer, value) {
  return {
    id: nanoid(8),
    type,
    racer,
    value
  };
}

function applyCard(room, card) {
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
    const distance = racer.fallen ? Math.sign(card.value || 1) : card.value;
    racer.position += distance * racer.facing;

    if (racer.position < 0) {
      dqRacer(room, racer, "ran off the back of the track");
      return;
    }

    if (racer.position >= 12) {
      finishRacer(room, racer);
      return;
    }

    checkCollision(room, racer);
    room.raceLog.push(`${racer.name} moves ${distance}.`);
  }
}

function checkCollision(room, movingRacer) {
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
        room.raceLog.push(`${movingRacer.name} collides with ${other.name}. ${other.name} falls.`);
      }
    }
  }
}

function finishRacer(room, racer) {
  racer.finished = true;
  room.podium.push({ racer: racer.name, status: "finished" });
  room.raceLog.push(`${racer.name} crosses the finish line.`);
}

function dqRacer(room, racer, reason) {
  racer.dq = true;
  room.podium.push({ racer: racer.name, status: "DQ", reason });
  room.raceLog.push(`${racer.name} is DQ: ${reason}.`);
}

function checkRaceEnd(room) {
  if (room.podium.length >= 3) {
    for (const racer of room.racers) {
      if (!racer.finished && !racer.dq) {
        room.podium.push({ racer: racer.name, status: "remaining" });
      }
    }

    room.phase = "payouts";
  }
}

function payoutForPlace(place, risk) {
  if (place === 1) return risk === "risky" ? 15 : 10;
  if (place === 2) return risk === "risky" ? 5 : 7;
  if (place === 3) return risk === "risky" ? 2 : 5;
  return 0;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
