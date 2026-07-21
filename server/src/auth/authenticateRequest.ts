import type { Request } from "express";

import type { AuthenticatedUser } from "./authTypes.js";
import { AuthError } from "./authError.js";
import { readBearerToken } from "./accessToken.js";
import { supabaseAuth } from "./supabaseServer.js";

export async function authenticateRequest(
    request: Request,
): Promise<AuthenticatedUser> {
    const accessToken = readBearerToken(request);

    const {
        data: { user },
        error,
    } = await supabaseAuth.auth.getUser(accessToken);

    if (error || !user) {
        throw new AuthError(
            "Your session is invalid or has expired. Please sign in again.",
            401,
            "INVALID_ACCESS_TOKEN",
        );
    }

    const provider =
        user.app_metadata?.provider ??
        user.identities?.[0]?.provider ??
        "email";

    return {
        id: user.id,
        email: user.email ?? null,
        provider,
        user,
    };
}
