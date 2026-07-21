import { useMemo, useState, type FormEvent } from "react";
import { AuthError } from "@supabase/supabase-js";

import { useAuth } from "../../auth/AuthContext";

import "./AuthPanel.css";

type AuthMode = "sign-in" | "sign-up";

function getFriendlyAuthError(error: unknown): string {
    if (error instanceof AuthError) {
        const message = error.message.toLowerCase();

        if (message.includes("invalid login credentials")) {
            return "The email or password is incorrect.";
        }

        if (message.includes("email not confirmed")) {
            return "Confirm your email address before signing in.";
        }

        if (message.includes("user already registered")) {
            return "An account already exists for this email address.";
        }

        if (message.includes("password")) {
            return error.message;
        }

        if (message.includes("rate limit")) {
            return "Too many attempts. Wait a moment and try again.";
        }

        return error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Authentication failed. Please try again.";
}

export function AuthPanel() {
    const {
        user,
        isLoading,
        isAuthenticated,
        signInWithPassword,
        signUpWithPassword,
        signInWithGoogle,
        signOut,
    } = useAuth();

    const [mode, setMode] = useState<AuthMode>("sign-in");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const displayName = useMemo(() => {
        const metadataName = user?.user_metadata?.full_name;

        if (typeof metadataName === "string" && metadataName.trim()) {
            return metadataName.trim();
        }

        return user?.email ?? "Crazy Racing player";
    }, [user]);

    function switchMode(nextMode: AuthMode) {
        setMode(nextMode);
        setPassword("");
        setConfirmPassword("");
        setMessage("");
        setError("");
    }

    async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage("");
        setError("");

        const normalizedEmail = email.trim();

        if (!normalizedEmail) {
            setError("Enter your email address.");
            return;
        }

        if (!password) {
            setError("Enter your password.");
            return;
        }

        if (mode === "sign-up") {
            if (password.length < 6) {
                setError("Your password must contain at least 6 characters.");
                return;
            }

            if (password !== confirmPassword) {
                setError("The passwords do not match.");
                return;
            }
        }

        setIsSubmitting(true);

        try {
            if (mode === "sign-in") {
                await signInWithPassword({
                    email: normalizedEmail,
                    password,
                });
                setPassword("");
            } else {
                await signUpWithPassword({
                    email: normalizedEmail,
                    password,
                });
                setPassword("");
                setConfirmPassword("");
                setMessage(
                    "Account created. If email confirmation is enabled, check your inbox before signing in.",
                );
            }
        } catch (caughtError) {
            setError(getFriendlyAuthError(caughtError));
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleGoogleSignIn() {
        setMessage("");
        setError("");
        setIsSubmitting(true);

        try {
            await signInWithGoogle();
        } catch (caughtError) {
            setError(getFriendlyAuthError(caughtError));
            setIsSubmitting(false);
        }
    }

    async function handleSignOut() {
        setMessage("");
        setError("");
        setIsSubmitting(true);

        try {
            await signOut();
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            setMode("sign-in");
        } catch (caughtError) {
            setError(getFriendlyAuthError(caughtError));
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isLoading) {
        return (
            <section className="authPanel authPanelLoading" aria-live="polite">
                <span className="authSpinner" aria-hidden="true" />
                <span>Restoring your account session…</span>
            </section>
        );
    }

    if (isAuthenticated) {
        return (
            <section className="authPanel authSignedIn" aria-live="polite">
                <div className="authSignedInCopy">
                    <span className="authEyebrow">SIGNED IN</span>
                    <strong>{displayName}</strong>
                    <span>Your account session will persist on this device.</span>
                </div>

                <button
                    type="button"
                    className="authSecondaryButton"
                    onClick={handleSignOut}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Signing out…" : "Sign Out"}
                </button>

                {error && (
                    <p className="authFeedback authFeedbackError" role="alert">
                        {error}
                    </p>
                )}
            </section>
        );
    }

    return (
        <section className="authPanel" aria-label="Player account">
            <div className="authPanelHeading">
                <div>
                    <span className="authEyebrow">PLAYER ACCOUNT</span>
                    <h2>{mode === "sign-in" ? "Welcome back" : "Create account"}</h2>
                </div>

                <span className="authOptionalBadge">Optional</span>
            </div>

            <p className="authDescription">
                Sign in to keep an account session. You can still play as a guest.
            </p>

            <div className="authModeTabs" role="tablist" aria-label="Authentication mode">
                <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "sign-in"}
                    className={mode === "sign-in" ? "authModeTabActive" : undefined}
                    onClick={() => switchMode("sign-in")}
                    disabled={isSubmitting}
                >
                    Sign In
                </button>

                <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "sign-up"}
                    className={mode === "sign-up" ? "authModeTabActive" : undefined}
                    onClick={() => switchMode("sign-up")}
                    disabled={isSubmitting}
                >
                    Register
                </button>
            </div>

            <form className="authForm" onSubmit={handlePasswordSubmit}>
                <label>
                    <span>Email</span>
                    <input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        disabled={isSubmitting}
                        required
                    />
                </label>

                <label>
                    <span>Password</span>
                    <input
                        type="password"
                        autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="At least 6 characters"
                        disabled={isSubmitting}
                        required
                    />
                </label>

                {mode === "sign-up" && (
                    <label>
                        <span>Confirm password</span>
                        <input
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            placeholder="Repeat your password"
                            disabled={isSubmitting}
                            required
                        />
                    </label>
                )}

                <button
                    type="submit"
                    className="authPrimaryButton"
                    disabled={isSubmitting}
                >
                    {isSubmitting
                        ? "Please wait…"
                        : mode === "sign-in"
                          ? "Sign In"
                          : "Create Account"}
                </button>
            </form>

            <div className="authDivider" aria-hidden="true">
                <span>or</span>
            </div>

            <button
                type="button"
                className="authGoogleButton"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
            >
                <span className="authGoogleMark" aria-hidden="true">G</span>
                Continue with Google
            </button>

            {message && (
                <p className="authFeedback authFeedbackSuccess" role="status">
                    {message}
                </p>
            )}

            {error && (
                <p className="authFeedback authFeedbackError" role="alert">
                    {error}
                </p>
            )}
        </section>
    );
}
