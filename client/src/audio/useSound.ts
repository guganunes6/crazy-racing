import {
    useContext,
    useEffect
} from "react";

import {
    SoundContext
} from "./SoundProvider";

import type {
    MusicMode
} from "./SoundManager";

export function useSound() {
    const context =
        useContext(
            SoundContext
        );

    if (!context) {
        throw new Error(
            "useSound must be used inside SoundProvider."
        );
    }

    return context;
}

export function useGameMusic(
    mode:
        MusicMode
): void {
    const {
        setMusicMode
    } = useSound();

    useEffect(() => {
        setMusicMode(
            mode
        );

        return () => {
            setMusicMode(
                "none"
            );
        };
    }, [
        mode,
        setMusicMode
    ]);
}