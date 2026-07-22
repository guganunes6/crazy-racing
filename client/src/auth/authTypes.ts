import type { Session, User } from "@supabase/supabase-js";

export type AuthStatus = "loading" | "authenticated" | "anonymous";
export type ProfileStatus = "idle" | "loading" | "ready" | "error";

export type PasswordCredentials = {
    email: string;
    password: string;
};

export type SignUpCredentials = PasswordCredentials;

export type CrazyRacingProfile = {
    id: string;
    username: string;
    email: string | null;
    avatarUrl: string | null;
    authProvider: string;
    createdAt: string;
    updatedAt: string;
    lastLoginAt: string | null;
};

export type AuthenticatedBackendSession = {
    user: {
        id: string;
        email: string | null;
        provider: string;
    };
    profile: CrazyRacingProfile;
};

export type AuthContextValue = {
    status: AuthStatus;
    profileStatus: ProfileStatus;
    session: Session | null;
    user: User | null;
    profile: CrazyRacingProfile | null;
    profileError: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isProfileLoading: boolean;
    signInWithPassword: (credentials: PasswordCredentials) => Promise<void>;
    signUpWithPassword: (credentials: SignUpCredentials) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    getAccessToken: () => string | null;
    refreshProfile: () => Promise<CrazyRacingProfile | null>;
};
