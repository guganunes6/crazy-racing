import {
    createContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode
} from "react";

import {
    soundManager,
    type MusicMode,
    type SoundEffectName,
    type SoundSettings
} from "./SoundManager";

type SoundContextValue = {
    settings: SoundSettings;

    playEffect: (
        name: SoundEffectName,
        options?: {
            volume?: number;
            playbackRate?: number;
        }
    ) => void;

    setMusicMode: (
        mode: MusicMode
    ) => void;

    setMuted: (
        muted: boolean
    ) => void;

    setEffectsVolume: (
        volume: number
    ) => void;

    setMusicVolume: (
        volume: number
    ) => void;

    testSounds: () => void;
    cycleMusic: () => void;
    resetAudio: () => void;
};

export const SoundContext =
    createContext<SoundContextValue | null>(
        null
    );

type SoundProviderProps = {
    children: ReactNode;
};

export function SoundProvider({
    children
}: SoundProviderProps) {
    const [
        settings,
        setSettings
    ] = useState(
        soundManager.getSettings()
    );

    useEffect(() => {
        return soundManager.subscribe(
            setSettings
        );
    }, []);

    const value =
        useMemo<SoundContextValue>(
            () => ({
                settings,

                playEffect:
                    (name, options) => {
                        void soundManager
                            .playEffect(
                                name,
                                options
                            );
                    },

                setMusicMode:
                    (mode) => {
                        soundManager
                            .setMusicMode(mode);
                    },

                setMuted:
                    (muted) => {
                        soundManager
                            .updateSettings({
                                muted
                            });
                    },

                setEffectsVolume:
                    (volume) => {
                        soundManager
                            .updateSettings({
                                effectsVolume:
                                    volume
                            });
                    },

                setMusicVolume:
                    (volume) => {
                        soundManager
                            .updateSettings({
                                musicVolume:
                                    volume
                            });
                    },

                testSounds: () => {
                    void soundManager
                        .testSounds();
                },

                cycleMusic: () => {
                    soundManager
                        .cycleMusic();
                },

                resetAudio: () => {
                    soundManager
                        .resetSettings();
                }
            }),
            [settings]
        );

    return (
        <SoundContext.Provider
            value={value}
        >
            {children}
        </SoundContext.Provider>
    );
}