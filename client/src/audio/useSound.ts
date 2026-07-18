import { useContext, useEffect } from "react";

import { SoundContext } from "./SoundProvider";
import type { MusicMode } from "./SoundManager";

export function useSound() {
    const context = useContext(SoundContext);

    if (!context) {
        throw new Error("useSound must be used inside a SoundProvider.");
    }

    return context;
}

export function useGameMusic(mode: MusicMode) {
    const { setMusicMode } = useSound();

    useEffect(() => {
        setMusicMode(mode);
    }, [mode, setMusicMode]);
}