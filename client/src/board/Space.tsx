import {
    isStar,
    isStart,
    isFinish,
    hasFoldLineBefore
} from "./BoardModel";

type SpaceProps = {
    position: number;
    hidden: boolean;
};

export function Space({ position, hidden }: SpaceProps) {
    return (
        <div
            className={`boardSpace ${hidden ? "hiddenSpace" : ""} ${
                hasFoldLineBefore(position) ? "foldBoundary" : ""
            }`}
        >
            {isStar(position) && <div className="spaceStar">★</div>}
            {isStart(position) && <div className="startFlag">START</div>}
            {isFinish(position) && <div className="finishGate">FINISH</div>}
        </div>
    );
}
