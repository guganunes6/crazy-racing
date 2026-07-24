import type { User } from "@supabase/supabase-js";

import { prisma } from "../database/prisma.js";
import type {
    AuthenticatedUser,
    PublicProfile,
} from "./authTypes.js";
import {
    normalizeUsername,
    usernameCandidateFromIdentity,
    validateUsername,
} from "./username.js";

const MAX_USERNAME_LENGTH = 20;

export async function syncAuthenticatedProfile(
    authenticatedUser: AuthenticatedUser,
): Promise<PublicProfile> {
    const existingProfile = await prisma.profile.findUnique({
        where: {
            id: authenticatedUser.id,
        },
    });

    if (existingProfile) {
        const updatedProfile = await prisma.profile.update({
            where: {
                id: authenticatedUser.id,
            },
            data: {
                email: authenticatedUser.email,
                avatarUrl: readAvatarUrl(authenticatedUser.user),
                authProvider: authenticatedUser.provider,
                lastLoginAt: new Date(),
            },
        });

        return toPublicProfile(updatedProfile);
    }

    const username = await createAvailableUsername(
        usernameCandidateFromIdentity(
            authenticatedUser.email,
            authenticatedUser.user.user_metadata ?? {},
        ),
    );

    const createdProfile = await prisma.profile.create({
        data: {
            id: authenticatedUser.id,
            username,
            usernameNormalized: normalizeUsername(username),
            hasChosenUsername: false,
            email: authenticatedUser.email,
            avatarUrl: readAvatarUrl(authenticatedUser.user),
            authProvider: authenticatedUser.provider,
            lastLoginAt: new Date(),
        },
    });

    return toPublicProfile(createdProfile);
}

export async function isUsernameAvailable(
    requestedUsername: string,
    excludedProfileId?: string,
): Promise<boolean> {
    const username = validateUsername(requestedUsername);
    const usernameNormalized = normalizeUsername(username);

    const existingProfile = await prisma.profile.findUnique({
        where: {
            usernameNormalized,
        },
        select: {
            id: true,
        },
    });

    return (
        !existingProfile ||
        Boolean(excludedProfileId && existingProfile.id === excludedProfileId)
    );
}

export async function updateUsername(
    profileId: string,
    requestedUsername: unknown,
): Promise<PublicProfile> {
    const currentProfile = await prisma.profile.findUnique({
        where: {
            id: profileId,
        },
        select: {
            hasChosenUsername: true,
        },
    });

    if (!currentProfile) {
        throw new Error("The Crazy Racing profile could not be found.");
    }

    if (currentProfile.hasChosenUsername) {
        const error = new Error("Your Crazy Racing username has already been chosen.");
        error.name = "UsernameAlreadyChosenError";
        throw error;
    }

    const username = validateUsername(requestedUsername);
    const usernameNormalized = normalizeUsername(username);

    const available = await isUsernameAvailable(username, profileId);

    if (!available) {
        const error = new Error("That username is already being used.");
        error.name = "UsernameConflictError";
        throw error;
    }

    const updatedProfile = await prisma.profile.update({
        where: {
            id: profileId,
        },
        data: {
            username,
            usernameNormalized,
            hasChosenUsername: true,
        },
    });

    return toPublicProfile(updatedProfile);
}

async function createAvailableUsername(baseValue: string): Promise<string> {
    const validatedBase = makeValidGeneratedUsername(baseValue);

    for (let attempt = 0; attempt < 100; attempt += 1) {
        const suffix = attempt === 0 ? "" : String(attempt + 1);
        const maximumBaseLength = MAX_USERNAME_LENGTH - suffix.length;
        const candidate =
            validatedBase.slice(0, maximumBaseLength) + suffix;

        if (await isUsernameAvailable(candidate)) {
            return candidate;
        }
    }

    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const maximumBaseLength =
        MAX_USERNAME_LENGTH - randomSuffix.length - 1;

    return (
        validatedBase.slice(0, maximumBaseLength) +
        "_" +
        randomSuffix
    );
}

function makeValidGeneratedUsername(value: string): string {
    let generated = value
        .replace(/[^A-Za-z0-9_]/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, MAX_USERNAME_LENGTH);

    while (generated.length < 3) {
        generated += "x";
    }

    return generated;
}

function readAvatarUrl(user: User): string | null {
    const metadata = user.user_metadata ?? {};
    const possibleValues = [
        metadata.avatar_url,
        metadata.picture,
    ];

    const avatarUrl = possibleValues.find(
        (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
    );

    return avatarUrl?.trim() ?? null;
}

function toPublicProfile(profile: {
    id: string;
    username: string;
    hasChosenUsername: boolean;
    email: string | null;
    avatarUrl: string | null;
    authProvider: string;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
}): PublicProfile {
    return {
        id: profile.id,
        username: profile.username,
        hasChosenUsername: profile.hasChosenUsername,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
        authProvider: profile.authProvider,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
        lastLoginAt: profile.lastLoginAt?.toISOString() ?? null,
    };
}
