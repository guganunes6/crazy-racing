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
            <div className="laneNamePlate">{laneName}</div>

            {Array.from({ length: BOARD.spaceCount }).map((_, position) => {
                const hidden = position < visibleStartPosition;

                const racersInSpace = racers.filter(
                    (racer) =>
                        racer.lane === laneIndex &&
                        racer.position === position &&
                        !racer.finished &&
                        !racer.dq
                );

                return (
                    <Space
                        key={position}
                        position={position}
                        hidden={hidden}
                        racers={racersInSpace}
                    />
                );
            })}
        </div>
    );
}