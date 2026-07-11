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
            <h3>Your private hand</h3>

            <div className="privateHandGrid">
                {cards.map((card) => {
                    const definition =
                        CARD_CATALOG_BY_ID[
                        card.definitionId
                        ];

                    if (!definition) {
                        return null;
                    }

                    return (
                        <RaceCardView
                            key={card.id}
                            definition={
                                definition
                            }
                            size="compact"
                            selected={
                                selectedCardIds.includes(
                                    card.id
                                )
                            }
                            disabled={
                                disabled ||
                                !selectable
                            }
                            onClick={
                                selectable
                                    ? () =>
                                        onToggleCard?.(
                                            card.id
                                        )
                                    : undefined
                            }
                        />
                    );
                })}
            </div>
        </section>
    );
}