import { RacerName } from "../racers/Racers";

export type CardType =

    | "move"
    | "fall"
    | "recover"
    | "turn"
    | "swerve-left"
    | "swerve-right";

export interface RaceCard {

    id: string;

    racer: RacerName;

    type: CardType;

    value: number | null;

}