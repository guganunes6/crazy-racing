import {
    useEffect,
    useRef,
    useState
} from "react";

import type {
    RaceEvent,
    RacerName,
    RacerState
} from "@crazy-racing/shared";

import {
    CARD_REVEAL_DURATION_MS,
    RACE_ANIMATION_STEP_DURATION_MS
} from "./AnimationTiming";

type RaceStateEvent = Extract<
    RaceEvent,
    { type: "RACE_STATE" }
>;

type CardDrawnEvent = Extract<
    RaceEvent,
    { type: "CARD_DRAWN" }
>;

type CardOwner =
    | RacerName
    | "GREEN";

type AnimatedRaceStep = {
    snapshot:
    RaceStateEvent;

    trigger:
    RaceEvent | null;

    cardOwner:
    CardOwner | null;

    cardSequence:
    number | null;
};

type UseRaceAnimationOptions = {
    racers:
    RacerState[];

    raceEvents:
    RaceEvent[];

    raceNumber:
    number;

    enabled:
    boolean;
};

export function useRaceAnimation({
    racers,
    raceEvents,
    raceNumber,
    enabled
}: UseRaceAnimationOptions) {
    const [
        visualRacers,
        setVisualRacers
    ] = useState<RacerState[]>(
        racers
    );

    const [
        activeEvent,
        setActiveEvent
    ] = useState<RaceEvent | null>(
        null
    );

    const [
        activeCardOwner,
        setActiveCardOwner
    ] = useState<CardOwner | null>(
        null
    );

    const [
        isAnimating,
        setIsAnimating
    ] = useState(false);

    const [
        isCardRevealPending,
        setIsCardRevealPending
    ] = useState(false);

    const queueRef =
        useRef<AnimatedRaceStep[]>([]);

    const processingRef =
        useRef(false);

    const lastQueuedSequenceRef =
        useRef(0);

    const lastPlayedCardSequenceRef =
        useRef<number | null>(
            null
        );

    const generationRef =
        useRef(0);

    useEffect(() => {
        generationRef.current += 1;

        queueRef.current = [];
        processingRef.current = false;

        lastQueuedSequenceRef.current = 0;
        lastPlayedCardSequenceRef.current =
            null;

        setVisualRacers(racers);
        setActiveEvent(null);
        setActiveCardOwner(null);
        setIsAnimating(false);
        setIsCardRevealPending(false);
    }, [raceNumber]);

    useEffect(() => {
        if (!enabled) {
            queueRef.current = [];
            processingRef.current = false;

            lastQueuedSequenceRef.current =
                raceEvents.reduce(
                    (
                        highest,
                        event
                    ) =>
                        Math.max(
                            highest,
                            event.sequence
                        ),
                    0
                );

            const latestCard =
                findLatestCardEvent(
                    raceEvents
                );

            lastPlayedCardSequenceRef.current =
                latestCard?.sequence ??
                null;

            setVisualRacers(racers);
            setActiveEvent(null);
            setActiveCardOwner(null);
            setIsAnimating(false);
            setIsCardRevealPending(false);

            return;
        }

        const newSnapshots =
            raceEvents.filter(
                (
                    event
                ): event is RaceStateEvent =>
                    event.type ===
                    "RACE_STATE" &&
                    event.sequence >
                    lastQueuedSequenceRef.current
            );

        for (
            const snapshot
            of newSnapshots
        ) {
            const trigger =
                findTriggerEvent(
                    raceEvents,
                    snapshot
                );

            const cardEvent =
                findCardEvent(
                    raceEvents,
                    snapshot.sequence
                );

            queueRef.current.push({
                snapshot,
                trigger,

                cardOwner:
                    cardEvent?.owner ??
                    null,

                cardSequence:
                    cardEvent?.sequence ??
                    null
            });

            lastQueuedSequenceRef.current =
                Math.max(
                    lastQueuedSequenceRef.current,
                    snapshot.sequence
                );
        }

        if (
            newSnapshots.length === 0 &&
            !processingRef.current
        ) {
            setVisualRacers(
                racers
            );
        }

        void processQueue();

        async function processQueue() {
            if (
                processingRef.current
            ) {
                return;
            }

            processingRef.current = true;
            setIsAnimating(true);

            const generation =
                generationRef.current;

            while (
                queueRef.current.length >
                0 &&
                generation ===
                generationRef.current
            ) {
                const step =
                    queueRef.current.shift();

                if (!step) {
                    continue;
                }

                const isFirstStepForCard =
                    step.cardSequence !==
                    null &&
                    step.cardSequence !==
                    lastPlayedCardSequenceRef
                        .current;

                if (
                    isFirstStepForCard
                ) {
                    /*
                     * The server has already sent the
                     * resulting racer state, but the
                     * visual board must stay unchanged
                     * until the newly drawn card has
                     * finished flipping.
                     */
                    setActiveEvent(null);
                    setActiveCardOwner(null);
                    setIsCardRevealPending(
                        true
                    );

                    await wait(
                        CARD_REVEAL_DURATION_MS
                    );

                    if (
                        generation !==
                        generationRef.current
                    ) {
                        break;
                    }

                    lastPlayedCardSequenceRef.current =
                        step.cardSequence;

                    setIsCardRevealPending(
                        false
                    );
                }

                setActiveEvent(
                    step.trigger
                );

                setActiveCardOwner(
                    step.cardOwner
                );

                setVisualRacers(
                    step.snapshot.racers
                );

                await wait(
                    RACE_ANIMATION_STEP_DURATION_MS[
                    step.snapshot.source
                    ]
                );
            }

            if (
                generation ===
                generationRef.current
            ) {
                processingRef.current =
                    false;

                setActiveEvent(null);
                setActiveCardOwner(null);
                setIsAnimating(false);
                setIsCardRevealPending(false);

                setVisualRacers(
                    racers
                );
            }
        }
    }, [
        enabled,
        raceEvents,
        racers
    ]);

    return {
        visualRacers,
        activeEvent,
        activeCardOwner,
        isAnimating,
        isCardRevealPending
    };
}

function findTriggerEvent(
    events:
        RaceEvent[],

    snapshot:
        RaceStateEvent
): RaceEvent | null {
    const acceptedTypes =
        getAcceptedTriggerTypes(
            snapshot.source
        );

    for (
        let index =
            events.length - 1;
        index >= 0;
        index -= 1
    ) {
        const event =
            events[index];

        if (
            event.sequence >=
            snapshot.sequence
        ) {
            continue;
        }

        if (
            acceptedTypes.includes(
                event.type
            )
        ) {
            return event;
        }
    }

    return null;
}

function getAcceptedTriggerTypes(
    source:
        RaceStateEvent["source"]
): RaceEvent["type"][] {
    switch (source) {
        case "CARD":
            return [
                "CARD_DRAWN"
            ];

        case "MOVE":
            return [
                "RACER_MOVED"
            ];

        case "SWERVE":
            return [
                "RACER_SWERVED"
            ];

        case "COLLISION":
            return [
                "COLLISION"
            ];

        case "FALL":
            return [
                "RACER_FELL",
                "RACER_DISQUALIFIED"
            ];

        case "RECOVER":
            return [
                "RACER_RECOVERED"
            ];

        case "TURN":
            return [
                "RACER_TURNED"
            ];

        case "FOLD":
            return [
                "TRACK_FOLDED"
            ];

        case "FINISH":
            return [
                "RACER_FINISHED"
            ];

        case "DQ":
            return [
                "RACER_DISQUALIFIED"
            ];
    }
}

function findCardEvent(
    events:
        RaceEvent[],

    snapshotSequence:
        number
): CardDrawnEvent | null {
    for (
        let index =
            events.length - 1;
        index >= 0;
        index -= 1
    ) {
        const event =
            events[index];

        if (
            event.sequence >=
            snapshotSequence
        ) {
            continue;
        }

        if (
            event.type ===
            "CARD_DRAWN"
        ) {
            return event;
        }
    }

    return null;
}

function findLatestCardEvent(
    events:
        RaceEvent[]
): CardDrawnEvent | null {
    for (
        let index =
            events.length - 1;
        index >= 0;
        index -= 1
    ) {
        const event =
            events[index];

        if (
            event.type ===
            "CARD_DRAWN"
        ) {
            return event;
        }
    }

    return null;
}

function wait(
    milliseconds:
        number
): Promise<void> {
    return new Promise(
        (resolve) => {
            window.setTimeout(
                resolve,
                milliseconds
            );
        }
    );
}