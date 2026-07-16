import {
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

    const timersRef =
        useRef<number[]>([]);

    const {
        playEffect
    } = useSound();

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
         * Do not play an old countdown when a player
         * reconnects during an active race.
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

        clearTimers();

        lastPlayedSequenceRef.current =
            latestBurnEvent.sequence;

        setBurnedEvent(
            latestBurnEvent
        );

        setCountdownIndex(0);

        playEffect(
            "countdown-tick",
            {
                volume: 0.7
            }
        );

        onActiveChange?.(
            true
        );

        for (
            let index = 1;
            index <
            COUNTDOWN_VALUES.length;
            index += 1
        ) {
            const timer =
                window.setTimeout(
                    () => {
                        playEffect(
                            index === 3
                                ? "countdown-go"
                                : "countdown-tick",
                            {
                                volume:
                                    index === 3
                                        ? 0.95
                                        : 0.7
                            }
                        );
                        setCountdownIndex(
                            index
                        );
                    },
                    VALUE_DURATION_MS *
                    index
                );

            timersRef.current.push(
                timer
            );
        }

        const closeTimer =
            window.setTimeout(
                () => {
                    setBurnedEvent(
                        null
                    );

                    onActiveChange?.(
                        false
                    );
                },
                VALUE_DURATION_MS *
                COUNTDOWN_VALUES.length
            );

        timersRef.current.push(
            closeTimer
        );

        return clearTimers;
    }, [
        onActiveChange,
        raceEvents
    ]);

    useEffect(() => {
        return () => {
            clearTimers();

            onActiveChange?.(
                false
            );
        };
    }, [
        onActiveChange
    ]);

    function clearTimers() {
        for (
            const timer
            of timersRef.current
        ) {
            window.clearTimeout(
                timer
            );
        }

        timersRef.current = [];
    }

    if (!burnedEvent) {
        return null;
    }

    const countdownValue =
        COUNTDOWN_VALUES[
        countdownIndex
        ];

    return (
        <div
            className="raceCountdownOverlay"
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