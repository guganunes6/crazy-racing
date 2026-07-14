import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";

import type {
    RaceReplayModel,
    ReplayFrame,
    ReplaySpeed
} from "./ReplayTypes";

const BASE_FRAME_DURATION = 600;

type UseRaceReplayOptions = {
    model: RaceReplayModel;
};

export function useRaceReplay({
    model
}: UseRaceReplayOptions) {
    const [
        cardGroupIndex,
        setCardGroupIndex
    ] = useState(-1);

    const [
        frameIndex,
        setFrameIndex
    ] = useState(0);

    const [
        speed,
        setSpeed
    ] = useState<ReplaySpeed>(1);

    const [
        isPlaying,
        setIsPlaying
    ] = useState(false);

    const timerRef =
        useRef<number | null>(null);

    const currentGroup =
        cardGroupIndex >= 0
            ? (
                model.cardGroups[
                cardGroupIndex
                ] ?? null
            )
            : null;

    const currentFrame =
        useMemo<ReplayFrame>(() => {
            if (!currentGroup) {
                return model.initialFrame;
            }

            return (
                currentGroup.frames[
                frameIndex
                ] ??
                currentGroup.frames[
                currentGroup.frames.length - 1
                ] ??
                model.initialFrame
            );
        }, [
            currentGroup,
            frameIndex,
            model.initialFrame
        ]);

    const visibleLogEntries =
        useMemo(() => {
            if (cardGroupIndex < 0) {
                return [];
            }

            const entries: string[] = [];

            for (
                let groupIndex = 0;
                groupIndex <= cardGroupIndex;
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
                            group.frames.length -
                            1
                        );

                for (
                    let currentFrameIndex = 0;
                    currentFrameIndex <=
                    maximumFrameIndex;
                    currentFrameIndex += 1
                ) {
                    const frame =
                        group.frames[
                        currentFrameIndex
                        ];

                    if (frame) {
                        entries.push(
                            ...frame.logEntries
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

    const clearTimer =
        useCallback(() => {
            if (
                timerRef.current !== null
            ) {
                window.clearTimeout(
                    timerRef.current
                );

                timerRef.current = null;
            }
        }, []);

    const restart =
        useCallback(() => {
            clearTimer();

            setIsPlaying(false);
            setCardGroupIndex(-1);
            setFrameIndex(0);
        }, [clearTimer]);

    const pause =
        useCallback(() => {
            clearTimer();
            setIsPlaying(false);
        }, [clearTimer]);

    const moveToNextFrame =
        useCallback((): boolean => {
            if (
                model.cardGroups.length === 0
            ) {
                return false;
            }

            if (cardGroupIndex < 0) {
                setCardGroupIndex(0);
                setFrameIndex(0);
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
                frameIndex <
                group.frames.length - 1
            ) {
                setFrameIndex(
                    (current) =>
                        current + 1
                );

                return true;
            }

            if (
                cardGroupIndex <
                model.cardGroups.length - 1
            ) {
                setCardGroupIndex(
                    (current) =>
                        current + 1
                );

                setFrameIndex(0);
                return true;
            }

            return false;
        }, [
            cardGroupIndex,
            frameIndex,
            model.cardGroups
        ]);

    const play =
        useCallback(() => {
            if (
                model.cardGroups.length === 0
            ) {
                return;
            }

            setIsPlaying(true);
        }, [model.cardGroups.length]);

    const previousCard =
        useCallback(() => {
            clearTimer();
            setIsPlaying(false);

            if (cardGroupIndex <= 0) {
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
                            ?.frames.length ??
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

            const nextIndex =
                cardGroupIndex < 0
                    ? 0
                    : cardGroupIndex + 1;

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
                            ?.frames.length ??
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
                BASE_FRAME_DURATION /
                speed
            );

        return clearTimer;
    }, [
        clearTimer,
        currentFrame.id,
        isPlaying,
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
        play,
        pause,

        restart,
        previousCard,
        nextCard,

        hasPreviousCard:
            cardGroupIndex >= 0,

        hasNextCard:
            cardGroupIndex <
            model.cardGroups.length - 1,

        currentCardNumber:
            cardGroupIndex >= 0
                ? cardGroupIndex + 1
                : 0,

        totalCards:
            model.cardGroups.length
    };
}