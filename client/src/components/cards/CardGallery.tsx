import { useState } from "react";
import {
    CARD_CATALOG,
    SIDE_BETS,
    type BetRiskSide,
    type RacerName
} from "@crazy-racing/shared";
import {
    MascotBetTicketView,
    RaceCardView,
    SideBetTicketView
} from "./index";
import "./CardGallery.css";

export function CardGallery() {
    const [selectedRaceCard, setSelectedRaceCard] = useState<string | null>(null);
    const [mascotSide, setMascotSide] = useState<BetRiskSide | null>(null);
    const [sideBetSide, setSideBetSide] = useState<BetRiskSide | null>(null);

    const exampleRacer: RacerName = "LION";
    const exampleSideBet = SIDE_BETS[0];

    return (
        <section className="cardGallery">
            <h2>Race card catalogue</h2>

            <div className="cardGalleryGrid">
                {CARD_CATALOG.map((definition) => (
                    <RaceCardView
                        key={definition.id}
                        definition={definition}
                        size="compact"
                        selected={selectedRaceCard === definition.id}
                        onClick={() => setSelectedRaceCard(definition.id)}
                    />
                ))}
            </div>

            <h2>Mascot betting ticket</h2>

            <MascotBetTicketView
                racer={exampleRacer}
                tier="top"
                selectedSide={mascotSide}
                onSelectSide={setMascotSide}
            />

            <h2>Side-bet tickets</h2>

            <div className="cardGalleryTickets">
                <SideBetTicketView
                    sideBet={exampleSideBet}
                    answer="YES"
                    tier="top"
                    selectedSide={sideBetSide}
                    onSelectSide={setSideBetSide}
                />

                <SideBetTicketView
                    sideBet={exampleSideBet}
                    answer="NO"
                    tier="top"
                    selectedSide={sideBetSide}
                    onSelectSide={setSideBetSide}
                />
            </div>
        </section>
    );
}