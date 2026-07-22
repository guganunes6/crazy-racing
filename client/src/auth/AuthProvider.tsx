import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type PropsWithChildren,
} from "react";
import type { Session } from "@supabase/supabase-js";

import {
    fetchAuthenticatedSession,
    fetchUsernameAvailability,
    updateProfileUsername,
} from "./authApi";
import { AuthContext } from "./AuthContext";
import type {
    AuthContextValue,
    CrazyRacingProfile,
    PasswordCredentials,
    ProfileStatus,
    SignUpCredentials,
} from "./authTypes";
import { supabase } from "./supabaseClient";

function getProfileErrorMessage(error: unknown): string {
    if (error instanceof TypeError) {
        return "Could not reach the Crazy Racing server to load your profile.";
    }

    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    return "Could not load your Crazy Racing profile.";
}

export function AuthProvider({ children }: PropsWithChildren) {
    const [session, setSession] = useState<Session | null>(null);
    const [isSessionLoading, setIsSessionLoading] = useState(true);
    const [profile, setProfile] = useState<CrazyRacingProfile | null>(null);
    const [profileStatus, setProfileStatus] =
        useState<ProfileStatus>("idle");
    const [profileError, setProfileError] = useState<string | null>(null);

    const sessionRef = useRef<Session | null>(null);
    const profileRequestIdRef = useRef(0);

    const applySession = useCallback((nextSession: Session | null) => {
        sessionRef.current = nextSession;
        setSession(nextSession);
        setIsSessionLoading(false);

        if (!nextSession) {
            profileRequestIdRef.current += 1;
            setProfile(null);
            setProfileStatus("idle");
            setProfileError(null);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        void supabase.auth.getSession().then(({ data, error }) => {
            if (!isMounted) {
                return;
            }

            if (error) {
                console.error("Failed to restore the Supabase session.", error);
            }

            applySession(data.session ?? null);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (!isMounted) {
                return;
            }

            applySession(nextSession);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [applySession]);

    const refreshProfile = useCallback(async () => {
        const activeSession = sessionRef.current;

        if (!activeSession) {
            setProfile(null);
            setProfileStatus("idle");
            setProfileError(null);
            return null;
        }

        const requestId = profileRequestIdRef.current + 1;
        profileRequestIdRef.current = requestId;

        setProfileStatus("loading");
        setProfileError(null);

        try {
            const backendSession = await fetchAuthenticatedSession(
                activeSession.access_token,
            );

            if (profileRequestIdRef.current !== requestId) {
                return null;
            }

            setProfile(backendSession.profile);
            setProfileStatus("ready");
            return backendSession.profile;
        } catch (error) {
            if (profileRequestIdRef.current !== requestId) {
                return null;
            }

            console.error("Failed to synchronize the player profile.", error);
            setProfile(null);
            setProfileStatus("error");
            setProfileError(getProfileErrorMessage(error));
            return null;
        }
    }, []);

    useEffect(() => {
        if (!session) {
            return;
        }

        void refreshProfile();
    }, [refreshProfile, session]);

    const signInWithPassword = useCallback(
        async ({ email, password }: PasswordCredentials) => {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (error) {
                throw error;
            }
        },
        [],
    );

    const signUpWithPassword = useCallback(
        async ({ email, password }: SignUpCredentials) => {
            const { error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    emailRedirectTo: window.location.origin,
                },
            });

            if (error) {
                throw error;
            }
        },
        [],
    );

    const signInWithGoogle = useCallback(async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: window.location.origin,
            },
        });

        if (error) {
            throw error;
        }
    }, []);

    const signOut = useCallback(async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
            throw error;
        }
    }, []);

    const getAccessToken = useCallback(
        () => sessionRef.current?.access_token ?? null,
        [],
    );

    const requireAccessToken = useCallback(() => {
        const accessToken = sessionRef.current?.access_token;

        if (!accessToken) {
            throw new Error("You must be signed in to manage your username.");
        }

        return accessToken;
    }, []);

    const checkUsernameAvailability = useCallback(
        async (username: string) =>
            fetchUsernameAvailability(requireAccessToken(), username),
        [requireAccessToken],
    );

    const chooseUsername = useCallback(
        async (username: string) => {
            const updatedProfile = await updateProfileUsername(
                requireAccessToken(),
                username,
            );

            setProfile(updatedProfile);
            setProfileStatus("ready");
            setProfileError(null);
            return updatedProfile;
        },
        [requireAccessToken],
    );

    const value = useMemo<AuthContextValue>(
        () => ({
            status: isSessionLoading
                ? "loading"
                : session
                  ? "authenticated"
                  : "anonymous",
            profileStatus,
            session,
            user: session?.user ?? null,
            profile,
            profileError,
            isLoading: isSessionLoading,
            isAuthenticated: Boolean(session),
            isProfileLoading: profileStatus === "loading",
            signInWithPassword,
            signUpWithPassword,
            signInWithGoogle,
            signOut,
            getAccessToken,
            refreshProfile,
            checkUsernameAvailability,
            chooseUsername,
        }),
        [
            checkUsernameAvailability,
            chooseUsername,
            getAccessToken,
            isSessionLoading,
            profile,
            profileError,
            profileStatus,
            refreshProfile,
            session,
            signInWithGoogle,
            signInWithPassword,
            signOut,
            signUpWithPassword,
        ],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
