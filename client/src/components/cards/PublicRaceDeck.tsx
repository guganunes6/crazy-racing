import {
    CARD_CATALOG_BY_ID
} from "@crazy-racing/shared";
import {
    RaceCardView
} from "./RaceCardView";
import "./PublicRaceDeck.css";

type PublicRaceDeckProps = {
    definitionIds: string[];
};

export function PublicRaceDeck({
    definitionIds
}: PublicRaceDeckProps) {
    return (
        <section className="publicRaceDeck">
            <h3>Public racing deck</h3>

            <div className="publicRaceDeckGrid">
                {definitionIds.map(
                    (definitionId, index) => {
                        const definition =
                            CARD_CATALOG_BY_ID[
                            definitionId
                            ];

                        if (!definition) {
                            return null;
                        }

                        return (
                            <RaceCardView
                                key={`${definitionId}-${index}`}
                                definition={
                                    definition
                                }
                                size="compact"
                                disabled
                            />
                        );
                    }
                )}
            </div>
        </section>
    );
}