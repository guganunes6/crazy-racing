import { BOARD, RacerName } from "./BoardModel";
import { Space } from "./Space";

type LaneProps = {
    laneIndex: number;
    laneName: RacerName;
    visibleStartPosition: number;
};

export function Lane({
    laneName,
    visibleStartPosition
}: LaneProps) {
    return (
        <div className="boardLane">
            <div className="laneNamePlate">{laneName}</div>

            {Array.from({ length: BOARD.spaceCount }).map((_, position) => (
                <Space
                    key={position}
                    position={position}
                    hidden={position < visibleStartPosition}
                />
            ))}
        </div>
    );
}
