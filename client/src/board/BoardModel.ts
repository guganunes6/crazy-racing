import { BOARD } from "@crazy-racing/shared";

export {
    BOARD,
    LANE_ORDER,
    type RacerName,
    type RacerState as RacerOnBoard,
    type PodiumEntry,
    isStar,
    isStart,
    isFinish,
    visibleStart as getVisibleStartPosition
} from "@crazy-racing/shared";

export function hasFoldLineBefore(position: number) {
    return BOARD.foldLines.indexOf(position) !== -1;
}