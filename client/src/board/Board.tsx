import type {
    RaceEvent,
    RacerName
} from "@crazy-racing/shared";
import "./Board.css";
import {
    LANE_ORDER,
    RacerOnBoard,
    getVisibleStartPosition
} from "./BoardModel";
import { Lane } from "./Lane";
import { RacerLayer } from "./RacerLayer";

type BoardProps = {
    racers: RacerOnBoard[];
    shortenedBy?: number;
    remainingCards: number;
    activeEvent?: RaceEvent | null;
    activeCardOwner?: RacerName | "GREEN" | null;
    isAnimating?: boolean;
};

export function Board({
    racers,
    shortenedBy = 0,
    remainingCards,
    activeEvent = null,
    activeCardOwner = null,
    isAnimating = false
}: BoardProps) {
    const visibleStartPosition =
        getVisibleStartPosition(shortenedBy);

    return (
        <section
            className={`boardScene ${isAnimating ? "boardAnimating" : ""}`}
        >
            <div className="boardFrame">
                <div className="boardTitle">
                    <span>CRAZY RACING TRACK</span>
                    <span className="boardDeckCounter">
                        Racing deck: {remainingCards} cards remaining
                    </span>
                </div>

                <div className="trackMat">
                    {LANE_ORDER.map((laneName, laneIndex) => (
                        <Lane
                            key={laneName}
                            laneIndex={laneIndex}
                            laneName={laneName}
                            visibleStartPosition={visibleStartPosition}
                        />
                    ))}

                    <RacerLayer
                        racers={racers}
                        activeEvent={activeEvent}
                        activeCardOwner={activeCardOwner}
                    />
                </div>
            </div>
        </section>
    );
}
