import {
    useEffect,
    useRef,
    useState,
    type FormEvent,
} from "react";

import { AuthApiError } from "../../auth/authApi";
import { useAuth } from "../../auth/AuthContext";

const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 20;
const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;
const AVAILABILITY_DELAY_MS = 450;

type AvailabilityState =
    | "idle"
    | "checking"
    | "available"
    | "unavailable"
    | "error";

function validateUsernameLocally(value: string): string | null {
    const username = value.trim();

    if (!username) {
        return "Choose a username to continue.";
    }

    if (
        username.length < MIN_USERNAME_LENGTH ||
        username.length > MAX_USERNAME_LENGTH
    ) {
        return `Use between ${MIN_USERNAME_LENGTH} and ${MAX_USERNAME_LENGTH} characters.`;
    }

    if (!USERNAME_PATTERN.test(username)) {
        return "Use only letters, numbers, and underscores.";
    }

    return null;
}

function getUsernameErrorMessage(error: unknown): string {
    if (error instanceof AuthApiError) {
        if (error.code === "USERNAME_TAKEN") {
            return "That username has just been taken. Choose another one.";
        }

        return error.message;
    }

    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    return "Could not save your username. Please try again.";
}

export function UsernameSetup() {
    const {
        profile,
        checkUsernameAvailability,
        chooseUsername,
        signOut,
    } = useAuth();

    const [username, setUsername] = useState(profile?.username ?? "");
    const [availability, setAvailability] =
        useState<AvailabilityState>("idle");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const availabilityRequestRef = useRef(0);

    const normalizedUsername = username.trim();
    const validationError = validateUsernameLocally(username);

    useEffect(() => {
        const requestId = availabilityRequestRef.current + 1;
        availabilityRequestRef.current = requestId;
        setMessage("");

        if (validationError) {
            setAvailability("idle");
            return;
        }

        setAvailability("checking");

        const timeoutId = window.setTimeout(() => {
            void checkUsernameAvailability(normalizedUsername)
                .then((available) => {
                    if (availabilityRequestRef.current !== requestId) {
                        return;
                    }

                    setAvailability(available ? "available" : "unavailable");
                })
                .catch((error: unknown) => {
                    if (availabilityRequestRef.current !== requestId) {
                        return;
                    }

                    console.error("Could not check username availability.", error);
                    setAvailability("error");
                });
        }, AVAILABILITY_DELAY_MS);

        return () => window.clearTimeout(timeoutId);
    }, [checkUsernameAvailability, normalizedUsername, validationError]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage("");

        const localError = validateUsernameLocally(username);

        if (localError) {
            setMessage(localError);
            return;
        }

        if (availability === "checking") {
            setMessage("Wait for the availability check to finish.");
            return;
        }

        if (availability === "unavailable") {
            setMessage("That username is already being used.");
            return;
        }

        setIsSubmitting(true);

        try {
            await chooseUsername(normalizedUsername);
        } catch (error) {
            setMessage(getUsernameErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleSignOut() {
        setMessage("");
        setIsSigningOut(true);

        try {
            await signOut();
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Could not sign out. Please try again.",
            );
            setIsSigningOut(false);
        }
    }

    const isBusy = isSubmitting || isSigningOut;
    const canSubmit =
        !isBusy &&
        !validationError &&
        availability === "available";

    return (
        <section className="usernameSetup" aria-labelledby="username-setup-title">
            <div className="usernameSetupHeading">
                <span className="authEyebrow">FIRST-TIME SETUP</span>
                <h2 id="username-setup-title">Choose your racing name</h2>
                <p>
                    This is the name other players will see in Crazy Racing.
                </p>
            </div>

            <form className="usernameSetupForm" onSubmit={handleSubmit}>
                <label htmlFor="crazy-racing-username">Username</label>
                <input
                    id="crazy-racing-username"
                    type="text"
                    inputMode="text"
                    autoComplete="username"
                    spellCheck={false}
                    maxLength={MAX_USERNAME_LENGTH}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    disabled={isBusy}
                    autoFocus
                    aria-describedby="username-rules username-availability"
                />

                <p id="username-rules" className="usernameRules">
                    {MIN_USERNAME_LENGTH}–{MAX_USERNAME_LENGTH} characters. Letters,
                    numbers, and underscores only.
                </p>

                <div
                    id="username-availability"
                    className={`usernameAvailability usernameAvailability-${availability}`}
                    aria-live="polite"
                >
                    {validationError && normalizedUsername
                        ? validationError
                        : availability === "checking"
                          ? "Checking availability…"
                          : availability === "available"
                            ? "Username available."
                            : availability === "unavailable"
                              ? "That username is already taken."
                              : availability === "error"
                                ? "Could not check availability. Keep typing or try again."
                                : "Choose a unique name."}
                </div>

                <button
                    type="submit"
                    className="authPrimaryButton"
                    disabled={!canSubmit}
                >
                    {isSubmitting ? "Saving username…" : "Use This Username"}
                </button>
            </form>

            {profile?.email && (
                <p className="usernameSetupAccount">
                    Signed in as <strong>{profile.email}</strong>
                </p>
            )}

            <button
                type="button"
                className="authSecondaryButton usernameSetupSignOut"
                onClick={() => void handleSignOut()}
                disabled={isBusy}
            >
                {isSigningOut ? "Signing out…" : "Sign Out"}
            </button>

            {message && (
                <p className="authFeedback authFeedbackError" role="alert">
                    {message}
                </p>
            )}
        </section>
    );
}
