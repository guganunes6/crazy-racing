import { RacerName } from "../racers/Racers";

export interface PodiumEntry {

    place?: number;

    racer: RacerName;

    status: "finished" | "DQ" | "remaining";

    reason?: string;

}