export type SoundEffectName =
    | "card-flip"
    | "countdown-tick"
    | "countdown-go"
    | "movement-step"
    | "swerve"
    | "collision"
    | "fall"
    | "recover"
    | "turn"
    | "finish"
    | "dq"
    | "fold"
    | "reshuffle"
    | "podium"
    | "victory"
    | "ui-select"
    | "bet-draft"
    | "ui-confirm";

export type MusicMode =
    | "none"
    | "ambience"
    | "race";

export type SoundSettings = {
    muted: boolean;
    effectsVolume: number;
    musicVolume: number;
};

export const DEFAULT_SOUND_SETTINGS:
    SoundSettings = {
    muted: false,
    effectsVolume: 0.7,
    musicVolume: 0.35
};

const EFFECT_PATHS:
    Record<
        SoundEffectName,
        string
    > = {
    "card-flip":
        "/audio/card-flip.wav",

    "countdown-tick":
        "/audio/countdown-tick.wav",

    "countdown-go":
        "/audio/countdown-go.wav",

    "movement-step":
        "/audio/movement-step.wav",

    swerve:
        "/audio/swerve.wav",

    collision:
        "/audio/collision.wav",

    fall:
        "/audio/fall.wav",

    recover:
        "/audio/recover.wav",

    turn:
        "/audio/turn.wav",

    finish:
        "/audio/finish.wav",

    dq:
        "/audio/dq.wav",

    fold:
        "/audio/fold.wav",

    reshuffle:
        "/audio/reshuffle.wav",

    podium:
        "/audio/podium.wav",

    victory:
        "/audio/victory.wav",

    "ui-select":
        "/audio/ui-select.wav",

    "bet-draft":
        "/audio/bet-draft.wav",

    "ui-confirm":
        "/audio/ui-confirm.wav"
};

const MUSIC_PATHS = {
    ambience:
        "/audio/ambience-loop.wav",

    race:
        "/audio/race-loop.wav"
} as const;

const CROSSFADE_DURATION_MS =
    1600;

const FADE_INTERVAL_MS =
    35;

const MUSIC_PREVIEW_DURATION_MS =
    7000;

type SettingsListener = (
    settings:
        SoundSettings
) => void;

class CrazyRacingSoundManager {
    /*
     * Settings deliberately start from defaults every
     * time the application loads.
     *
     * Nothing is stored in localStorage, so another
     * player always starts with normal audio enabled.
     */
    private settings:
        SoundSettings = {
            ...DEFAULT_SOUND_SETTINGS
        };

    private listeners =
        new Set<
            SettingsListener
        >();

    private effects =
        new Map<
            SoundEffectName,
            HTMLAudioElement
        >();

    private musicElements:
        Record<
            "ambience" | "race",
            HTMLAudioElement
        >;

    private musicMode:
        MusicMode = "none";

    private fadeTimer:
        number | null = null;

    private previewTimer:
        number | null = null;

    private activeEffectCount =
        0;

    private unlocked =
        false;

    constructor() {
        this.musicElements = {
            ambience:
                this.createMusicElement(
                    MUSIC_PATHS.ambience
                ),

            race:
                this.createMusicElement(
                    MUSIC_PATHS.race
                )
        };

        for (
            const [
                name,
                path
            ] of Object.entries(
                EFFECT_PATHS
            )
        ) {
            const audio =
                new Audio(path);

            audio.preload =
                "auto";

            this.effects.set(
                name as SoundEffectName,
                audio
            );
        }

        this.installUnlockListeners();
    }

    getSettings():
        SoundSettings {
        return {
            ...this.settings
        };
    }

    subscribe(
        listener:
            SettingsListener
    ): () => void {
        this.listeners.add(
            listener
        );

        return () => {
            this.listeners.delete(
                listener
            );
        };
    }

    updateSettings(
        update:
            Partial<
                SoundSettings
            >
    ): void {
        this.settings = {
            ...this.settings,
            ...update,

            effectsVolume:
                clampVolume(
                    update.effectsVolume ??
                    this.settings
                        .effectsVolume
                ),

            musicVolume:
                clampVolume(
                    update.musicVolume ??
                    this.settings
                        .musicVolume
                )
        };

        this.applyCurrentMusicVolume();
        this.notifyListeners();
    }

    resetSettings(): void {
        this.settings = {
            ...DEFAULT_SOUND_SETTINGS
        };

        this.applyCurrentMusicVolume();
        this.notifyListeners();

        void this.playEffect(
            "ui-confirm",
            {
                volume: 0.75
            }
        );
    }

    async playEffect(
        name:
            SoundEffectName,

        options?: {
            volume?: number;
            playbackRate?: number;
        }
    ): Promise<void> {
        if (
            this.settings.muted ||
            this.activeEffectCount >=
            24
        ) {
            return;
        }

        const source =
            this.effects.get(
                name
            );

        if (!source) {
            return;
        }

        const audio =
            source.cloneNode(
                true
            ) as HTMLAudioElement;

        audio.volume =
            clampVolume(
                this.settings
                    .effectsVolume *
                (
                    options?.volume ??
                    1
                )
            );

        audio.playbackRate =
            options?.playbackRate ??
            1;

        this.activeEffectCount +=
            1;

        let cleanedUp = false;

        const cleanUp = () => {
            if (cleanedUp) {
                return;
            }

            cleanedUp = true;

            this.activeEffectCount =
                Math.max(
                    0,
                    this.activeEffectCount -
                    1
                );
        };

        audio.addEventListener(
            "ended",
            cleanUp,
            {
                once: true
            }
        );

        audio.addEventListener(
            "error",
            cleanUp,
            {
                once: true
            }
        );

        try {
            await audio.play();
        } catch {
            cleanUp();
        }
    }

    async testSounds():
        Promise<void> {
        if (
            this.settings.muted
        ) {
            return;
        }

        await this.playEffect(
            "ui-select"
        );

        window.setTimeout(
            () => {
                void this.playEffect(
                    "card-flip",
                    {
                        volume: 0.75
                    }
                );
            },
            260
        );

        window.setTimeout(
            () => {
                void this.playEffect(
                    "collision",
                    {
                        volume: 0.75
                    }
                );
            },
            700
        );

        window.setTimeout(
            () => {
                void this.playEffect(
                    "finish",
                    {
                        volume: 0.85
                    }
                );
            },
            1150
        );
    }

    setMusicMode(
        mode:
            MusicMode
    ): void {
        if (
            this.previewTimer !==
            null
        ) {
            window.clearTimeout(
                this.previewTimer
            );

            this.previewTimer =
                null;
        }

        if (
            mode ===
            this.musicMode
        ) {
            return;
        }

        this.musicMode =
            mode;

        this.crossfadeMusic(
            mode
        );
    }

    previewAlternateMusic():
        void {
        const originalMode =
            this.musicMode;

        const previewMode:
            MusicMode =
            originalMode ===
                "race"
                ? "ambience"
                : "race";

        this.crossfadeMusic(
            previewMode
        );

        if (
            this.previewTimer !==
            null
        ) {
            window.clearTimeout(
                this.previewTimer
            );
        }

        this.previewTimer =
            window.setTimeout(
                () => {
                    this.crossfadeMusic(
                        originalMode
                    );

                    this.previewTimer =
                        null;
                },
                MUSIC_PREVIEW_DURATION_MS
            );
    }

    private createMusicElement(
        path:
            string
    ): HTMLAudioElement {
        const audio =
            new Audio(path);

        audio.loop = true;
        audio.preload =
            "auto";
        audio.volume = 0;

        return audio;
    }

    private crossfadeMusic(
        targetMode:
            MusicMode
    ): void {
        if (
            this.fadeTimer !==
            null
        ) {
            window.clearInterval(
                this.fadeTimer
            );

            this.fadeTimer =
                null;
        }

        const ambience =
            this.musicElements
                .ambience;

        const race =
            this.musicElements
                .race;

        const targetAmbience =
            targetMode ===
                "ambience" &&
                !this.settings.muted
                ? this.settings
                    .musicVolume
                : 0;

        const targetRace =
            targetMode ===
                "race" &&
                !this.settings.muted
                ? this.settings
                    .musicVolume
                : 0;

        if (
            targetAmbience > 0
        ) {
            void this.safePlay(
                ambience
            );
        }

        if (
            targetRace > 0
        ) {
            void this.safePlay(
                race
            );
        }

        const ambienceStart =
            ambience.volume;

        const raceStart =
            race.volume;

        const startedAt =
            performance.now();

        this.fadeTimer =
            window.setInterval(
                () => {
                    const progress =
                        Math.min(
                            1,
                            (
                                performance.now() -
                                startedAt
                            ) /
                            CROSSFADE_DURATION_MS
                        );

                    const eased =
                        progress *
                        progress *
                        (
                            3 -
                            2 *
                            progress
                        );

                    ambience.volume =
                        interpolate(
                            ambienceStart,
                            targetAmbience,
                            eased
                        );

                    race.volume =
                        interpolate(
                            raceStart,
                            targetRace,
                            eased
                        );

                    if (
                        progress < 1
                    ) {
                        return;
                    }

                    if (
                        targetAmbience ===
                        0
                    ) {
                        ambience.pause();
                    }

                    if (
                        targetRace ===
                        0
                    ) {
                        race.pause();
                    }

                    if (
                        this.fadeTimer !==
                        null
                    ) {
                        window.clearInterval(
                            this.fadeTimer
                        );

                        this.fadeTimer =
                            null;
                    }
                },
                FADE_INTERVAL_MS
            );
    }

    private applyCurrentMusicVolume():
        void {
        this.crossfadeMusic(
            this.musicMode
        );
    }

    private notifyListeners():
        void {
        for (
            const listener
            of this.listeners
        ) {
            listener(
                this.getSettings()
            );
        }
    }

    private async safePlay(
        audio:
            HTMLAudioElement
    ): Promise<void> {
        try {
            await audio.play();
        } catch {
            // Waiting for user interaction.
        }
    }

    private installUnlockListeners():
        void {
        const unlock = () => {
            if (this.unlocked) {
                return;
            }

            this.unlocked =
                true;

            if (
                this.musicMode !==
                "none"
            ) {
                this.crossfadeMusic(
                    this.musicMode
                );
            }

            window.removeEventListener(
                "pointerdown",
                unlock
            );

            window.removeEventListener(
                "keydown",
                unlock
            );
        };

        window.addEventListener(
            "pointerdown",
            unlock,
            {
                once: true
            }
        );

        window.addEventListener(
            "keydown",
            unlock,
            {
                once: true
            }
        );
    }
}

function clampVolume(
    value:
        number
): number {
    return Math.max(
        0,
        Math.min(
            1,
            value
        )
    );
}

function interpolate(
    start:
        number,
    end:
        number,
    progress:
        number
): number {
    return (
        start +
        (
            end -
            start
        ) *
        progress
    );
}

export const soundManager =
    new CrazyRacingSoundManager();