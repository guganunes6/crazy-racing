import "./PauseButton.css";

type PauseButtonProps = {
    paused: boolean;
    onToggle: () => void;
};

export function PauseButton({
    paused,
    onToggle
}: PauseButtonProps) {
    return (
        <button
            type="button"
            className={[
                "pauseButton",
                paused
                    ? "pauseButtonActive"
                    : ""
            ]
                .filter(Boolean)
                .join(" ")}
            aria-label={
                paused
                    ? "Resume game"
                    : "Pause game"
            }
            title={
                paused
                    ? "Resume game"
                    : "Pause game"
            }
            onClick={onToggle}
        >
            {paused ? "▶" : "❚❚"}
        </button>
    );
}