import { BOARD } from "./BoardModel";

export function getSpacePercentage(position: number) {
    return `${(position / BOARD.spacesPerLane) * 100}%`;
}

export function getFoldLabel(index: number) {
    if (index === 0) return "1st fold";
    if (index === 1) return "2nd fold";
    return "3rd fold";
}