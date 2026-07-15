import {
    useEffect,
    useRef,
    useState
} from "react";

import {
    CARD_REVEAL_DURATION_MS
} from "./AnimationTiming";

export type CardAnimationPhase =
    | "hidden"
    | "entering"
    | "revealed";

type UseCardAnimationOptions = {
    cardKey:
    string | number | null;

    enabled?: boolean;
};

export function useCardAnimation({
    cardKey,
    enabled = true
}: UseCardAnimationOptions) {
    const [
        phase,
        setPhase
    ] = useState<CardAnimationPhase>(
        cardKey === null
            ? "hidden"
            : "revealed"
    );

    const [
        animationToken,
        setAnimationToken
    ] = useState(0);

    const timeoutRef =
        useRef<number | null>(
            null
        );

    const previousCardKeyRef =
        useRef<
            string | number | null
        >(cardKey);

    useEffect(() => {
        clearTimer();

        if (
            !enabled ||
            cardKey === null
        ) {
            previousCardKeyRef.current =
                cardKey;

            setPhase(
                cardKey === null
                    ? "hidden"
                    : "revealed"
            );

            return;
        }

        const cardChanged =
            previousCardKeyRef.current !==
            cardKey;

        previousCardKeyRef.current =
            cardKey;

        if (!cardChanged) {
            return;
        }

        setAnimationToken(
            (current) =>
                current + 1
        );

        setPhase("entering");

        timeoutRef.current =
            window.setTimeout(
                () => {
                    setPhase(
                        "revealed"
                    );

                    timeoutRef.current =
                        null;
                },
                CARD_REVEAL_DURATION_MS
            );

        return clearTimer;
    }, [
        cardKey,
        enabled
    ]);

    useEffect(() => {
        return clearTimer;
    }, []);

    function clearTimer() {
        if (
            timeoutRef.current !==
            null
        ) {
            window.clearTimeout(
                timeoutRef.current
            );

            timeoutRef.current =
                null;
        }
    }

    return {
        phase,
        animationToken,

        isCardAnimating:
            phase === "entering"
    };
}