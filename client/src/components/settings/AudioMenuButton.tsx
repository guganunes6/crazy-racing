import {
    useEffect,
    useRef,
    useState
} from "react";

import {
    useSound
} from "../../audio/useSound";

import "./AudioMenuButton.css";

type AudioMenuButtonProps = {
    placement?:
    | "initial"
    | "header";
};

export function AudioMenuButton({
    placement = "header"
}: AudioMenuButtonProps) {
    const [open, setOpen] =
        useState(false);

    const containerRef =
        useRef<HTMLDivElement | null>(
            null
        );

    const {
        settings,
        setMuted,
        setEffectsVolume,
        setMusicVolume,
        testSounds,
        cycleMusic,
        resetAudio
    } = useSound();

    useEffect(() => {
        function handlePointerDown(
            event: PointerEvent
        ) {
            if (
                !containerRef.current ||
                containerRef.current.contains(
                    event.target as Node
                )
            ) {
                return;
            }

            setOpen(false);
        }

        window.addEventListener(
            "pointerdown",
            handlePointerDown
        );

        return () => {
            window.removeEventListener(
                "pointerdown",
                handlePointerDown
            );
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className={[
                "audioMenuContainer",
                `audioMenuContainer${capitalize(
                    placement
                )}`
            ].join(" ")}
        >
            <button
                type="button"
                className="audioMenuToggle"
                aria-label={
                    settings.muted
                        ? "Open audio settings. Audio is muted."
                        : "Open audio settings."
                }
                aria-expanded={open}
                onClick={() =>
                    setOpen(
                        (current) =>
                            !current
                    )
                }
            >
                {settings.muted
                    ? "🔇"
                    : "🔊"}
            </button>

            {open && (
                <section className="audioMenuPopup">
                    <header className="audioMenuHeader">
                        <div>
                            <span>
                                Audio
                            </span>

                            <strong>
                                Sound settings
                            </strong>
                        </div>

                        <button
                            type="button"
                            className="audioMuteButton"
                            onClick={() =>
                                setMuted(
                                    !settings.muted
                                )
                            }
                        >
                            {settings.muted
                                ? "Unmute"
                                : "Mute"}
                        </button>
                    </header>

                    <AudioSlider
                        label="Music"
                        value={
                            settings.musicVolume
                        }
                        disabled={
                            settings.muted
                        }
                        onChange={
                            setMusicVolume
                        }
                    />

                    <AudioSlider
                        label="Effects"
                        value={
                            settings.effectsVolume
                        }
                        disabled={
                            settings.muted
                        }
                        onChange={
                            setEffectsVolume
                        }
                    />

                    <div className="audioMenuActions">
                        <button
                            type="button"
                            onClick={testSounds}
                            disabled={
                                settings.muted
                            }
                        >
                            Test sounds
                        </button>

                        <button
                            type="button"
                            onClick={cycleMusic}
                            disabled={
                                settings.muted
                            }
                        >
                            Change Music
                        </button>

                        <button
                            type="button"
                            onClick={resetAudio}
                        >
                            Reset audio
                        </button>
                    </div>
                </section>
            )}
        </div>
    );
}

function AudioSlider({
    label,
    value,
    disabled,
    onChange
}: {
    label: string;
    value: number;
    disabled: boolean;
    onChange: (
        value: number
    ) => void;
}) {
    return (
        <label className="audioSlider">
            <div className="audioSliderHeader">
                <span>
                    {label}
                </span>

                <strong>
                    {Math.round(
                        value * 100
                    )}
                    %
                </strong>
            </div>

            <input
                className="audioSliderInput"
                type="range"
                min="0"
                max="100"
                step="1"
                value={
                    Math.round(
                        value * 100
                    )
                }
                disabled={
                    disabled
                }
                onChange={(
                    event
                ) => {
                    onChange(
                        Number(
                            event.target
                                .value
                        ) /
                        100
                    );
                }}
            />

            <div className="audioSliderEndpoints">
                <span>
                    0%
                </span>

                <span>
                    100%
                </span>
            </div>
        </label>
    );
}

function capitalize(
    value: string
): string {
    return (
        value.charAt(0)
            .toUpperCase() +
        value.slice(1)
    );
}