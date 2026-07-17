const SESSION_ID_KEY = "crazy-racing-session-id";
const LAST_ROOM_CODE_KEY = "crazy-racing-last-room-code";

export function getSessionId(): string {
    const existing = window.localStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;

    const created = createSessionId();
    window.localStorage.setItem(SESSION_ID_KEY, created);
    return created;
}

export function getLastRoomCode(): string | null {
    const roomCode = window.localStorage.getItem(LAST_ROOM_CODE_KEY);
    return roomCode ? roomCode.toUpperCase() : null;
}

export function rememberRoomCode(roomCode: string): void {
    window.localStorage.setItem(
        LAST_ROOM_CODE_KEY,
        roomCode.trim().toUpperCase()
    );
}

export function forgetRoomCode(): void {
    window.localStorage.removeItem(LAST_ROOM_CODE_KEY);
}

function createSessionId(): string {
    if (typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return [
        Date.now().toString(36),
        Math.random().toString(36).slice(2),
        Math.random().toString(36).slice(2)
    ].join("-");
}