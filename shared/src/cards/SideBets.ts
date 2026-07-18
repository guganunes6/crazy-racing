import { RacerName } from "../racers/Racers.js";

export type SideBetId =
    | "LION_BOTTOM_2"
    | "HOTDOG_BOTTOM_2"
    | "FISH_BOTTOM_2"
    | "QUEEN_BOTTOM_2"
    | "OUT_OF_BOUNDS_DQ"
    | "TWO_FALLEN_AT_SAME_TIME"
    | "KNOCKOUT_DQ"
    | "TWO_AT_FINISH_LINE_SPACE"
    | "CRAWL_IN_FINAL_STRETCH"
    | "TWO_STOPPED_SAME_SPACE"
    | "FINAL_STRETCH_EMPTY_WHEN_FIRST_WINS"
    | "AT_LEAST_ONE_DQ";

export type SideBetDefinition = {
    id: SideBetId;
    text: string;
    relatedRacer?: RacerName;
};

export const SIDE_BETS: SideBetDefinition[] = [
    {
        id: "LION_BOTTOM_2",
        text: "Will LION finish in the bottom 2?",
        relatedRacer: "LION"
    },
    {
        id: "HOTDOG_BOTTOM_2",
        text: "Will HOTDOG finish in the bottom 2?",
        relatedRacer: "HOTDOG"
    },
    {
        id: "FISH_BOTTOM_2",
        text: "Will FISH finish in the bottom 2?",
        relatedRacer: "FISH"
    },
    {
        id: "QUEEN_BOTTOM_2",
        text: "Will QUEEN finish in the bottom 2?",
        relatedRacer: "QUEEN"
    },
    {
        id: "OUT_OF_BOUNDS_DQ",
        text: "Will a mascot go out of bounds?"
    },
    {
        id: "TWO_FALLEN_AT_SAME_TIME",
        text: "Will at least 2 mascots be fallen down at the same time?"
    },
    {
        id: "KNOCKOUT_DQ",
        text: "Will a mascot be knocked out?"
    },
    {
        id: "TWO_AT_FINISH_LINE_SPACE",
        text: "Will at least 2 mascots be at the finish line at the same time?"
    },
    {
        id: "CRAWL_IN_FINAL_STRETCH",
        text: "Will a mascot crawl in the final stretch?"
    },
    {
        id: "TWO_STOPPED_SAME_SPACE",
        text: "Will 2 mascots be stopped on the same space at the same time?"
    },
    {
        id: "FINAL_STRETCH_EMPTY_WHEN_FIRST_WINS",
        text: "Will the final stretch be empty when first place is won?"
    },
    {
        id: "AT_LEAST_ONE_DQ",
        text: "Will at least 1 mascot be DQed?"
    }
];

export const SIDE_BETS_BY_ID = Object.fromEntries(
    SIDE_BETS.map((sideBet) => [sideBet.id, sideBet])
) as Record<SideBetId, SideBetDefinition>;