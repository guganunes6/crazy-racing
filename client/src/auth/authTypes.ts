import type { Session, User } from "@supabase/supabase-js";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export type PasswordCredentials = {
    email: string;
    password: string;
};

export type SignUpCredentials = PasswordCredentials;

export type AuthContextValue = {
    status: AuthStatus;
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signInWithPassword: (credentials: PasswordCredentials) => Promise<void>;
    signUpWithPassword: (credentials: SignUpCredentials) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    getAccessToken: () => string | null;
};
