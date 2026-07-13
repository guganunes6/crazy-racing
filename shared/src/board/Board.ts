export const BOARD = {
    laneCount: 4,

    spaceCount: 14,

    startPosition: 2,

    finishPosition: 13,

    stars: [0, 7, 12, 13],

    foldLines: [3, 6, 10]
};

export function isStar(position: number) {
    return BOARD.stars.indexOf(position) !== -1;
}

export function isFinish(position: number) {
    return position === BOARD.finishPosition - 1;
}

export function isStart(position: number) {
    return position === BOARD.startPosition;
}

export function visibleStart(shortenedBy: number) {
    if (shortenedBy <= 0) return 0;

    return BOARD.foldLines[shortenedBy - 1] ?? 0;
}