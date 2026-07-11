import type {
    BetRiskSide,
    BetTicketTier,
    SideBetDefinition
} from "@crazy-racing/shared";
import {
    createSideBetTicket
} from "@crazy-racing/shared";
import "./BettingTicket.css";

type SideBetTicketViewProps = {
    sideBet: SideBetDefinition;
    answer: "YES" | "NO";
    tier: BetTicketTier;
    selectedSide?: BetRiskSide | null;
    disabled?: boolean;
    onSelectSide?: (side: BetRiskSide) => void;
};

export function SideBetTicketView({
    sideBet,
    answer,
    tier,
    selectedSide = null,
    disabled = false,
    onSelectSide
}: SideBetTicketViewProps) {
    const safeTicket = createSideBetTicket(answer, tier, "safe");
    const riskyTicket = createSideBetTicket(answer, tier, "risky");

    return (
        <article className={`betTicket sideBetTicket sideBetAnswer${answer}`}>
            <header className="betTicketHeader">
                <span>{answer}</span>
                <strong>{capitalize(tier)} side bet</strong>
            </header>

            <p className="sideBetQuestion">{sideBet.text}</p>

            <div className="ticketSides">
                <TicketSideButton
                    label="SAFE"
                    selected={selectedSide === "safe"}
                    disabled={disabled}
                    onClick={() => onSelectSide?.("safe")}
                >
                    <SidePayoutTable ticket={safeTicket} />
                </TicketSideButton>

                <TicketSideButton
                    label="RISKY"
                    selected={selectedSide === "risky"}
                    disabled={disabled}
                    onClick={() => onSelectSide?.("risky")}
                >
                    <SidePayoutTable ticket={riskyTicket} />
                </TicketSideButton>
            </div>
        </article>
    );
}

function SidePayoutTable({
    ticket
}: {
    ticket: ReturnType<typeof createSideBetTicket>;
}) {
    return (
        <div className="sidePayoutTable">
            <div>
                <span>Correct</span>
                <strong>${ticket.correctPayout}</strong>
            </div>
            <div>
                <span>Wrong</span>
                <strong>
                    {ticket.incorrectPayout < 0
                        ? `-$${Math.abs(ticket.incorrectPayout)}`
                        : `$${ticket.incorrectPayout}`}
                </strong>
            </div>
        </div>
    );
}

type TicketSideButtonProps = {
    label: string;
    selected: boolean;
    disabled: boolean;
    onClick: () => void;
    children: React.ReactNode;
};

function TicketSideButton({
    label,
    selected,
    disabled,
    onClick,
    children
}: TicketSideButtonProps) {
    return (
        <button
            type="button"
            className={`ticketSide ${selected ? "ticketSideSelected" : ""}`}
            disabled={disabled}
            onClick={onClick}
        >
            <span className="ticketSideLabel">{label}</span>
            {children}
        </button>
    );
}

function capitalize(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}