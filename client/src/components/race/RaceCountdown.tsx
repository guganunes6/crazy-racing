import {
    useCallback,
    useEffect,
    useRef,
    useState
} from "react";

import type {
    RaceEvent
} from "@crazy-racing/shared";

import {
    useSound
} from "../../audio/useSound";

import "./RaceCountdown.css";

type CardsBurnedEvent =
    Extract<
        RaceEvent,
        { type: "CARDS_BURNED" }
    >;

type CountdownValue =
    | "3"
    | "2"
    | "1"
    | "GO!";

type RaceCountdownProps = {
    raceEvents:
    RaceEvent[];

    paused:
    boolean;

    onActiveChange?:
    (active: boolean) => void;
};

const COUNTDOWN_VALUES:
    CountdownValue[] = [
        "3",
        "2",
        "1",
        "GO!"
    ];

const VALUE_DURATION_MS =
    700;

const RECENT_EVENT_LIMIT_MS =
    8000;

export function RaceCountdown({
    raceEvents,
    paused,
    onActiveChange
}: RaceCountdownProps) {
    const [
        burnedEvent,
        setBurnedEvent
    ] =
        useState<CardsBurnedEvent | null>(
            null
        );

    const [
        countdownIndex,
        setCountdownIndex
    ] =
        useState(0);

    const lastPlayedSequenceRef =
        useRef(0);

    const timerRef =
        useRef<number | null>(
            null
        );

    const timerStartedAtRef =
        useRef(0);

    const remainingMsRef =
        useRef(
            VALUE_DURATION_MS
        );

    const countdownIndexRef =
        useRef(0);

    const activeRef =
        useRef(false);

    const pausedRef =
        useRef(paused);

    const {
        playEffect
    } = useSound();

    const clearTimer =
        useCallback(() => {
            if (
                timerRef.current !==
                null
            ) {
                window.clearTimeout(
                    timerRef.current
                );

                timerRef.current =
                    null;
            }
        }, []);

    const finishCountdown =
        useCallback(() => {
            clearTimer();

            activeRef.current =
                false;

            setBurnedEvent(
                null
            );

            onActiveChange?.(
                false
            );
        }, [
            clearTimer,
            onActiveChange
        ]);

    const scheduleNextStepRef =
        useRef<() => void>(
            () => undefined
        );

    const advanceCountdown =
        useCallback(() => {
            if (
                !activeRef.current ||
                pausedRef.current
            ) {
                return;
            }

            const nextIndex =
                countdownIndexRef.current +
                1;

            if (
                nextIndex >=
                COUNTDOWN_VALUES.length
            ) {
                finishCountdown();
                return;
            }

            countdownIndexRef.current =
                nextIndex;

            setCountdownIndex(
                nextIndex
            );

            playEffect(
                nextIndex === 3
                    ? "countdown-go"
                    : "countdown-tick",
                {
                    volume:
                        nextIndex === 3
                            ? 0.95
                            : 0.7
                }
            );

            remainingMsRef.current =
                VALUE_DURATION_MS;

            scheduleNextStepRef.current();
        }, [
            finishCountdown,
            playEffect
        ]);

    const scheduleNextStep =
        useCallback(() => {
            clearTimer();

            if (
                !activeRef.current ||
                pausedRef.current
            ) {
                return;
            }

            const delay =
                Math.max(
                    1,
                    remainingMsRef.current
                );

            timerStartedAtRef.current =
                performance.now();

            timerRef.current =
                window.setTimeout(
                    () => {
                        timerRef.current =
                            null;

                        remainingMsRef.current =
                            VALUE_DURATION_MS;

                        advanceCountdown();
                    },
                    delay
                );
        }, [
            advanceCountdown,
            clearTimer
        ]);

    scheduleNextStepRef.current =
        scheduleNextStep;

    useEffect(() => {
        const latestBurnEvent =
            [...raceEvents]
                .reverse()
                .find(
                    (
                        event
                    ): event is CardsBurnedEvent =>
                        event.type ===
                        "CARDS_BURNED"
                );

        if (
            !latestBurnEvent ||
            latestBurnEvent.sequence <=
            lastPlayedSequenceRef.current
        ) {
            return;
        }

        /*
         * Do not play an old countdown when a player reconnects
         * during an already active race.
         */
        if (
            Date.now() -
            latestBurnEvent.createdAt >
            RECENT_EVENT_LIMIT_MS
        ) {
            lastPlayedSequenceRef.current =
                latestBurnEvent.sequence;

            return;
        }

        clearTimer();

        lastPlayedSequenceRef.current =
            latestBurnEvent.sequence;

        countdownIndexRef.current =
            0;

        remainingMsRef.current =
            VALUE_DURATION_MS;

        activeRef.current =
            true;

        setBurnedEvent(
            latestBurnEvent
        );

        setCountdownIndex(
            0
        );

        playEffect(
            "countdown-tick",
            {
                volume: 0.7
            }
        );

        onActiveChange?.(
            true
        );

        scheduleNextStep();

        return clearTimer;
    }, [
        clearTimer,
        onActiveChange,
        playEffect,
        raceEvents,
        scheduleNextStep
    ]);

    useEffect(() => {
        pausedRef.current =
            paused;

        if (!activeRef.current) {
            return;
        }

        if (paused) {
            if (
                timerRef.current !==
                null
            ) {
                const elapsed =
                    performance.now() -
                    timerStartedAtRef.current;

                remainingMsRef.current =
                    Math.max(
                        1,
                        remainingMsRef.current -
                        elapsed
                    );
            }

            clearTimer();
            return;
        }

        scheduleNextStep();
    }, [
        clearTimer,
        paused,
        scheduleNextStep
    ]);

    useEffect(() => {
        return () => {
            clearTimer();

            activeRef.current =
                false;

            onActiveChange?.(
                false
            );
        };
    }, [
        clearTimer,
        onActiveChange
    ]);

    if (!burnedEvent) {
        return null;
    }

    const countdownValue =
        COUNTDOWN_VALUES[
        countdownIndex
        ];

    return (
        <div
            className={[
                "raceCountdownOverlay",

                paused
                    ? "raceCountdownPaused"
                    : ""
            ]
                .filter(Boolean)
                .join(" ")}
            aria-live="assertive"
        >
            <div className="raceCountdownBurnedCards">
                <span className="raceCountdownBurnLabel">
                    {burnedEvent.reason ===
                        "RACE_START"
                        ? "Initial cards discarded"
                        : "Cards discarded after reshuffle"}
                </span>

                <div className="raceCountdownCardList">
                    {[
                        0,
                        1,
                        2
                    ].map(
                        (
                            cardIndex
                        ) => (
                            <HiddenDiscardCard
                                key={
                                    cardIndex
                                }
                                cardIndex={
                                    cardIndex
                                }
                                countdownIndex={
                                    countdownIndex
                                }
                            />
                        )
                    )}
                </div>
            </div>

            <div
                key={
                    `${burnedEvent.sequence}-${countdownValue}`
                }
                className={[
                    "raceCountdownValue",

                    countdownValue ===
                        "GO!"
                        ? "raceCountdownGo"
                        : ""
                ]
                    .filter(Boolean)
                    .join(" ")}
            >
                {countdownValue}
            </div>
        </div>
    );
}

function HiddenDiscardCard({
    cardIndex,
    countdownIndex
}: {
    cardIndex:
    number;

    countdownIndex:
    number;
}) {
    /*
     * Index 0 disappears while "3" is shown.
     * Index 1 disappears while "2" is shown.
     * Index 2 disappears while "1" is shown.
     */
    const isDiscarding =
        countdownIndex ===
        cardIndex;

    const hasBeenDiscarded =
        countdownIndex >
        cardIndex;

    return (
        <div
            className={[
                "raceCountdownCard",

                `raceCountdownCard${cardIndex + 1}`,

                isDiscarding
                    ? "raceCountdownCardDiscarding"
                    : "",

                hasBeenDiscarded
                    ? "raceCountdownCardDiscarded"
                    : ""
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <div className="raceCountdownCardBack">
                <strong>
                    CRAZY
                </strong>

                <span>
                    RACING
                </span>
            </div>
        </div>
    );
}