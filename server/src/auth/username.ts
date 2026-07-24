const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 20;
const RESERVED_USERNAMES = new Set([
    "admin",
    "administrator",
    "crazyracing",
    "guest",
    "moderator",
    "null",
    "system",
    "undefined",
]);

export function normalizeUsername(value: string): string {
    return value.trim().toLowerCase();
}

export function validateUsername(value: unknown): string {
    if (typeof value !== "string") {
        throw new Error("Username must be text.");
    }

    const username = value.trim();

    if (
        username.length < MIN_USERNAME_LENGTH ||
        username.length > MAX_USERNAME_LENGTH
    ) {
        throw new Error(
            `Username must contain between ${MIN_USERNAME_LENGTH} and ` +
            `${MAX_USERNAME_LENGTH} characters.`,
        );
    }

    if (RESERVED_USERNAMES.has(normalizeUsername(username))) {
        throw new Error("That username is reserved. Choose another one.");
    }

    if (RESERVED_USERNAMES.has(normalizeUsername(username))) {
        throw new Error("That username is reserved. Choose another one.");
    }

    if (!/^[A-Za-z0-9_]+$/.test(username)) {
        throw new Error(
            "Username may only contain letters, numbers, and underscores.",
        );
    }

    return username;
}

export function usernameCandidateFromIdentity(
    email: string | null,
    metadata: Record<string, unknown>,
): string {
    const metadataCandidates = [
        metadata.username,
        metadata.preferred_username,
        metadata.full_name,
        metadata.name,
    ];

    for (const candidate of metadataCandidates) {
        if (typeof candidate !== "string") {
            continue;
        }

        const sanitized = sanitizeUsername(candidate);

        if (sanitized.length >= MIN_USERNAME_LENGTH) {
            return sanitized;
        }
    }

    if (email) {
        const localPart = email.split("@")[0] ?? "";
        const sanitized = sanitizeUsername(localPart);

        if (sanitized.length >= MIN_USERNAME_LENGTH) {
            return sanitized;
        }
    }

    return "Racer";
}

function sanitizeUsername(value: string): string {
    const compact = value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, MAX_USERNAME_LENGTH);

    return compact || "Racer";
}
