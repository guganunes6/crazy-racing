import type {
    DraftedBetTicket,
    RacerName
} from "@crazy-racing/shared";
import "./DraftedTicketIcon.css";
import { racerImages } from "../../assets/racerAssets";


type DraftedTicketIconProps = {
    ticket: DraftedBetTicket;
};

export function DraftedTicketIcon({
    ticket
}: DraftedTicketIconProps) {
    if (ticket.kind === "mascot") {
        return (
            <div
                className={`draftedTicketIcon draftedTicket${ticket.racer}`}
                title={`${ticket.racer} ${ticket.tier} ${ticket.risk}`}
            >
                <img
                    src={
                        racerImages[
                        ticket.racer
                        ]
                    }
                    alt={ticket.racer}
                />

                <span>
                    {ticket.tier}
                </span>

                <strong>
                    {ticket.risk}
                </strong>

                {ticket.doubled && (
                    <b>x2</b>
                )}
            </div>
        );
    }

    return (
        <div
            className={`draftedTicketIcon draftedTicketAnswer${ticket.answer}`}
            title={`${ticket.answer} ${ticket.tier} ${ticket.risk}`}
        >
            <div className="draftedTicketAnswer">
                {ticket.answer}
            </div>

            <span>
                {ticket.tier}
            </span>

            <strong>
                {ticket.risk}
            </strong>

            {ticket.doubled && (
                <b>x2</b>
            )}
        </div>
    );
}
