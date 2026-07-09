import {
    RacerOnBoard,
    isStar,
    isStart,
    isFinish,
    hasFoldLineBefore
} from "./BoardModel";
import { Mascot } from "./Mascot";

type SpaceProps = {
    position: number;
    hidden: boolean;
    racers: RacerOnBoard[];
};

export function Space({ position, hidden, racers }: SpaceProps) {
    return (
        <div
            className={`boardSpace ${hidden ? "hiddenSpace" : ""} ${hasFoldLineBefore(position) ? "foldBoundary" : ""
                }`}
        >
            {isStar(position) && <div className="spaceStar">★</div>}

            {isStart(position) && <div className="startFlag">START</div>}

            {isFinish(position) && <div className="finishGate">FINISH</div>}

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