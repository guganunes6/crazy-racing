import type {
    DraftedBetTicket,
    SideBetDefinition
} from "@crazy-racing/shared";

import {
    MascotBetTicketView,
    SideBetTicketView
} from "../cards";

import "./DraftedTicketChoice.css";

type DraftedTicketChoiceProps = {
    ticket: DraftedBetTicket;
    currentSideBet: SideBetDefinition;
    selected?: boolean;
    disabled?: boolean;
    onSelect: () => void;
};

export function DraftedTicketChoice({
    ticket,
    currentSideBet,
    selected = false,
    disabled = false,
    onSelect
}: DraftedTicketChoiceProps) {
    function handleSelect() {
        if (!disabled) {
            onSelect();
        }
    }

    function handleKeyDown(
        event: React.KeyboardEvent<HTMLDivElement>
    ) {
        if (
            event.key === "Enter" ||
            event.key === " "
        ) {
            event.preventDefault();
            handleSelect();
        }
    }

    return (
        <div
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled}
            className={[
                "draftedTicketChoice",
                selected
                    ? "draftedTicketChoiceSelected"
                    : "",
                disabled
                    ? "draftedTicketChoiceDisabled"
                    : ""
            ]
                .filter(Boolean)
                .join(" ")}
            onClick={handleSelect}
            onKeyDown={handleKeyDown}
        >
            {ticket.kind === "mascot" ? (
                <MascotBetTicketView
                    racer={ticket.racer}
                    tier={ticket.tier}
                    selectedSide={ticket.risk}
                    interactiveSides={false}
                />
            ) : (
                <SideBetTicketView
                    sideBet={currentSideBet}
                    answer={ticket.answer}
                    tier={ticket.tier}
                    selectedSide={ticket.risk}
                    interactiveSides={false}
                />
            )}

            <div className="draftedTicketChoiceFooter">
                <strong>
                    {selected
                        ? "Selected for x2"
                        : "Select this ticket for x2"}
                </strong>
            </div>
        </div>
    );
}