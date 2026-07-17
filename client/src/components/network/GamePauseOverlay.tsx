import {
    useEffect,
    useMemo,
    useState
} from "react";

import type {
    PublicPauseState
} from "@crazy-racing/shared";

import "./GamePauseOverlay.css";

type PauseVote = "KICK" | "WAIT";

type GamePauseOverlayProps = {
    pause: PublicPauseState;
    currentPlayerId: string;
    isHost: boolean;
    onVote: (
        disconnectedPlayerId: string,
        vote: PauseVote
    ) => void;
    onKickNow: (
        disconnectedPlayerId: string
    ) => void;
};

export function GamePauseOverlay({
    pause,
    currentPlayerId,
    isHost,
    onVote,
    onKickNow
}: GamePauseOverlayProps) {
    const [now, setNow] = useState(
        Date.now()
    );

    useEffect(() => {
        if (
            pause.disconnectedPlayers.length === 0
        ) {
            return;
        }

        const timer = window.setInterval(
            () => setNow(Date.now()),
            250
        );

        return () => {
            window.clearInterval(timer);
        };
    }, [
        pause.disconnectedPlayers.length
    ]);

    const disconnected =
        useMemo(
            () =>
                [...pause.disconnectedPlayers]
                    .sort(
                        (first, second) =>
                            first.deadline -
                            second.deadline
                    )[0] ?? null,
            [pause.disconnectedPlayers]
        );

    if (disconnected) {
        const requiredKickVoteCount =
            disconnected.requiredKickVoteCount ??
            Math.ceil(
                disconnected.eligibleVoterCount /
                2
            );

        const remainingSeconds =
            Math.max(
                0,
                Math.ceil(
                    (
                        disconnected.deadline -
                        now
                    ) /
                    1000
                )
            );

        const myVote: PauseVote | null =
            disconnected.kickVoterIds.includes(
                currentPlayerId
            )
                ? "KICK"
                : disconnected.waitVoterIds.includes(
                    currentPlayerId
                )
                    ? "WAIT"
                    : null;

        const mayVote =
            disconnected.playerId !==
            currentPlayerId;

        return (
            <div
                className="gamePauseOverlay gamePauseOverlayDisconnect"
                role="dialog"
                aria-modal="true"
                aria-labelledby="disconnectPauseTitle"
            >
                <section className="disconnectPauseCard">
                    <span className="disconnectPauseEyebrow">
                        GAME PAUSED
                    </span>

                    <h2 id="disconnectPauseTitle">
                        {disconnected.playerName}
                        {" disconnected"}
                    </h2>

                    <p>
                        Waiting for reconnection...
                    </p>

                    <strong className="disconnectCountdown">
                        {remainingSeconds}
                    </strong>

                    <p className="disconnectVoteCount">
                        {disconnected.kickVoterIds.length}
                        {" / "}
                        {requiredKickVoteCount}
                        {" votes needed to kick"}
                    </p>

                    {mayVote && (
                        <div className="disconnectVoteButtons">
                            <button
                                type="button"
                                className={
                                    myVote === "KICK"
                                        ? "disconnectVoteSelected disconnectVoteKick"
                                        : "disconnectVoteKick"
                                }
                                onClick={() =>
                                    onVote(
                                        disconnected.playerId,
                                        "KICK"
                                    )
                                }
                            >
                                Vote KICK
                            </button>

                            <button
                                type="button"
                                className={
                                    myVote === "WAIT"
                                        ? "disconnectVoteSelected disconnectVoteWait"
                                        : "disconnectVoteWait"
                                }
                                onClick={() =>
                                    onVote(
                                        disconnected.playerId,
                                        "WAIT"
                                    )
                                }
                            >
                                Vote WAIT
                            </button>
                        </div>
                    )}

                    {isHost && (
                        <button
                            type="button"
                            className="disconnectKickNowButton"
                            onClick={() =>
                                onKickNow(
                                    disconnected.playerId
                                )
                            }
                        >
                            KICK NOW
                        </button>
                    )}

                    {pause.disconnectedPlayers.length > 1 && (
                        <small>
                            {pause.disconnectedPlayers.length - 1}
                            {" other disconnected player(s) are also waiting."}
                        </small>
                    )}
                </section>
            </div>
        );
    }

    if (pause.manual) {
        return (
            <div
                className="gamePauseOverlay gamePauseOverlayManual"
                aria-live="polite"
            >
                <strong>
                    GAME PAUSED
                </strong>
            </div>
        );
    }

    return null;
}