import { BOARD, RacerName, RacerOnBoard } from "./BoardModel";
import { Space } from "./Space";

type LaneProps = {
    laneIndex: number;
    laneName: RacerName;
    racers: RacerOnBoard[];
    visibleStartPosition: number;
};

export function Lane({
    laneIndex,
    laneName,
    racers,
    visibleStartPosition
}: LaneProps) {
    return (
        <div className="boardLane">
            <div className="laneLabel">
                {laneIndex + 1}. {laneName}
            </div>

            {Array.from({ length: BOARD.spacesPerLane }).map((_, position) => {
                const hidden = position < visibleStartPosition;

                return (
                    <div
                        key={position}
                        className={`spaceWrapper ${hidden ? "spaceHidden" : ""}`}
                    >
                        <Space
                            position={position}
                            racers={racers.filter(
                                (racer) =>
                                    racer.lane === laneIndex &&
                                    racer.position === position &&
                                    !racer.finished &&
                                    !racer.dq
                            )}
                        />
                    </div>
                );
            })}
        </div>
    );
}