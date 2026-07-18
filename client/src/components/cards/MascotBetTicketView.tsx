import type {
    BetRiskSide,
    BetTicketTier,
    RacerName
} from "@crazy-racing/shared";
import {
    createMascotBetTicket
} from "@crazy-racing/shared";
import "./BettingTicket.css";
import { racerImages } from "../../assets/racerAssets";

type MascotBetTicketViewProps = {
    racer: RacerName;
    tier: BetTicketTier;
    selectedSide?: BetRiskSide | null;
    disabled?: boolean;
    interactiveSides?: boolean;
    onSelectSide?: (side: BetRiskSide) => void;
};


export function MascotBetTicketView({
    racer,
    tier,
    selectedSide = null,
    disabled = false,
    interactiveSides = true,
    onSelectSide
}: MascotBetTicketViewProps) {
    const safeTicket = createMascotBetTicket(racer, tier, "safe");
    const riskyTicket = createMascotBetTicket(racer, tier, "risky");

    return (
        <article
            className={`betTicket mascotTicket mascotTicket${capitalize(racer)}`}
        >
            <header className="betTicketHeader mascotBetTicketHeader">
                <span>{racer}</span>

                <img
                    src={racerImages[racer]}
                    alt={racer}
                    className="betTicketMascotImage"
                />

                <strong>{capitalize(tier)} bet</strong>
            </header>

            <div className="ticketSides">
                <TicketSideButton
                    label="SAFE"
                    selected={selectedSide === "safe"}
                    disabled={disabled}
                    interactive={interactiveSides}
                    onClick={() => onSelectSide?.("safe")}
                >
                    <MascotPayoutTable ticket={safeTicket} />
                </TicketSideButton>

                <TicketSideButton
                    label="RISKY"
                    selected={selectedSide === "risky"}
                    disabled={disabled}
                    interactive={interactiveSides}
                    onClick={() => onSelectSide?.("risky")}
                >
                    <MascotPayoutTable ticket={riskyTicket} />
                </TicketSideButton>
            </div>
        </article>
    );
}

function MascotPayoutTable({
    ticket
}: {
    ticket: ReturnType<typeof createMascotBetTicket>;
}) {
    return (
        <div className="payoutTable">
            <div>
                <span>1st</span>
                <strong>${ticket.payouts.first}</strong>
            </div>

            <div>
                <span>2nd</span>
                <strong>${ticket.payouts.second}</strong>
            </div>

            <div>
                <span>3rd</span>
                <strong>${ticket.payouts.third}</strong>
            </div>
        </div>
    );
}

type TicketSideButtonProps = {
    label: string;
    selected: boolean;
    disabled: boolean;
    interactive: boolean;
    onClick: () => void;
    children: React.ReactNode;
};

function TicketSideButton({
    label,
    selected,
    disabled,
    interactive,
    onClick,
    children
}: TicketSideButtonProps) {
    const className = [
        "ticketSide",
        selected ? "ticketSideSelected" : "",
        !interactive ? "ticketSideStatic" : ""
    ]
        .filter(Boolean)
        .join(" ");

    if (!interactive) {
        return (
            <div className={className}>
                <span className="ticketSideLabel">
                    {label}
                </span>

                {children}
            </div>
        );
    }

    return (
        <button
            type="button"
            className={className}
            disabled={disabled}
            onClick={onClick}
        >
            <span className="ticketSideLabel">
                {label}
            </span>

            {children}
        </button>
    );
}

function capitalize(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
