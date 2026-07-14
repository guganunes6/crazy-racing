import type { PodiumEntry } from "./Podium";
import type { RaceEvent } from "./RaceEvent";
import type { RacerState } from "./Racer";
import type { RacePayoutSummary } from "./Payout";
import type { SideBetDefinition } from "../cards/SideBets";

export type CompletedRaceReplay = {
    raceNumber: number;

    initialRacers: RacerState[];
    events: RaceEvent[];
    podium: PodiumEntry[];

    sideBet: SideBetDefinition;
    payoutSummary: RacePayoutSummary;
};