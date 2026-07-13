import type {
    RacePayoutSummary,
    TicketPayoutResult
} from "@crazy-racing/shared";
import "./PayoutSummary.css";

type PayoutSummaryProps = {
    summary: RacePayoutSummary;
    currentPlayerId?: string;
};

export function PayoutSummary({
    summary,
    currentPlayerId
}: PayoutSummaryProps) {
    return (
        <section className="payoutSummary">
            <header className="payoutSummaryHeader">
                <div>
                    <span>Race {summary.raceNumber}</span>
                    <h3>Payout summary</h3>
                </div>

                <div
                    className={[
                        "sideBetResult",
                        summary.sideBetResult
                            ? "sideBetResultYes"
                            : "sideBetResultNo"
                    ].join(" ")}
                >
                    Side bet result:{" "}
                    <strong>
                        {summary.sideBetResult
                            ? "YES"
                            : "NO"}
                    </strong>
                </div>
            </header>

            <p className="payoutSideBetQuestion">
                {summary.sideBetQuestion}
            </p>

            <div className="playerPayoutList">
                {summary.playerPayouts.map(
                    (playerPayout) => (
                        <article
                            key={playerPayout.playerId}
                            className={[
                                "playerPayoutCard",
                                playerPayout.playerId ===
                                    currentPlayerId
                                    ? "playerPayoutCardMe"
                                    : ""
                            ]
                                .filter(Boolean)
                                .join(" ")}
                        >
                            <header>
                                <strong>
                                    {playerPayout.playerName}
                                    {playerPayout.playerId ===
                                        currentPlayerId
                                        ? " (you)"
                                        : ""}
                                </strong>

                                <span
                                    className={
                                        playerPayout.moneyChange >= 0
                                            ? "positivePayout"
                                            : "negativePayout"
                                    }
                                >
                                    {formatSignedMoney(
                                        playerPayout.moneyChange
                                    )}
                                </span>
                            </header>

                            <div className="moneyProgression">
                                <span>
                                    Before: ${playerPayout.moneyBefore}
                                </span>

                                <span>
                                    After: ${playerPayout.moneyAfter}
                                </span>
                            </div>

                            <div className="ticketPayoutList">
                                {playerPayout.tickets.map(
                                    (ticket) => (
                                        <TicketPayoutRow
                                            key={ticket.ticketId}
                                            ticket={ticket}
                                        />
                                    )
                                )}
                            </div>
                        </article>
                    )
                )}
            </div>
        </section>
    );
}

function TicketPayoutRow({
    ticket
}: {
    ticket: TicketPayoutResult;
}) {
    return (
        <div
            className={[
                "ticketPayoutRow",
                ticket.correct
                    ? "ticketPayoutCorrect"
                    : "ticketPayoutIncorrect"
            ].join(" ")}
        >
            <div>
                <strong>{ticket.label}</strong>

                <span>
                    {ticket.correct
                        ? "Correct"
                        : "Incorrect"}

                    {ticket.doubled
                        ? " - x2"
                        : ""}
                </span>
            </div>

            <strong
                className={
                    ticket.finalPayout >= 0
                        ? "positivePayout"
                        : "negativePayout"
                }
            >
                {formatSignedMoney(
                    ticket.finalPayout
                )}
            </strong>
        </div>
    );
}

function formatSignedMoney(
    value: number
): string {
    if (value > 0) {
        return `+$${value}`;
    }

    if (value < 0) {
        return `-$${Math.abs(value)}`;
    }

    return "$0";
}