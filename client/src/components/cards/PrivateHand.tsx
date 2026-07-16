import {
    CARD_CATALOG_BY_ID,
    type RaceCard
} from "@crazy-racing/shared";

import {
    RaceCardView
} from "./RaceCardView";

import "./PrivateHand.css";

type PrivateHandProps = {
    cards: RaceCard[];
    selectedCardIds?: string[];
    disabled?: boolean;
    selectable?: boolean;
    onToggleCard?: (
        cardId: string
    ) => void;
};

export function PrivateHand({
    cards,
    selectedCardIds = [],
    disabled = false,
    selectable = false,
    onToggleCard
}: PrivateHandProps) {
    return (
        <section className="privateHand">
            <header className="privateHandHeader">
                <h3>
                    Your private hand
                </h3>

                <span>
                    {cards.length}{" "}
                    {cards.length === 1
                        ? "card"
                        : "cards"}
                </span>
            </header>

            <div className="privateHandCards">
                {cards.map((card) => {
                    const definition =
                        CARD_CATALOG_BY_ID[
                        card.definitionId
                        ];

                    if (!definition) {
                        return null;
                    }

                    const selected =
                        selectedCardIds.includes(
                            card.id
                        );

                    const cardDisabled =
                        disabled ||
                        !selectable;

                    function handleSelect() {
                        if (cardDisabled) {
                            return;
                        }

                        onToggleCard?.(
                            card.id
                        );
                    }

                    function handleKeyDown(
                        event:
                            React.KeyboardEvent<HTMLDivElement>
                    ) {
                        if (
                            event.key !== "Enter" &&
                            event.key !== " "
                        ) {
                            return;
                        }

                        event.preventDefault();
                        handleSelect();
                    }

                    return (
                        <div
                            key={card.id}
                            role={
                                cardDisabled
                                    ? undefined
                                    : "button"
                            }
                            tabIndex={
                                cardDisabled
                                    ? -1
                                    : 0
                            }
                            aria-disabled={
                                cardDisabled
                            }
                            aria-pressed={
                                selectable
                                    ? selected
                                    : undefined
                            }
                            className={[
                                "privateHandCard",

                                selected
                                    ? "privateHandCardSelected"
                                    : "",

                                cardDisabled
                                    ? "privateHandCardDisabled"
                                    : "",

                                disabled
                                    ? "privateHandCardSubmitted"
                                    : ""
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            onClick={
                                handleSelect
                            }
                            onKeyDown={
                                handleKeyDown
                            }
                        >
                            <RaceCardView
                                definition={
                                    definition
                                }
                                size="compact"
                                selected={
                                    selected
                                }
                            />
                        </div>
                    );
                })}
            </div>

            {cards.length === 0 && (
                <p className="privateHandEmpty">
                    There are no cards in your
                    private hand.
                </p>
            )}
        </section>
    );
}