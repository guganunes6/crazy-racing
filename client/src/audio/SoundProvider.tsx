import {
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import {
    soundManager,
    type MusicMode,
    type SoundEffectName,
    type SoundSettings,
} from "./SoundManager";

type SoundContextValue = {
    settings: SoundSettings;
    playEffect: (
        name: SoundEffectName,
        options?: {
            volume?: number;
            playbackRate?: number;
        },
    ) => void;
    setMusicMode: (mode: MusicMode) => void;
    setMuted: (muted: boolean) => void;
    setEffectsVolume: (volume: number) => void;
    setMusicVolume: (volume: number) => void;
    testSounds: () => void;
    cycleMusic: () => void;
    resetAudio: () => void;
};

export const SoundContext = createContext<SoundContextValue | null>(null);

type SoundProviderProps = {
    children: ReactNode;
};

export function SoundProvider({ children }: SoundProviderProps) {
    const [settings, setSettings] = useState(() => soundManager.getSettings());

    useEffect(() => {
        return soundManager.subscribe(setSettings);
    }, []);

    const playEffect = useCallback<SoundContextValue["playEffect"]>(
        (name, options) => {
            void soundManager.playEffect(name, options);
        },
        [],
    );

    const setMusicMode = useCallback((mode: MusicMode) => {
        soundManager.setMusicMode(mode);
    }, []);

    const setMuted = useCallback((muted: boolean) => {
        soundManager.updateSettings({ muted });
    }, []);

    const setEffectsVolume = useCallback((volume: number) => {
        soundManager.updateSettings({ effectsVolume: volume });
    }, []);

    const setMusicVolume = useCallback((volume: number) => {
        soundManager.updateSettings({ musicVolume: volume });
    }, []);

    const testSounds = useCallback(() => {
        void soundManager.testSounds();
    }, []);

    const cycleMusic = useCallback(() => {
        soundManager.cycleMusic();
    }, []);

    const resetAudio = useCallback(() => {
        soundManager.resetSettings();
    }, []);

    const value = useMemo<SoundContextValue>(
        () => ({
            settings,
            playEffect,
            setMusicMode,
            setMuted,
            setEffectsVolume,
            setMusicVolume,
            testSounds,
            cycleMusic,
            resetAudio,
        }),
        [
            settings,
            playEffect,
            setMusicMode,
            setMuted,
            setEffectsVolume,
            setMusicVolume,
            testSounds,
            cycleMusic,
            resetAudio,
        ],
    );

    return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}
