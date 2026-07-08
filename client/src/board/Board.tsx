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
};

export function Board({ racers, shortenedBy = 0 }: BoardProps) {
    const visibleStartPosition = getVisibleStartPosition(shortenedBy);

    return (
        <section className="crazyBoard">
            <div className="boardHeader">
                <strong>Race Track</strong>
                <span>Shortened by: {shortenedBy}</span>
            </div>

            <div className="boardGrid">
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
        </section>
    );
}