import type { Socket } from "socket.io";

import { syncAuthenticatedProfile } from "./profileService.js";
import { supabaseAuth } from "./supabaseServer.js";

export type SocketPlayerIdentity =
    | {
          kind: "guest";
          playerId: string;
          playerName: null;
      }
    | {
          kind: "authenticated";
          playerId: string;
          playerName: string;
          profileId: string;
      };

export async function resolveSocketPlayerIdentity(
    socket: Socket,
): Promise<SocketPlayerIdentity> {
    const accessToken = readHandshakeString(socket.handshake.auth?.accessToken);

    if (!accessToken) {
        return {
            kind: "guest",
            playerId: requireGuestSessionId(
                socket.handshake.auth?.guestSessionId,
            ),
            playerName: null,
        };
    }

    const {
        data: { user },
        error,
    } = await supabaseAuth.auth.getUser(accessToken);

    if (error || !user) {
        throw new Error("Your signed-in session is invalid or has expired.");
    }

    const provider =
        user.app_metadata?.provider ??
        user.identities?.[0]?.provider ??
        "email";

    const profile = await syncAuthenticatedProfile({
        id: user.id,
        email: user.email ?? null,
        provider,
        user,
    });

    if (!profile.hasChosenUsername) {
        throw new Error(
            "Choose your Crazy Racing username before entering a room.",
        );
    }

    return {
        kind: "authenticated",
        playerId: authenticatedPlayerId(profile.id),
        playerName: profile.username,
        profileId: profile.id,
    };
}

export function authenticatedPlayerId(profileId: string): string {
    return `auth:${profileId}`;
}

function requireGuestSessionId(value: unknown): string {
    const sessionId = readHandshakeString(value);

    if (!sessionId || sessionId.length < 8 || sessionId.length > 128) {
        throw new Error("Invalid guest session.");
    }

    return sessionId;
}

function readHandshakeString(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed || null;
}
