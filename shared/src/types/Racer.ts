import { RacerName } from "../racers/Racers.js";

export interface RacerState {

    name: RacerName;

    lane: number;

    position: number;

    facing: 1 | -1;

    fallen: boolean;

    dq: boolean;

    finished: boolean;

}