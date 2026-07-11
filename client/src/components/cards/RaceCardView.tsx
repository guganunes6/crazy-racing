import type {
    CardAction,
    RaceCardDefinition,
    RacerName
} from "@crazy-racing/shared";
import "./RaceCardView.css";

type RaceCardViewProps = {
    definition: RaceCardDefinition;
    size?: "compact" | "full";
    selected?: boolean;
    disabled?: boolean;
    onClick?: () => void;
};

const racerImages: Record<RacerName, string> = {
    LION: "/src/assets/lion.svg",
    HOTDOG: "/src/assets/hotdog.svg",
    FISH: "/src/assets/fish.svg",
    QUEEN: "/src/assets/queen.svg"
};

const allRacers: RacerName[] = [
    "LION",
    "HOTDOG",
    "FISH",
    "QUEEN"
];

export function RaceCardView({
    definition,
    size = "full",
    selected = false,
    disabled = false,
    onClick
}: RaceCardViewProps) {
    const ownerClass =
        definition.racer === "GREEN"
            ? "raceCardGreen"
            : `raceCard${capitalize(definition.racer.toLowerCase())}`;

    const isGreenCard = definition.racer === "GREEN";

    return (
        <button
            type="button"
            className={[
                "raceCardView",
                ownerClass,
                size === "compact" ? "raceCardCompact" : "raceCardFull",
                selected ? "raceCardSelected" : "",
                disabled ? "raceCardDisabled" : ""
            ]
                .filter(Boolean)
                .join(" ")}
            onClick={onClick}
            disabled={disabled}
        >
            <header className="raceCardHeader">
                <span className="raceCardOwner">
                    {isGreenCard ? "GREEN - EVERYONE" : definition.racer}
                </span>
            </header>

            {isGreenCard ? (
                <div className="raceCardEveryoneImages">
                    {allRacers.map((racer) => (
                        <img
                            key={racer}
                            src={racerImages[racer]}
                            alt={racer}
                            className="raceCardEveryoneImage"
                        />
                    ))}
                </div>
            ) : (
                <div className="raceCardMascotImageWrapper">
                    <img
                        src={racerImages[definition.racer]}
                        alt={definition.racer}
                        className="raceCardMascotImage"
                    />
                </div>
            )}

            <div className="raceCardActions">
                {definition.actions.map((action, index) => (
                    <div
                        key={`${definition.id}-${index}`}
                        className="raceCardActionRow"
                    >
                        {index > 0 && <span className="raceCardThen">THEN</span>}
                        <ActionLabel action={action} />
                    </div>
                ))}

                {definition.green && (
                    <div className="raceCardRuleBubble">
                        NO COLLISIONS · NO FINISHING
                    </div>
                )}
            </div>
        </button>
    );
}

function ActionLabel({ action }: { action: CardAction }) {
    switch (action.type) {
        case "RECOVER":
            return <strong>RECOVER</strong>;

        case "MOVE":
            return <strong>MOVE {action.value}</strong>;

        case "MOVE_TO_STAR":
            return <strong>MOVE TO STAR</strong>;

        case "TURN_AROUND":
            return <strong>TURN AROUND</strong>;

        case "FALL_DOWN":
            return <strong>FALL DOWN</strong>;

        case "SWERVE_LEFT":
            return <strong>SWERVE LEFT</strong>;

        case "SWERVE_RIGHT":
            return <strong>SWERVE RIGHT</strong>;
    }
}

function capitalize(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}