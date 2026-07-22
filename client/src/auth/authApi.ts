import { environment } from "../config/environment";
import type {
    AuthenticatedBackendSession,
    CrazyRacingProfile,
} from "./authTypes";

type ApiErrorPayload = {
    error?: {
        code?: string;
        message?: string;
    };
};

export class AuthApiError extends Error {
    readonly status: number;
    readonly code: string | null;

    constructor(message: string, status: number, code: string | null = null) {
        super(message);
        this.name = "AuthApiError";
        this.status = status;
        this.code = code;
    }
}

export async function fetchAuthenticatedSession(
    accessToken: string,
): Promise<AuthenticatedBackendSession> {
    return requestJson<AuthenticatedBackendSession>("/api/auth/me", accessToken);
}

export async function synchronizeProfile(
    accessToken: string,
): Promise<CrazyRacingProfile> {
    const response = await requestJson<AuthenticatedBackendSession>(
        "/api/auth/sync",
        accessToken,
        {
            method: "POST",
        },
    );

    return response.profile;
}

async function requestJson<T>(
    path: string,
    accessToken: string,
    init: RequestInit = {},
): Promise<T> {
    const response = await fetch(`${environment.serverUrl}${path}`, {
        ...init,
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
            ...init.headers,
        },
    });

    if (!response.ok) {
        const payload = await readErrorPayload(response);
        const message =
            payload.error?.message ??
            `The authentication server returned HTTP ${response.status}.`;

        throw new AuthApiError(
            message,
            response.status,
            payload.error?.code ?? null,
        );
    }

    return (await response.json()) as T;
}

async function readErrorPayload(response: Response): Promise<ApiErrorPayload> {
    try {
        return (await response.json()) as ApiErrorPayload;
    } catch {
        return {};
    }
}
