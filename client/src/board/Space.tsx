import {
    RacerOnBoard,
    isStar,
    isStart,
    isFinish,
    isFoldLineBefore
} from "./BoardModel";
import { Mascot } from "./Mascot";

type SpaceProps = {
    position: number;
    racers: RacerOnBoard[];
};

export function Space({ position, racers }: SpaceProps) {
    return (
        <div className="boardSpace">
            {isFoldLineBefore(position) && <div className="foldLine" />}

            {isStar(position) && <div className="spaceStar">★</div>}

            {isStart(position) && <div className="startMarker">START</div>}

            {isFinish(position) && <div className="finishMarker">FINISH</div>}

            <div className={`mascotStack mascotStackCount${racers.length}`}>
                {racers.map((racer, index) => (
                    <Mascot
                        key={racer.name}
                        name={racer.name}
                        countInSpace={racers.length}
                        indexInSpace={index}
                        fallen={racer.fallen}
                        dq={racer.dq}
                        facing={racer.facing}
                    />
                ))}
            </div>
        </div>
    );
}