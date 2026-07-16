import {
    CARD_CATALOG_BY_ID,
    type RaceCardDefinition
} from "@crazy-racing/shared";

import {
    useCardAnimation
} from "../../animation/useCardAnimation";

import {
    RaceCardView
} from "./RaceCardView";

import "./AnimatedCurrentCard.css";

export type CurrentCardInformation = {
    definitionId?:
    string;

    owner:
    string;

    name:
    string;

    fullName:
    string;
};

type AnimatedCurrentCardProps = {
    card:
    CurrentCardInformation | null;

    definition?:
    RaceCardDefinition | null;

    animationKey?:
    string | number | null;

    label?: string;

    animate?: boolean;

    compact?: boolean;
};

export function AnimatedCurrentCard({
    card,
    definition:
    suppliedDefinition = null,
    animationKey,
    label = "Last card drawn",
    animate = true,
    compact = false
}: AnimatedCurrentCardProps) {
    const resolvedDefinition =
        suppliedDefinition ??
        (
            card?.definitionId
                ? CARD_CATALOG_BY_ID[
                card.definitionId
                ] ?? null
                : null
        );

    const resolvedKey =
        animationKey ??
        card?.definitionId ??
        card?.fullName ??
        null;

    const {
        phase,
        animationToken
    } = useCardAnimation({
        cardKey:
            resolvedKey,

        enabled:
            animate
    });

    return (
        <section
            key={
                animationToken
            }
            className={[
                "animatedCurrentCard",
                `animatedCurrentCard${capitalize(
                    phase
                )}`,
                compact
                    ? "animatedCurrentCardCompact"
                    : ""
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <span className="animatedCurrentCardLabel">
                {label}
            </span>

            <div className="animatedCurrentCardStage">
                <div className="animatedCurrentCardBack">
                    <strong>
                        CRAZY RACING
                    </strong>

                    <span>
                        RACING CARD
                    </span>
                </div>

                <div className="animatedCurrentCardFront">
                    {resolvedDefinition ? (
                        <div className="animatedCurrentCardRaceCard">
                            <RaceCardView
                                definition={resolvedDefinition}
                                size={compact ? "compact" : undefined}
                            />
                        </div>
                    ) : card ? (
                        <div className="animatedCurrentCardFallback">
                            <span>
                                {card.owner}
                            </span>

                            <strong>
                                {card.name}
                            </strong>
                        </div>
                    ) : (
                        <div className="animatedCurrentCardFallback">
                            <strong>
                                No card has been
                                drawn yet
                            </strong>
                        </div>
                    )}
                </div>
            </div>
        </section>
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