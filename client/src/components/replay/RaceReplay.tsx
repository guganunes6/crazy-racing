import {
    useMemo
} from "react";

import {
    CARD_CATALOG_BY_ID,
    type CompletedRaceReplay
} from "@crazy-racing/shared";

import { Board } from "../../board/Board";

import { CurrentSideBetCard } from "../betting/CurrentSideBetCard";

import { DraftedTicketIcon } from "../betting/DraftedTicketIcon";

import { PayoutSummary } from "../betting/PayoutSummary";

import { AnimatedCurrentCard } from "../cards/AnimatedCurrentCard";

import { buildRaceReplay } from "../../replay/buildRaceReplay";

import { useRaceReplay } from "../../replay/useRaceReplay";

import { downloadRaceReplay } from "../../replay/ReplayFile";

import type { ReplaySpeed } from "../../replay/ReplayTypes";

import "./RaceReplay.css";

type RaceReplayProps = {
    replay:
    CompletedRaceReplay;

    onExit:
    () => void;
};

const REPLAY_SPEEDS:
    ReplaySpeed[] = [
        0.5,
        1,
        2,
        4
    ];

export function RaceReplay({
    replay,
    onExit
}: RaceReplayProps) {
    const model =
        useMemo(
            () =>
                buildRaceReplay(
                    replay
                ),
            [replay]
        );

    const {
        currentGroup,
        currentFrame,

        visibleLogEntries,

        speed,
        setSpeed,

        isPlaying,
        isReplayComplete,

        play,
        pause,

        restart,
        previousCard,
        nextCard,

        hasPreviousCard,
        hasNextCard,

        currentCardNumber,
        totalCards
    } = useRaceReplay({
        model
    });

    const cardDefinition =
        currentGroup?.cardEvent
            ? CARD_CATALOG_BY_ID[
            currentGroup
                .cardEvent
                .definitionId
            ]
            : null;

    return (
        <section className="raceReplay">
            <header className="raceReplayHeader">
                <div>
                    <span>
                        Race{" "}
                        {replay.raceNumber}
                    </span>

                    <h3>
                        Race replay
                    </h3>
                </div>

                <div className="replayHeaderActions">
                    <button
                        type="button"
                        className="replayExportButton"
                        onClick={() =>
                            downloadRaceReplay(
                                replay
                            )
                        }
                    >
                        Export replay
                    </button>

                    <button
                        type="button"
                        className="replayExitButton"
                        onClick={onExit}
                    >
                        Exit replay
                    </button>
                </div>
            </header>

            <section className="replayRaceContext">
                <ReplayPlayers
                    replay={replay}
                />

                <CurrentSideBetCard
                    sideBet={
                        replay.sideBet
                    }
                />
            </section>

            {isReplayComplete ? (
                <ReplayFinalScreen
                    replay={replay}
                />
            ) : (
                <>
                    <div className="replayProgress">
                        Card{" "}
                        <strong>
                            {currentCardNumber}
                        </strong>
                        {" "}of{" "}
                        <strong>
                            {totalCards}
                        </strong>
                    </div>

                    <Board
                        racers={
                            currentFrame
                                .racers
                        }
                        shortenedBy={
                            currentFrame
                                .shortenedBy
                        }
                        remainingCards={0}
                        deckCounterLabel={
                            "Replay mode"
                        }
                        activeEvent={
                            currentFrame
                                .trigger
                        }
                        activeCardOwner={
                            currentFrame
                                .cardOwner
                        }
                        isAnimating={
                            isPlaying
                        }
                    />

                    <AnimatedCurrentCard
                        card={
                            currentGroup?.cardEvent
                                ? {
                                    definitionId:
                                        currentGroup
                                            .cardEvent
                                            .definitionId,

                                    owner:
                                        currentGroup
                                            .cardEvent
                                            .owner,

                                    name:
                                        currentGroup
                                            .cardEvent
                                            .cardName,

                                    fullName:
                                        (
                                            `${currentGroup.cardEvent.owner}: ` +
                                            `${currentGroup.cardEvent.cardName}`
                                        )
                                }
                                : null
                        }
                        definition={
                            cardDefinition
                        }
                        animationKey={
                            currentGroup?.cardEvent
                                ?.sequence ??
                            null
                        }
                        label="Current replay card"
                        compact
                    />
                </>
            )}

            <ReplayControls
                isPlaying={isPlaying}
                isReplayComplete={
                    isReplayComplete
                }
                hasPreviousCard={
                    hasPreviousCard
                }
                hasNextCard={
                    hasNextCard
                }
                speed={speed}
                onRestart={restart}
                onPrevious={
                    previousCard
                }
                onPlay={play}
                onPause={pause}
                onNext={nextCard}
                onSpeedChange={
                    setSpeed
                }
            />

            {!isReplayComplete && (
                <section className="replayLog">
                    <h4>
                        Replay log
                    </h4>

                    {visibleLogEntries
                        .length === 0 ? (
                        <p>
                            Start the replay
                            to view race events.
                        </p>
                    ) : (
                        visibleLogEntries.map(
                            (
                                entry,
                                index
                            ) => (
                                <p
                                    key={
                                        `${index}-${entry}`
                                    }
                                >
                                    {entry}
                                </p>
                            )
                        )
                    )}
                </section>
            )}
        </section>
    );
}

function ReplayPlayers({
    replay
}: {
    replay:
    CompletedRaceReplay;
}) {
    return (
        <section className="replayPlayers">
            <header>
                <span>
                    Race bets
                </span>

                <h4>
                    Players and tickets
                </h4>
            </header>

            <div className="replayPlayerList">
                {replay.players.map(
                    (player) => (
                        <article
                            key={
                                player.id
                            }
                            className="replayPlayerCard"
                        >
                            <strong>
                                {player.name}
                            </strong>

                            <div className="replayPlayerTickets">
                                {player
                                    .draftedTickets
                                    .map(
                                        (
                                            ticket
                                        ) => (
                                            <DraftedTicketIcon
                                                key={
                                                    ticket.id
                                                }
                                                ticket={
                                                    ticket
                                                }
                                            />
                                        )
                                    )}
                            </div>
                        </article>
                    )
                )}
            </div>
        </section>
    );
}

type ReplayControlsProps = {
    isPlaying:
    boolean;

    isReplayComplete:
    boolean;

    hasPreviousCard:
    boolean;

    hasNextCard:
    boolean;

    speed:
    ReplaySpeed;

    onRestart:
    () => void;

    onPrevious:
    () => void;

    onPlay:
    () => void;

    onPause:
    () => void;

    onNext:
    () => void;

    onSpeedChange:
    (
        speed:
            ReplaySpeed
    ) => void;
};

function ReplayControls({
    isPlaying,
    isReplayComplete,
    hasPreviousCard,
    hasNextCard,
    speed,
    onRestart,
    onPrevious,
    onPlay,
    onPause,
    onNext,
    onSpeedChange
}: ReplayControlsProps) {
    return (
        <>
            <div className="replayControls">
                <button
                    type="button"
                    onClick={onRestart}
                >
                    Restart
                </button>

                <button
                    type="button"
                    disabled={
                        !hasPreviousCard
                    }
                    onClick={onPrevious}
                >
                    Previous card
                </button>

                {isPlaying ? (
                    <button
                        type="button"
                        onClick={onPause}
                    >
                        Pause
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onPlay}
                        disabled={isReplayComplete}
                    >
                        Play
                    </button>
                )}

                <button
                    type="button"
                    disabled={
                        !hasNextCard
                    }
                    onClick={onNext}
                >
                    Next card
                </button>
            </div>

            <div className="replaySpeedControls">
                <span>
                    Playback speed
                </span>

                {REPLAY_SPEEDS.map(
                    (
                        availableSpeed
                    ) => (
                        <button
                            type="button"
                            key={
                                availableSpeed
                            }
                            className={
                                speed ===
                                    availableSpeed
                                    ? "replaySpeedSelected"
                                    : ""
                            }
                            onClick={() =>
                                onSpeedChange(
                                    availableSpeed
                                )
                            }
                        >
                            {availableSpeed}x
                        </button>
                    )
                )}
            </div>
        </>
    );
}

function ReplayFinalScreen({
    replay
}: {
    replay:
    CompletedRaceReplay;
}) {
    return (
        <section className="replayFinalScreen">
            <header className="replayFinalHeader">
                <span>
                    Race{" "}
                    {replay.raceNumber}
                </span>

                <h3>
                    Race finished
                </h3>

                <p>
                    Final podium and betting
                    payouts for this race.
                </p>
            </header>

            <ReplayPodium
                replay={replay}
            />

            <PayoutSummary
                summary={
                    replay.payoutSummary
                }
            />
        </section>
    );
}

function ReplayPodium({
    replay
}: {
    replay:
    CompletedRaceReplay;
}) {
    const sortedPodium =
        [...replay.podium].sort(
            (first, second) =>
                (
                    first.place ??
                    4
                ) -
                (
                    second.place ??
                    4
                )
        );

    return (
        <section className="replayPodium">
            <h4>
                Final podium
            </h4>

            <div className="replayPodiumEntries">
                {sortedPodium.map(
                    (
                        entry,
                        index
                    ) => (
                        <div
                            key={
                                `${entry.racer}-${index}`
                            }
                            className={
                                `replayPodiumEntry ` +
                                `replayPodiumPlace` +
                                `${entry.place ?? 4}`
                            }
                        >
                            <strong>
                                #{entry.place ??
                                    4}
                            </strong>

                            <span>
                                {entry.racer}
                            </span>

                            <small>
                                {entry.status ===
                                    "DQ"
                                    ? "DQ"
                                    : (
                                        entry.status ===
                                            "remaining"
                                            ? "Remaining racer"
                                            : "Finished"
                                    )}
                            </small>
                        </div>
                    )
                )}
            </div>
        </section>
    );
}