import {
    type AvailableTicket,
    type BetTicketTier,
    type TicketStackKey,
    type TicketStackState
} from "@crazy-racing/shared";

const STACK_ORDER: TicketStackKey[] = [
    "LION",
    "HOTDOG",
    "FISH",
    "QUEEN",
    "YES",
    "NO"
];

const TIER_ORDER: BetTicketTier[] = [
    "top",
    "middle",
    "bottom"
];

export function createTicketStacks(): TicketStackState[] {
    return STACK_ORDER.map((stack) => ({
        stack,
        remainingTiers: [...TIER_ORDER]
    }));
}

export function getAvailableTickets(
    stacks: TicketStackState[]
): AvailableTicket[] {
    return stacks.flatMap((stackState) => {
        const tier = stackState.remainingTiers[0];

        if (!tier) {
            return [];
        }

        return [
            {
                stack: stackState.stack,
                tier,
                kind:
                    stackState.stack === "YES" ||
                        stackState.stack === "NO"
                        ? "side-bet"
                        : "mascot"
            }
        ];
    });
}

export function takeTicketFromStack(
    stacks: TicketStackState[],
    stack: TicketStackKey
): BetTicketTier {
    const stackState = stacks.find(
        (candidate) => candidate.stack === stack
    );

    if (!stackState) {
        throw new Error("Ticket stack not found.");
    }

    const tier = stackState.remainingTiers.shift();

    if (!tier) {
        throw new Error("This ticket stack is empty.");
    }

    return tier;
}