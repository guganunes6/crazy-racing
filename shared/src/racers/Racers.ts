export const RACERS = [
    "LION",
    "HOTDOG",
    "FISH",
    "QUEEN"
] as const;

export type RacerName = typeof RACERS[number];

export const LANE_ORDER = RACERS;