import type { Request } from "express";

import { AuthError } from "./authError.js";

const BEARER_PREFIX = "Bearer ";

export function readBearerToken(request: Request): string {
    const authorization = request.header("authorization")?.trim();

    if (!authorization) {
        throw new AuthError(
            "You must sign in before using this endpoint.",
            401,
            "MISSING_ACCESS_TOKEN",
        );
    }

    if (!authorization.startsWith(BEARER_PREFIX)) {
        throw new AuthError(
            "The Authorization header must use the Bearer scheme.",
            401,
            "INVALID_AUTHORIZATION_HEADER",
        );
    }

    const token = authorization.slice(BEARER_PREFIX.length).trim();

    if (!token) {
        throw new AuthError(
            "The access token is missing.",
            401,
            "MISSING_ACCESS_TOKEN",
        );
    }

    return token;
}
