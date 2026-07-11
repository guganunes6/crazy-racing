import { RacerName } from "../racers/Racers";

export type CardType =
    | "move"
    | "fall"
    | "recover"
    | "turn"
    | "swerve-left"
    | "swerve-right"
    | "move-to-star";

export interface RaceCard {
    id: string;
    definitionId: string;
    racer: RacerName | "GREEN";
    type: CardType;
    value: number | null;
}