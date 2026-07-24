import type { User } from "@supabase/supabase-js";

export type AuthenticatedUser = {
    id: string;
    email: string | null;
    provider: string;
    user: User;
};

export type PublicProfile = {
    id: string;
    username: string;
    hasChosenUsername: boolean;
    email: string | null;
    avatarUrl: string | null;
    authProvider: string;
    createdAt: string;
    updatedAt: string;
    lastLoginAt: string | null;
};

export type AuthenticatedSession = {
    user: {
        id: string;
        email: string | null;
        provider: string;
    };
    profile: PublicProfile;
};
