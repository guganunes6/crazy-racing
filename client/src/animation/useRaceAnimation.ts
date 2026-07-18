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

import {
    useSound
} from "../audio/useSound";

type RaceStateEvent =
    Extract<
        RaceEvent,
        {
            type:
            "RACE_STATE";
        }
    >;

type CardDrawnEvent =
    Extract<
        RaceEvent,
        {
            type:
            "CARD_DRAWN";
        }
    >;

type RacerMovedEvent =
    Extract<
        RaceEvent,
        {
            type:
            "RACER_MOVED";
        }
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

const MOVE_ONE_SPACE_DURATION_MS =
    185;

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
        () =>
            cloneRacers(
                racers
            )
    );

    const [
        activeEvent,
        setActiveEvent
    ] =
        useState<RaceEvent | null>(
            null
        );

    const [
        activeCardOwner,
        setActiveCardOwner
    ] =
        useState<CardOwner | null>(
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
        useRef<
            AnimatedRaceStep[]
        >([]);

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

    const visualRacersRef =
        useRef<RacerState[]>(
            cloneRacers(
                racers
            )
        );

    const {
        playEffect
    } = useSound();

    function applyVisualRacers(nextRacers: RacerState[]): void {
        if (sameRacers(visualRacersRef.current, nextRacers)) {
            return;
        }

        const cloned = cloneRacers(nextRacers);

        visualRacersRef.current = cloned;
        setVisualRacers(cloned);
    }

    useEffect(() => {
        generationRef.current += 1;

        queueRef.current = [];
        processingRef.current =
            false;

        lastQueuedSequenceRef.current =
            0;

        lastPlayedCardSequenceRef.current =
            null;

        applyVisualRacers(
            racers
        );

        setActiveEvent(
            null
        );

        setActiveCardOwner(
            null
        );

        setIsAnimating(
            false
        );

        setIsCardRevealPending(
            false
        );
    }, [raceNumber]);

    useEffect(() => {
        if (
            !enabled
        ) {
            queueRef.current = [];

            processingRef.current =
                false;

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
                latestCard
                    ?.sequence ??
                null;

            applyVisualRacers(
                racers
            );

            setActiveEvent(
                null
            );

            setActiveCardOwner(
                null
            );

            setIsAnimating(
                false
            );

            setIsCardRevealPending(
                false
            );

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
                    lastQueuedSequenceRef
                        .current
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
                    cardEvent
                        ?.sequence ??
                    null
            });

            lastQueuedSequenceRef.current =
                Math.max(
                    lastQueuedSequenceRef
                        .current,
                    snapshot.sequence
                );
        }

        if (
            newSnapshots.length ===
            0 &&
            !processingRef.current
        ) {
            applyVisualRacers(
                racers
            );
        }

        if (
            queueRef.current.length > 0 &&
            !processingRef.current
        ) {
            void processQueue();
        }

        async function processQueue(): Promise<void> {
            if (
                processingRef.current
            ) {
                return;
            }

            processingRef.current =
                true;

            setIsAnimating(
                true
            );

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

                const firstStepForCard =
                    step.cardSequence !==
                    null &&
                    step.cardSequence !==
                    lastPlayedCardSequenceRef
                        .current;

                if (
                    firstStepForCard
                ) {
                    setActiveEvent(
                        null
                    );

                    setActiveCardOwner(
                        null
                    );

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

                playRaceEventSound(
                    step.trigger,
                    playEffect
                );

                setActiveCardOwner(
                    step.cardOwner
                );

                if (
                    step.trigger
                        ?.type ===
                    "RACER_MOVED" &&
                    Math.abs(
                        step.trigger
                            .toPosition -
                        step.trigger
                            .fromPosition
                    ) > 0
                ) {
                    await playMovementBySpace(
                        step.trigger,
                        step.snapshot
                            .racers,
                        generation
                    );
                } else {
                    applyVisualRacers(
                        mergeSnapshotWithoutJumpingOtherRacers(
                            visualRacersRef
                                .current,
                            step.snapshot
                                .racers,
                            step.trigger
                        )
                    );

                    await wait(
                        RACE_ANIMATION_STEP_DURATION_MS[
                        step.snapshot
                            .source
                        ]
                    );
                }
            }

            if (
                generation ===
                generationRef.current
            ) {
                processingRef.current =
                    false;

                setActiveEvent(
                    null
                );

                setActiveCardOwner(
                    null
                );

                setIsAnimating(
                    false
                );

                setIsCardRevealPending(
                    false
                );

                applyVisualRacers(
                    racers
                );
            }
        }

        async function playMovementBySpace(
            movement:
                RacerMovedEvent,

            finalRacers:
                RacerState[],

            generation:
                number
        ): Promise<void> {
            const direction =
                movement.toPosition >
                    movement.fromPosition
                    ? 1
                    : -1;

            const numberOfSteps =
                Math.abs(
                    movement.toPosition -
                    movement.fromPosition
                );

            for (
                let stepNumber = 1;
                stepNumber <=
                numberOfSteps;
                stepNumber += 1
            ) {
                if (
                    generation !==
                    generationRef.current
                ) {
                    return;
                }

                const nextPosition =
                    movement.fromPosition +
                    direction *
                    stepNumber;

                const finalStep =
                    stepNumber ===
                    numberOfSteps;

                const nextRacers =
                    mergeMovementPosition(
                        visualRacersRef
                            .current,
                        finalRacers,
                        movement.racer,
                        nextPosition,
                        finalStep
                    );

                applyVisualRacers(
                    nextRacers
                );

                playEffect(
                    movement.crawling
                        ? "crawl"
                        : "movement-step",
                    {
                        volume:
                            movement.crawling
                                ? 0.72
                                : 0.42,

                        playbackRate: 1
                    }
                );

                await wait(
                    MOVE_ONE_SPACE_DURATION_MS
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

/**
 * Animates only the mascot belonging to the current
 * RACER_MOVED event.
 *
 * Other mascots retain their current visual state.
 * This prevents later green-card snapshots from moving
 * them immediately to their final positions.
 */
function mergeMovementPosition(
    currentRacers:
        RacerState[],

    finalRacers:
        RacerState[],

    movingRacer:
        RacerName,

    nextPosition:
        number,

    isFinalStep:
        boolean
): RacerState[] {
    const finalMovingRacer =
        finalRacers.find(
            (racer) =>
                racer.name ===
                movingRacer
        );

    return currentRacers.map(
        (
            currentRacer
        ) => {
            if (
                currentRacer.name !==
                movingRacer
            ) {
                return {
                    ...currentRacer
                };
            }

            if (
                !finalMovingRacer
            ) {
                return {
                    ...currentRacer,
                    position:
                        nextPosition
                };
            }

            if (
                isFinalStep
            ) {
                return {
                    ...finalMovingRacer
                };
            }

            return {
                ...currentRacer,

                position:
                    nextPosition,

                /*
                 * Lane changes are animated by a
                 * separate SWERVE snapshot.
                 */
                lane:
                    currentRacer.lane,

                facing:
                    finalMovingRacer
                        .facing,

                fallen:
                    currentRacer
                        .fallen,

                dq: false,
                finished: false
            };
        }
    );
}

/**
 * For non-movement snapshots, apply the complete state.
 *
 * For movement snapshots, only the current movement
 * racer may use the snapshot state. This additional
 * guard prevents unrelated mascots from jumping during
 * green-card event playback.
 */
function mergeSnapshotWithoutJumpingOtherRacers(
    currentRacers:
        RacerState[],

    snapshotRacers:
        RacerState[],

    trigger:
        RaceEvent | null
): RacerState[] {
    if (
        trigger?.type !==
        "RACER_MOVED"
    ) {
        return cloneRacers(
            snapshotRacers
        );
    }

    return currentRacers.map(
        (
            currentRacer
        ) => {
            if (
                currentRacer.name !==
                trigger.racer
            ) {
                return {
                    ...currentRacer
                };
            }

            const snapshotRacer =
                snapshotRacers.find(
                    (candidate) =>
                        candidate.name ===
                        trigger.racer
                );

            return snapshotRacer
                ? {
                    ...snapshotRacer
                }
                : {
                    ...currentRacer
                };
        }
    );
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
        RaceStateEvent[
        "source"
        ]
): RaceEvent["type"][] {
    switch (
    source
    ) {
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

function cloneRacers(
    racers:
        RacerState[]
): RacerState[] {
    return racers.map(
        (
            racer
        ) => ({
            ...racer
        })
    );
}

function sameRacers(
    a: RacerState[],
    b: RacerState[],
): boolean {
    if (a === b) {
        return true;
    }

    if (a.length !== b.length) {
        return false;
    }

    for (let i = 0; i < a.length; i++) {
        const ra = a[i];
        const rb = b[i];

        if (
            ra.name !== rb.name ||
            ra.position !== rb.position ||
            ra.lane !== rb.lane ||
            ra.facing !== rb.facing ||
            ra.fallen !== rb.fallen ||
            ra.finished !== rb.finished ||
            ra.dq !== rb.dq
        ) {
            return false;
        }
    }

    return true;
}

function wait(
    milliseconds:
        number
): Promise<void> {
    return new Promise(
        (
            resolve
        ) => {
            window.setTimeout(
                resolve,
                milliseconds
            );
        }
    );
}

function playRaceEventSound(
    event:
        RaceEvent | null,

    playEffect: (
        name:
            import(
            "../audio/SoundManager"
            ).SoundEffectName,
        options?: {
            volume?: number;
            playbackRate?: number;
        }
    ) => void
): void {
    if (!event) {
        return;
    }

    switch (event.type) {
        case "RACER_SWERVED":
            playEffect(
                "swerve",
                {
                    volume: 0.65
                }
            );
            return;

        case "COLLISION":
            playEffect(
                "collision",
                {
                    volume: 0.9
                }
            );
            return;

        case "RACER_FELL":
            playEffect(
                "fall",
                {
                    volume: 0.8
                }
            );
            return;

        case "RACER_RECOVERED":
            playEffect(
                "recover",
                {
                    volume: 0.7
                }
            );
            return;

        case "RACER_TURNED":
            playEffect(
                "turn",
                {
                    volume: 0.65
                }
            );
            return;

        case "RACER_FINISHED":
            playEffect(
                "finish",
                {
                    volume: 1
                }
            );
            return;

        case "RACER_DISQUALIFIED":
            playEffect(
                "dq",
                {
                    volume: 0.9
                }
            );
            return;

        case "TRACK_FOLDED":
            playEffect(
                "fold",
                {
                    volume: 0.9
                }
            );
            return;

        case "DECK_RESHUFFLED":
            playEffect(
                "reshuffle",
                {
                    volume: 0.75
                }
            );
            return;

        default:
            return;
    }
}