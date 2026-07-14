import {
    useMemo
} from "react";

import {
    CARD_CATALOG_BY_ID,
    type CompletedRaceReplay
} from "@crazy-racing/shared";

import { Board } from "../../board/Board";
import { RaceCardView } from "../cards/RaceCardView";

import {
    buildRaceReplay
} from "../../replay/buildRaceReplay";

import {
    useRaceReplay
} from "../../replay/useRaceReplay";

import type {
    ReplaySpeed
} from "../../replay/ReplayTypes";

import "./RaceReplay.css";

type RaceReplayProps = {
    replay: CompletedRaceReplay;
    onExit: () => void;
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
            currentGroup.cardEvent
                .definitionId
            ]
            : null;

    return (
        <section className="raceReplay">
            <header className="raceReplayHeader">
                <div>
                    <span>
                        Race {replay.raceNumber}
                    </span>

                    <h3>
                        Race replay
                    </h3>
                </div>

                <button
                    type="button"
                    className="replayExitButton"
                    onClick={onExit}
                >
                    Exit replay
                </button>
            </header>

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
                    currentFrame.racers
                }
                shortenedBy={
                    currentFrame.shortenedBy
                }
                remainingCards={0}
                deckCounterLabel="Replay mode"
                activeEvent={
                    currentFrame.trigger
                }
                activeCardOwner={
                    currentFrame.cardOwner
                }
                isAnimating={
                    isPlaying
                }
            />

            <section className="replayCurrentCard">
                <h4>
                    Current card
                </h4>

                {cardDefinition ? (
                    <RaceCardView
                        definition={
                            cardDefinition
                        }
                        size="compact"
                        disabled
                    />
                ) : (
                    <p>
                        The replay has not started.
                    </p>
                )}
            </section>

            <div className="replayControls">
                <button
                    type="button"
                    onClick={restart}
                >
                    Restart
                </button>

                <button
                    type="button"
                    disabled={
                        !hasPreviousCard
                    }
                    onClick={
                        previousCard
                    }
                >
                    Previous card
                </button>

                {isPlaying ? (
                    <button
                        type="button"
                        onClick={pause}
                    >
                        Pause
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={play}
                    >
                        Play
                    </button>
                )}

                <button
                    type="button"
                    disabled={
                        !hasNextCard
                    }
                    onClick={nextCard}
                >
                    Next card
                </button>
            </div>

            <div className="replaySpeedControls">
                <span>
                    Playback speed
                </span>

                {REPLAY_SPEEDS.map(
                    (availableSpeed) => (
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
                                setSpeed(
                                    availableSpeed
                                )
                            }
                        >
                            {availableSpeed}x
                        </button>
                    )
                )}
            </div>

            <section className="replayLog">
                <h4>
                    Replay log
                </h4>

                {visibleLogEntries.length ===
                    0 ? (
                    <p>
                        Start the replay to view
                        race events.
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
        </section>
    );
}