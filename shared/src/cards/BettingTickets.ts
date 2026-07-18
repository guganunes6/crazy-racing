import { RacerName } from "../racers/Racers.js";

export type BetTicketTier = "top" | "middle" | "bottom";
export type BetRiskSide = "safe" | "risky";

export type MascotBetTicket = {
    type: "mascot";
    id: string;
    racer: RacerName;
    tier: BetTicketTier;
    side: BetRiskSide;
    payouts: {
        first: number;
        second: number;
        third: number;
    };
};

const MASCOT_PAYOUTS = {
    top: {
        safe: [10, 7, 5],
        risky: [15, 5, 2]
    },
    middle: {
        safe: [7, 5, 3],
        risky: [11, 3, 1]
    },
    bottom: {
        safe: [5, 3, 2],
        risky: [8, 2, 0]
    }
} as const;

export function createMascotBetTicket(
    racer: RacerName,
    tier: BetTicketTier,
    side: BetRiskSide
): MascotBetTicket {
    const [first, second, third] = MASCOT_PAYOUTS[tier][side];

    return {
        type: "mascot",
        id: `MASCOT_${racer}_${tier.toUpperCase()}_${side.toUpperCase()}`,
        racer,
        tier,
        side,
        payouts: {
            first,
            second,
            third
        }
    };
}

export type SideBetTicket = {
    type: "side-bet";
    id: string;
    answer: "YES" | "NO";
    tier: BetTicketTier;
    side: BetRiskSide;
    correctPayout: number;
    incorrectPayout: number;
};

const SIDE_BET_PAYOUTS = {
    top: {
        safe: [10, 0],
        risky: [15, -5]
    },
    middle: {
        safe: [7, 0],
        risky: [12, -5]
    },
    bottom: {
        safe: [5, 0],
        risky: [10, -5]
    }
} as const;

export function createSideBetTicket(
    answer: "YES" | "NO",
    tier: BetTicketTier,
    side: BetRiskSide
): SideBetTicket {
    const [correctPayout, incorrectPayout] = SIDE_BET_PAYOUTS[tier][side];

    return {
        type: "side-bet",
        id: `SIDE_${answer}_${tier.toUpperCase()}_${side.toUpperCase()}`,
        answer,
        tier,
        side,
        correctPayout,
        incorrectPayout
    };
}