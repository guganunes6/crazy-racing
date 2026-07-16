export type SoundEffectName =
    | "card-flip"
    | "countdown-tick"
    | "countdown-go"
    | "movement-step"
    | "crawl"
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
    | "ui-confirm"
    | "ui-unready";

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

    crawl:
        "/audio/crawl.wav",

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
        "/audio/ui-confirm.wav",

    "ui-unready":
        "/audio/ui-unready.wav"
};

const MUSIC_PLAYLISTS:
    Record<
        Exclude<
            MusicMode,
            "none"
        >,
        readonly string[]
    > = {
    ambience: [
            "/audio/ambience-loop.wav",
            "/audio/ambience-lounge-sunset.wav",
            "/audio/ambience-midnight-lobby.wav"
    ],

    race: [
        "/audio/race-loop.wav",
        "/audio/race-loop-old.wav",
        "/audio/race-music-crazy-kart-2.wav"
    ]
};

const CROSSFADE_DURATION_MS =
    1600;

const FADE_INTERVAL_MS =
    35;

const MAX_SIMULTANEOUS_EFFECTS =
    24;

type SettingsListener = (
    settings:
        SoundSettings
) => void;

type MusicCategory =
    Exclude<
        MusicMode,
        "none"
    >;

class CrazyRacingSoundManager {
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

    private musicIndexes:
        Record<
            MusicCategory,
            number
        > = {
            ambience: 0,
            race: 0
        };

    /*
     * The element that represents the currently
     * selected music track.
     */
    private activeMusic:
        HTMLAudioElement | null =
        null;

    /*
     * During a crossfade this stores the old track.
     * Keeping it explicitly allows us to stop it if
     * another track change starts before the previous
     * fade has finished.
     */
    private fadingOutMusic:
        HTMLAudioElement | null =
        null;

    private musicMode:
        MusicMode = "none";

    private fadeTimer:
        number | null = null;

    private activeEffectCount =
        0;

    private unlocked =
        false;

    constructor() {
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
                name as
                SoundEffectName,
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

        /*
         * Cancel the previous fade before applying a
         * new user-selected volume. Otherwise the old
         * timer may restore its previous target volume.
         */
        this.cancelFade();

        this.applyCurrentMusicVolume();
        this.notifyListeners();
    }

    resetSettings(): void {
        this.settings = {
            ...DEFAULT_SOUND_SETTINGS
        };

        this.musicIndexes = {
            ambience: 0,
            race: 0
        };

        this.cancelFade();
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
            MAX_SIMULTANEOUS_EFFECTS
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

        /*
         * Creating a new Audio element avoids the
         * cloneNode() Node typing problem and permits
         * overlapping copies of short effects.
         */
        const audio =
            new Audio(
                source.src
            );

        audio.preload =
            "auto";

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

        let cleanedUp =
            false;

        const cleanUp = () => {
            if (cleanedUp) {
                return;
            }

            cleanedUp =
                true;

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
                    "crawl",
                    {
                        volume: 0.7
                    }
                );
            },
            650
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
            1050
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
            1450
        );
    }

    setMusicMode(
        mode:
            MusicMode
    ): void {
        if (
            mode ===
            this.musicMode &&
            this.activeMusic
        ) {
            return;
        }

        this.musicMode =
            mode;

        if (
            mode ===
            "none"
        ) {
            this.stopMusic();
            return;
        }

        this.crossfadeToCurrentTrack();
    }

    cycleMusic(): void {
        const category:
            MusicCategory =
            this.musicMode ===
                "race"
                ? "race"
                : "ambience";

        const tracks =
            MUSIC_PLAYLISTS[
            category
            ];

        if (
            tracks.length === 0
        ) {
            return;
        }

        this.musicIndexes[
            category
        ] =
            (
                this.musicIndexes[
                category
                ] +
                1
            ) %
            tracks.length;

        if (
            this.musicMode ===
            category
        ) {
            this.crossfadeToCurrentTrack();
        } else {
            void this.playEffect(
                "ui-select",
                {
                    volume: 0.55
                }
            );
        }
    }

    private getCurrentMusicPath():
        string | null {
        if (
            this.musicMode ===
            "none"
        ) {
            return null;
        }

        const tracks =
            MUSIC_PLAYLISTS[
            this.musicMode
            ];

        return (
            tracks[
            this.musicIndexes[
            this.musicMode
            ]
            ] ??
            tracks[0] ??
            null
        );
    }

    private crossfadeToCurrentTrack():
        void {
        const path =
            this.getCurrentMusicPath();

        if (!path) {
            this.stopMusic();
            return;
        }

        /*
         * Cancel and clean up every unfinished previous
         * transition before creating another track.
         */
        this.cancelFade();

        if (
            this.fadingOutMusic
        ) {
            this.stopAudioElement(
                this.fadingOutMusic
            );

            this.fadingOutMusic =
                null;
        }

        const outgoing =
            this.activeMusic;

        const incoming =
            this.createMusicElement(
                path
            );

        this.fadingOutMusic =
            outgoing;

        this.activeMusic =
            incoming;

        if (
            !this.settings.muted
        ) {
            void this.safePlay(
                incoming
            );
        }

        this.crossfade(
            outgoing,
            incoming
        );
    }

    private stopMusic(): void {
        this.cancelFade();

        if (
            this.activeMusic
        ) {
            this.stopAudioElement(
                this.activeMusic
            );

            this.activeMusic =
                null;
        }

        if (
            this.fadingOutMusic
        ) {
            this.stopAudioElement(
                this.fadingOutMusic
            );

            this.fadingOutMusic =
                null;
        }
    }

    private crossfade(
        outgoing:
            HTMLAudioElement | null,

        incoming:
            HTMLAudioElement
    ): void {
        const outgoingStart =
            outgoing?.volume ??
            0;

        const targetIncoming =
            this.settings.muted
                ? 0
                : this.settings
                    .musicVolume;

        incoming.volume =
            0;

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

                    if (
                        outgoing
                    ) {
                        outgoing.volume =
                            interpolate(
                                outgoingStart,
                                0,
                                eased
                            );
                    }

                    /*
                     * Read the current setting on every
                     * tick instead of capturing an old
                     * target volume.
                     */
                    const currentTarget =
                        this.settings.muted
                            ? 0
                            : this.settings
                                .musicVolume;

                    incoming.volume =
                        interpolate(
                            0,
                            currentTarget,
                            eased
                        );

                    if (
                        progress < 1
                    ) {
                        return;
                    }

                    if (
                        outgoing
                    ) {
                        this.stopAudioElement(
                            outgoing
                        );
                    }

                    if (
                        this.fadingOutMusic ===
                        outgoing
                    ) {
                        this.fadingOutMusic =
                            null;
                    }

                    this.cancelFade();
                },
                FADE_INTERVAL_MS
            );
    }

    private applyCurrentMusicVolume():
        void {
        const targetVolume =
            this.settings.muted
                ? 0
                : this.settings
                    .musicVolume;

        if (
            this.activeMusic
        ) {
            this.activeMusic.volume =
                targetVolume;

            if (
                !this.settings.muted &&
                this.musicMode !==
                "none"
            ) {
                void this.safePlay(
                    this.activeMusic
                );
            }
        }

        /*
         * A track that was fading out must never keep
         * playing after a direct volume adjustment.
         */
        if (
            this.fadingOutMusic
        ) {
            this.stopAudioElement(
                this.fadingOutMusic
            );

            this.fadingOutMusic =
                null;
        }
    }

    private createMusicElement(
        path:
            string
    ): HTMLAudioElement {
        const audio =
            new Audio(path);

        audio.loop =
            true;

        audio.preload =
            "auto";

        audio.volume =
            0;

        return audio;
    }

    private stopAudioElement(
        audio:
            HTMLAudioElement
    ): void {
        audio.pause();

        try {
            audio.currentTime =
                0;
        } catch {
            // The metadata may not yet be loaded.
        }

        /*
         * Clearing src ensures that an obsolete media
         * element cannot restart or continue buffering.
         */
        audio.removeAttribute(
            "src"
        );

        audio.load();
    }

    private cancelFade(): void {
        if (
            this.fadeTimer ===
            null
        ) {
            return;
        }

        window.clearInterval(
            this.fadeTimer
        );

        this.fadeTimer =
            null;
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
            // Playback resumes after user interaction.
        }
    }

    private installUnlockListeners():
        void {
        const unlock = () => {
            if (
                this.unlocked
            ) {
                return;
            }

            this.unlocked =
                true;

            if (
                this.activeMusic &&
                this.musicMode !==
                "none" &&
                !this.settings.muted
            ) {
                void this.safePlay(
                    this.activeMusic
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