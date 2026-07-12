import {
    CARD_CATALOG_BY_ID,
    type RaceCardDefinition
} from "@crazy-racing/shared";
import { RaceCardView } from "./RaceCardView";
import "./PublicRaceDeck.css";

type PublicRaceDeckProps = {
    definitionIds: string[];
};

type CardGroup = {
    key: "LION" | "HOTDOG" | "FISH" | "QUEEN" | "GREEN";
    title: string;
    cards: RaceCardDefinition[];
};

const GROUP_ORDER: CardGroup["key"][] = [
    "LION",
    "HOTDOG",
    "FISH",
    "QUEEN",
    "GREEN"
];

export function PublicRaceDeck({
    definitionIds
}: PublicRaceDeckProps) {
    const definitions = definitionIds
        .map((definitionId) => CARD_CATALOG_BY_ID[definitionId])
        .filter(
            (definition): definition is RaceCardDefinition =>
                Boolean(definition)
        );

    const groups: CardGroup[] = GROUP_ORDER.map((groupKey) => ({
        key: groupKey,
        title:
            groupKey === "GREEN"
                ? "GREEN - EVERYONE"
                : groupKey,
        cards: definitions.filter(
            (definition) => definition.racer === groupKey
        )
    }));

    return (
        <section className="publicRaceDeck">
            <h3>Public racing deck</h3>

            <div className="publicRaceDeckColumns">
                {groups.map((group) => (
                    <section
                        key={group.key}
                        className={`publicRaceDeckColumn publicRaceDeckColumn${group.key}`}
                    >
                        <header>
                            <strong>{group.title}</strong>
                            <span>{group.cards.length} cards</span>
                        </header>

                        <div className="publicRaceDeckCardList">
                            {group.cards.length === 0 ? (
                                <p className="emptyDeckColumn">No cards</p>
                            ) : (
                                group.cards.map((definition, index) => (
                                    <RaceCardView
                                        key={`${definition.id}-${index}`}
                                        definition={definition}
                                        size="compact"
                                        disabled
                                    />
                                ))
                            )}
                        </div>
                    </section>
                ))}
            </div>
        </section>
    );
}