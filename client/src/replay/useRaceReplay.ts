import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";

import {
    CARD_REVEAL_DURATION_MS
} from "../animation/AnimationTiming";

import type {
    RaceReplayModel,
    ReplayFrame,
    ReplaySpeed
} from "./ReplayTypes";

const BASE_FRAME_DURATION =
    600;

type UseRaceReplayOptions = {
    model:
    RaceReplayModel;
};

export function useRaceReplay({
    model
}: UseRaceReplayOptions) {
    const [
        cardGroupIndex,
        setCardGroupIndex
    ] = useState(-1);

    /*
     * -1 means that the card is visible and
     * flipping, but its first consequence frame
     * has not yet been applied.
     */
    const [
        frameIndex,
        setFrameIndex
    ] = useState(0);

    const [
        speed,
        setSpeed
    ] = useState<ReplaySpeed>(
        1
    );

    const [
        isPlaying,
        setIsPlaying
    ] = useState(false);

    const [
        isRevealingCard,
        setIsRevealingCard
    ] = useState(false);

    const timerRef =
        useRef<number | null>(
            null
        );

    const currentGroup =
        cardGroupIndex >= 0
            ? (
                model.cardGroups[
                cardGroupIndex
                ] ?? null
            )
            : null;

    const previousVisualFrame =
        useMemo<ReplayFrame>(() => {
            if (
                cardGroupIndex <= 0
            ) {
                return (
                    model.initialFrame
                );
            }

            const previousGroup =
                model.cardGroups[
                cardGroupIndex - 1
                ];

            return (
                previousGroup?.frames[
                previousGroup
                    .frames
                    .length - 1
                ] ??
                model.initialFrame
            );
        }, [
            cardGroupIndex,
            model.cardGroups,
            model.initialFrame
        ]);

    const currentFrame =
        useMemo<ReplayFrame>(() => {
            if (!currentGroup) {
                return (
                    model.initialFrame
                );
            }

            if (
                frameIndex < 0
            ) {
                return (
                    previousVisualFrame
                );
            }

            return (
                currentGroup.frames[
                frameIndex
                ] ??
                currentGroup.frames[
                currentGroup
                    .frames
                    .length - 1
                ] ??
                previousVisualFrame
            );
        }, [
            currentGroup,
            frameIndex,
            model.initialFrame,
            previousVisualFrame
        ]);

    const visibleLogEntries =
        useMemo(() => {
            if (
                cardGroupIndex < 0
            ) {
                return [];
            }

            const entries:
                string[] = [];

            for (
                let groupIndex = 0;
                groupIndex <=
                cardGroupIndex;
                groupIndex += 1
            ) {
                const group =
                    model.cardGroups[
                    groupIndex
                    ];

                if (!group) {
                    continue;
                }

                const maximumFrameIndex =
                    groupIndex ===
                        cardGroupIndex
                        ? frameIndex
                        : (
                            group.frames
                                .length - 1
                        );

                if (
                    maximumFrameIndex <
                    0
                ) {
                    continue;
                }

                for (
                    let currentFrameIndex =
                        0;
                    currentFrameIndex <=
                    maximumFrameIndex;
                    currentFrameIndex +=
                    1
                ) {
                    const frame =
                        group.frames[
                        currentFrameIndex
                        ];

                    if (frame) {
                        entries.push(
                            ...frame
                                .logEntries
                        );
                    }
                }
            }

            return entries;
        }, [
            cardGroupIndex,
            frameIndex,
            model.cardGroups
        ]);

    const finalGroupIndex =
        model.cardGroups.length -
        1;

    const finalGroup =
        finalGroupIndex >= 0
            ? model.cardGroups[
            finalGroupIndex
            ]
            : null;

    const finalFrameIndex =
        finalGroup
            ? (
                finalGroup.frames
                    .length - 1
            )
            : -1;

    const isReplayComplete =
        finalGroupIndex >= 0 &&
        cardGroupIndex ===
        finalGroupIndex &&
        frameIndex ===
        finalFrameIndex &&
        !isRevealingCard;

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

    const restart =
        useCallback(() => {
            clearTimer();

            setIsPlaying(false);
            setIsRevealingCard(false);
            setCardGroupIndex(-1);
            setFrameIndex(0);
        }, [clearTimer]);

    const pause =
        useCallback(() => {
            clearTimer();
            setIsPlaying(false);
            setIsRevealingCard(false);
        }, [clearTimer]);

    const beginCardReveal =
        useCallback(
            (
                nextGroupIndex:
                    number
            ) => {
                setCardGroupIndex(
                    nextGroupIndex
                );

                setFrameIndex(-1);
                setIsRevealingCard(true);
            },
            []
        );

    const moveToNextFrame =
        useCallback((): boolean => {
            if (
                model.cardGroups
                    .length === 0
            ) {
                return false;
            }

            if (
                cardGroupIndex < 0
            ) {
                beginCardReveal(0);
                return true;
            }

            const group =
                model.cardGroups[
                cardGroupIndex
                ];

            if (!group) {
                return false;
            }

            if (
                frameIndex < 0
            ) {
                setIsRevealingCard(
                    false
                );

                setFrameIndex(0);

                return true;
            }

            if (
                frameIndex <
                group.frames.length -
                1
            ) {
                setFrameIndex(
                    (current) =>
                        current + 1
                );

                return true;
            }

            if (
                cardGroupIndex <
                model.cardGroups
                    .length - 1
            ) {
                beginCardReveal(
                    cardGroupIndex + 1
                );

                return true;
            }

            return false;
        }, [
            beginCardReveal,
            cardGroupIndex,
            frameIndex,
            model.cardGroups
        ]);

    const play =
        useCallback(() => {
            if (
                model.cardGroups
                    .length === 0
            ) {
                return;
            }

            if (
                isReplayComplete
            ) {
                return;
            }

            setIsPlaying(true);
        }, [
            isReplayComplete,
            model.cardGroups.length
        ]);

    const previousCard =
        useCallback(() => {
            clearTimer();
            setIsPlaying(false);
            setIsRevealingCard(false);

            if (
                cardGroupIndex <= 0
            ) {
                setCardGroupIndex(-1);
                setFrameIndex(0);

                return;
            }

            const previousIndex =
                cardGroupIndex - 1;

            const previousGroup =
                model.cardGroups[
                previousIndex
                ];

            setCardGroupIndex(
                previousIndex
            );

            setFrameIndex(
                Math.max(
                    0,
                    (
                        previousGroup
                            ?.frames
                            .length ??
                        1
                    ) - 1
                )
            );
        }, [
            cardGroupIndex,
            clearTimer,
            model.cardGroups
        ]);

    const nextCard =
        useCallback(() => {
            clearTimer();
            setIsPlaying(false);
            setIsRevealingCard(false);

            const nextIndex =
                cardGroupIndex < 0
                    ? 0
                    : (
                        cardGroupIndex +
                        1
                    );

            if (
                nextIndex >=
                model.cardGroups.length
            ) {
                return;
            }

            const nextGroup =
                model.cardGroups[
                nextIndex
                ];

            setCardGroupIndex(
                nextIndex
            );

            setFrameIndex(
                Math.max(
                    0,
                    (
                        nextGroup
                            ?.frames
                            .length ??
                        1
                    ) - 1
                )
            );
        }, [
            cardGroupIndex,
            clearTimer,
            model.cardGroups
        ]);

    useEffect(() => {
        if (!isPlaying) {
            return;
        }

        clearTimer();

        const duration =
            isRevealingCard ||
                frameIndex < 0
                ? (
                    CARD_REVEAL_DURATION_MS /
                    speed
                )
                : (
                    BASE_FRAME_DURATION /
                    speed
                );

        timerRef.current =
            window.setTimeout(
                () => {
                    const moved =
                        moveToNextFrame();

                    if (!moved) {
                        setIsPlaying(
                            false
                        );
                    }
                },
                duration
            );

        return clearTimer;
    }, [
        clearTimer,
        currentFrame.id,
        frameIndex,
        isPlaying,
        isRevealingCard,
        moveToNextFrame,
        speed
    ]);

    useEffect(() => {
        restart();
    }, [
        model,
        restart
    ]);

    useEffect(() => {
        return clearTimer;
    }, [clearTimer]);

    return {
        cardGroupIndex,
        frameIndex,

        currentGroup,
        currentFrame,

        visibleLogEntries,

        speed,
        setSpeed,

        isPlaying,
        isRevealingCard,
        isReplayComplete,

        play,
        pause,
        restart,
        previousCard,
        nextCard,

        hasPreviousCard:
            cardGroupIndex >= 0,

        hasNextCard:
            cardGroupIndex <
            model.cardGroups.length -
            1,

        currentCardNumber:
            cardGroupIndex >= 0
                ? cardGroupIndex + 1
                : 0,

        totalCards:
            model.cardGroups.length
    };
}