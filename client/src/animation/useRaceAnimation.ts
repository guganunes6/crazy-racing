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

type RaceStateEvent = Extract<
    RaceEvent,
    { type: "RACE_STATE" }
>;

type CardOwner =
    | RacerName
    | "GREEN";

type AnimatedRaceStep = {
    snapshot: RaceStateEvent;
    trigger: RaceEvent | null;
    cardOwner: CardOwner | null;
};

type UseRaceAnimationOptions = {
    racers: RacerState[];
    raceEvents: RaceEvent[];
    raceNumber: number;
    enabled: boolean;
};

const STEP_DURATION: Record<
    RaceStateEvent["source"],
    number
> = {
    CARD: 180,
    MOVE: 520,
    SWERVE: 480,
    COLLISION: 560,
    FALL: 440,
    RECOVER: 440,
    TURN: 440,
    FOLD: 650,
    FINISH: 560,
    DQ: 560
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

    const queueRef =
        useRef<AnimatedRaceStep[]>([]);

    const processingRef =
        useRef(false);

    const lastQueuedSequenceRef =
        useRef(0);

    const generationRef =
        useRef(0);

    useEffect(() => {
        generationRef.current += 1;

        queueRef.current = [];
        processingRef.current = false;
        lastQueuedSequenceRef.current = 0;

        setVisualRacers(racers);
        setActiveEvent(null);
        setActiveCardOwner(null);
        setIsAnimating(false);
    }, [raceNumber]);

    useEffect(() => {
        if (!enabled) {
            queueRef.current = [];
            processingRef.current = false;

            lastQueuedSequenceRef.current =
                raceEvents.reduce(
                    (highest, event) =>
                        Math.max(
                            highest,
                            event.sequence
                        ),
                    0
                );

            setVisualRacers(racers);
            setActiveEvent(null);
            setActiveCardOwner(null);
            setIsAnimating(false);

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

        for (const snapshot of newSnapshots) {
            const trigger =
                findTriggerEvent(
                    raceEvents,
                    snapshot.sequence
                );

            const cardOwner =
                findCardOwner(
                    raceEvents,
                    snapshot.sequence
                );

            queueRef.current.push({
                snapshot,
                trigger,
                cardOwner
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
            setVisualRacers(racers);
        }

        void processQueue();

        async function processQueue() {
            if (processingRef.current) {
                return;
            }

            processingRef.current = true;
            setIsAnimating(true);

            const generation =
                generationRef.current;

            while (
                queueRef.current.length > 0 &&
                generation ===
                generationRef.current
            ) {
                const step =
                    queueRef.current.shift();

                if (!step) {
                    continue;
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
                    STEP_DURATION[
                    step.snapshot.source
                    ]
                );
            }

            if (
                generation ===
                generationRef.current
            ) {
                processingRef.current = false;

                setActiveEvent(null);
                setActiveCardOwner(null);
                setIsAnimating(false);
                setVisualRacers(racers);
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
        isAnimating
    };
}

function findTriggerEvent(
    events: RaceEvent[],
    snapshotSequence: number
): RaceEvent | null {
    for (
        let index =
            events.length - 1;
        index >= 0;
        index -= 1
    ) {
        const event =
            events[index];

        if (
            event.sequence <
            snapshotSequence &&
            event.type !==
            "RACE_STATE"
        ) {
            return event;
        }
    }

    return null;
}

function findCardOwner(
    events: RaceEvent[],
    snapshotSequence: number
): CardOwner | null {
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
            return event.owner;
        }
    }

    return null;
}

function wait(
    milliseconds: number
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