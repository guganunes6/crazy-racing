export type RacerName = "LION" | "HOTDOG" | "FISH" | "QUEEN";

export const LANE_ORDER: RacerName[] = ["LION", "HOTDOG", "FISH", "QUEEN"];

export const BOARD = {
    lanes: 4,
    spacesPerLane: 14,
    start: 2,
    finish: 12,
    stars: [0, 7, 12, 13],
    foldLines: [3, 6, 10]
};

export type RacerOnBoard = {
    name: RacerName;
    lane: number;
    position: number;
    facing?: number;
    fallen?: boolean;
    dq?: boolean;
    finished?: boolean;
};

export type PodiumEntry = {
    place?: number;
    racer: RacerName;
    status: "finished" | "DQ" | "remaining";
    reason?: string;
};

export function isStar(position: number) {
    return BOARD.stars.includes(position);
}

export function isStart(position: number) {
    return position === BOARD.start;
}

export function isFinish(position: number) {
    return position === BOARD.finish;
}

export function hasFoldLineBefore(position: number) {
    return BOARD.foldLines.includes(position);
}

export function getVisibleStartPosition(shortenedBy: number) {
    if (shortenedBy <= 0) return 0;
    return BOARD.foldLines[shortenedBy - 1] ?? 0;
}