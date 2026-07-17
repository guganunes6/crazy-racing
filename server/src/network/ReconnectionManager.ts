import type { Player, Room } from "../gameLogic.js";

export const RECONNECT_GRACE_PERIOD_MS = 60_000;

type ReconnectionCallbacks = {
    onRoomChanged: (room: Room) => void;
    onPlayerRemoved: (room: Room, player: Player, reason: string) => void;
    removePlayer: (room: Room, playerId: string) => Player | null;
};

export class ReconnectionManager {
    private timers = new Map<string, ReturnType<typeof setTimeout>>();

    constructor(private readonly callbacks: ReconnectionCallbacks) { }

    start(room: Room, player: Player): void {
        this.cancel(room.roomCode, player.id);

        const key = this.key(room.roomCode, player.id);
        const timer = setTimeout(() => {
            this.timers.delete(key);

            const currentPlayer = room.players.find(
                (candidate) => candidate.id === player.id,
            );

            if (!currentPlayer || currentPlayer.connectionState === "connected") {
                return;
            }

            const removed = this.callbacks.removePlayer(room, player.id);
            if (!removed) {
                return;
            }

            this.callbacks.onPlayerRemoved(
                room,
                removed,
                "The reconnection grace period expired.",
            );
            this.callbacks.onRoomChanged(room);
        }, RECONNECT_GRACE_PERIOD_MS);

        this.timers.set(key, timer);
    }

    cancel(roomCode: string, playerId: string): void {
        const key = this.key(roomCode, playerId);
        const timer = this.timers.get(key);

        if (timer) {
            clearTimeout(timer);
            this.timers.delete(key);
        }
    }

    removeNow(room: Room, playerId: string, reason: string): Player | null {
        this.cancel(room.roomCode, playerId);
        const removed = this.callbacks.removePlayer(room, playerId);

        if (removed) {
            this.callbacks.onPlayerRemoved(room, removed, reason);
            this.callbacks.onRoomChanged(room);
        }

        return removed;
    }

    private key(roomCode: string, playerId: string): string {
        return `${roomCode}:${playerId}`;
    }
}