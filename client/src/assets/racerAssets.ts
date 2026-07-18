import fishUrl from "./fish.svg";
import hotdogUrl from "./hotdog.svg";
import lionUrl from "./lion.svg";
import queenUrl from "./queen.svg";

export type RacerAssetName = "LION" | "HOTDOG" | "FISH" | "QUEEN";

export const racerImages: Record<RacerAssetName, string> = {
    LION: lionUrl,
    HOTDOG: hotdogUrl,
    FISH: fishUrl,
    QUEEN: queenUrl,
};
