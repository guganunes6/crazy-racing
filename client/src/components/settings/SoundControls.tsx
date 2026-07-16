import {
    useSound
} from "../../audio/useSound";

import "./SoundControls.css";

export function SoundControls() {
    const {
        settings,
        setMuted,
        setEffectsVolume,
        setMusicVolume,
        playEffect
    } = useSound();

    return (
        <section className="soundControls">
            <div className="soundControlsHeader">
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
                    className={
                        settings.muted
                            ? "soundMutedButton"
                            : ""
                    }
                    onClick={() =>
                        setMuted(
                            !settings.muted
                        )
                    }
                >
                    {settings.muted
                        ? "Sound off"
                        : "Sound on"}
                </button>
            </div>

            <label className="soundControlSlider">
                <span>
                    Effects
                </span>

                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={
                        settings
                            .effectsVolume
                    }
                    disabled={
                        settings.muted
                    }
                    onChange={(
                        event
                    ) => {
                        setEffectsVolume(
                            Number(
                                event
                                    .target
                                    .value
                            )
                        );
                    }}
                    onPointerUp={() =>
                        playEffect(
                            "card-flip"
                        )
                    }
                />

                <output>
                    {Math.round(
                        settings
                            .effectsVolume *
                        100
                    )}
                    %
                </output>
            </label>

            <label className="soundControlSlider">
                <span>
                    Music
                </span>

                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={
                        settings
                            .musicVolume
                    }
                    disabled={
                        settings.muted
                    }
                    onChange={(
                        event
                    ) =>
                        setMusicVolume(
                            Number(
                                event
                                    .target
                                    .value
                            )
                        )
                    }
                />

                <output>
                    {Math.round(
                        settings
                            .musicVolume *
                        100
                    )}
                    %
                </output>
            </label>
        </section>
    );
}