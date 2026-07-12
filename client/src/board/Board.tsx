import "./Board.css";
import {
    LANE_ORDER,
    RacerOnBoard,
    getVisibleStartPosition
} from "./BoardModel";
import { Lane } from "./Lane";

type BoardProps = {
    racers: RacerOnBoard[];
    shortenedBy?: number;
    remainingCards: number;
};

export function Board({ racers, shortenedBy = 0, remainingCards }: BoardProps) {
    const visibleStartPosition = getVisibleStartPosition(shortenedBy);

    return (
        <section className="boardScene">
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
                            racers={racers}
                            visibleStartPosition={visibleStartPosition}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}