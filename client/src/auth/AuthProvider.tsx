import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type PropsWithChildren,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { AuthContext } from "./AuthContext";
import type {
    AuthContextValue,
    PasswordCredentials,
    SignUpCredentials,
} from "./authTypes";
import { supabase } from "./supabaseClient";

export function AuthProvider({ children }: PropsWithChildren) {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        void supabase.auth.getSession().then(({ data, error }) => {
            if (!isMounted) {
                return;
            }

            if (error) {
                console.error("Failed to restore the Supabase session.", error);
            }

            setSession(data.session ?? null);
            setIsLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (!isMounted) {
                return;
            }

            setSession(nextSession);
            setIsLoading(false);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

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
        () => session?.access_token ?? null,
        [session],
    );

    const value = useMemo<AuthContextValue>(
        () => ({
            status: isLoading
                ? "loading"
                : session
                  ? "authenticated"
                  : "anonymous",
            session,
            user: session?.user ?? null,
            isLoading,
            isAuthenticated: Boolean(session),
            signInWithPassword,
            signUpWithPassword,
            signInWithGoogle,
            signOut,
            getAccessToken,
        }),
        [
            getAccessToken,
            isLoading,
            session,
            signInWithGoogle,
            signInWithPassword,
            signOut,
            signUpWithPassword,
        ],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
