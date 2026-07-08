import { BOARD } from "./BoardModel";

export function getSpaceWidthPercent() {
    return 100 / BOARD.spacesPerLane;
}

export function getSpaceLeftPercent(position: number) {
    return position * getSpaceWidthPercent();
}

export function getSpaceWidthStyle() {
    return `${getSpaceWidthPercent()}%`;
}

export function getHiddenWidthPercent(shortenedBy: number) {
    if (shortenedBy <= 0) return 0;

    const foldPosition = BOARD.foldLines[shortenedBy - 1];

    if (foldPosition === undefined) return 0;

    return foldPosition * getSpaceWidthPercent();
}