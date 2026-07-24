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
    AuthApiError,
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

const SESSION_REFRESH_MARGIN_MS = 60_000;

function getProfileErrorMessage(error: unknown): string {
    if (error instanceof TypeError) {
        return "Could not reach the Crazy Racing server to load your profile.";
    }

    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    return "Could not load your Crazy Racing profile.";
}

function shouldRefreshSession(session: Session): boolean {
    if (!session.expires_at) {
        return true;
    }

    const expiresAtMs = session.expires_at * 1000;

    return expiresAtMs <= Date.now() + SESSION_REFRESH_MARGIN_MS;
}

function isInvalidAccessTokenError(error: unknown): boolean {
    return (
        error instanceof AuthApiError &&
        error.status === 401 &&
        error.code === "INVALID_ACCESS_TOKEN"
    );
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
    const sessionRefreshPromiseRef =
        useRef<Promise<Session | null> | null>(null);

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

    const refreshSupabaseSession = useCallback(async (): Promise<Session | null> => {
        if (sessionRefreshPromiseRef.current) {
            return sessionRefreshPromiseRef.current;
        }

        const refreshPromise = (async () => {
            const {
                data: { session: refreshedSession },
                error,
            } = await supabase.auth.refreshSession();

            if (error || !refreshedSession) {
                if (error) {
                    console.error(
                        "Failed to refresh the Supabase session.",
                        error,
                    );
                }

                return null;
            }

            applySession(refreshedSession);
            return refreshedSession;
        })();

        sessionRefreshPromiseRef.current = refreshPromise;

        try {
            return await refreshPromise;
        } finally {
            sessionRefreshPromiseRef.current = null;
        }
    }, [applySession]);

    const getFreshSession = useCallback(async (): Promise<Session | null> => {
        const activeSession = sessionRef.current;

        if (!activeSession) {
            return null;
        }

        if (!shouldRefreshSession(activeSession)) {
            return activeSession;
        }

        return refreshSupabaseSession();
    }, [refreshSupabaseSession]);

    useEffect(() => {
        let isMounted = true;

        const restoreSession = async () => {
            const {
                data: { session: restoredSession },
                error,
            } = await supabase.auth.getSession();

            if (!isMounted) {
                return;
            }

            if (error) {
                console.error(
                    "Failed to restore the Supabase session.",
                    error,
                );
                applySession(null);
                return;
            }

            if (!restoredSession) {
                applySession(null);
                return;
            }

            /*
             * getSession() can return the session stored in localStorage even
             * when its access token is already expired. Refresh it before the
             * application starts making authenticated backend requests.
             */
            if (shouldRefreshSession(restoredSession)) {
                sessionRef.current = restoredSession;

                const refreshedSession = await refreshSupabaseSession();

                if (!isMounted) {
                    return;
                }

                if (!refreshedSession) {
                    await supabase.auth.signOut();
                    applySession(null);
                    return;
                }

                applySession(refreshedSession);
                return;
            }

            applySession(restoredSession);
        };

        void restoreSession();

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
    }, [applySession, refreshSupabaseSession]);

    const refreshProfile = useCallback(async () => {
        let activeSession = await getFreshSession();

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
            let backendSession;

            try {
                backendSession = await fetchAuthenticatedSession(
                    activeSession.access_token,
                );
            } catch (error) {
                /*
                 * The token may have become invalid between restoration and
                 * the request, or Supabase may not have refreshed it yet.
                 * Refresh once and retry with the newly issued token.
                 */
                if (!isInvalidAccessTokenError(error)) {
                    throw error;
                }

                const refreshedSession = await refreshSupabaseSession();

                if (!refreshedSession) {
                    await supabase.auth.signOut();
                    applySession(null);
                    throw error;
                }

                activeSession = refreshedSession;

                backendSession = await fetchAuthenticatedSession(
                    activeSession.access_token,
                );
            }

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

            console.error(
                "Failed to synchronize the player profile.",
                error,
            );

            setProfile(null);
            setProfileStatus("error");
            setProfileError(getProfileErrorMessage(error));
            return null;
        }
    }, [
        applySession,
        getFreshSession,
        refreshSupabaseSession,
    ]);

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

    const checkUsernameAvailability = useCallback(
        async (username: string) => {
            let activeSession = await getFreshSession();

            if (!activeSession) {
                throw new Error(
                    "You must be signed in to manage your username.",
                );
            }

            try {
                return await fetchUsernameAvailability(
                    activeSession.access_token,
                    username,
                );
            } catch (error) {
                if (!isInvalidAccessTokenError(error)) {
                    throw error;
                }

                const refreshedSession = await refreshSupabaseSession();

                if (!refreshedSession) {
                    await supabase.auth.signOut();
                    applySession(null);
                    throw error;
                }

                activeSession = refreshedSession;

                return fetchUsernameAvailability(
                    activeSession.access_token,
                    username,
                );
            }
        },
        [
            applySession,
            getFreshSession,
            refreshSupabaseSession,
        ],
    );

    const chooseUsername = useCallback(
        async (username: string) => {
            let activeSession = await getFreshSession();

            if (!activeSession) {
                throw new Error(
                    "You must be signed in to manage your username.",
                );
            }

            let updatedProfile: CrazyRacingProfile;

            try {
                updatedProfile = await updateProfileUsername(
                    activeSession.access_token,
                    username,
                );
            } catch (error) {
                if (!isInvalidAccessTokenError(error)) {
                    throw error;
                }

                const refreshedSession = await refreshSupabaseSession();

                if (!refreshedSession) {
                    await supabase.auth.signOut();
                    applySession(null);
                    throw error;
                }

                activeSession = refreshedSession;

                updatedProfile = await updateProfileUsername(
                    activeSession.access_token,
                    username,
                );
            }

            setProfile(updatedProfile);
            setProfileStatus("ready");
            setProfileError(null);

            return updatedProfile;
        },
        [
            applySession,
            getFreshSession,
            refreshSupabaseSession,
        ],
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

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}