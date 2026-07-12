import { useState } from "react";
import type {
    AvailableTicket,
    BetRiskSide,
    BettingDraftState,
    RaceCard,
    RacerName,
    SideBetDefinition,
    TicketStackKey
} from "@crazy-racing/shared";

import {
    MascotBetTicketView,
    SideBetTicketView
} from "../cards";
import { PublicRaceDeck } from "../cards/PublicRaceDeck";
import { PrivateHand } from "../cards/PrivateHand";

import "./BettingPhase.css";

type BettingPhaseProps = {
    socketPlayerId: string | undefined;
    currentPlayerName: string | null;
    draft: BettingDraftState;
    availableTickets: AvailableTicket[];
    currentSideBet: SideBetDefinition;
    publicDeckDefinitionIds: string[];
    privateHand: RaceCard[];
    onConfirmDraft: (
        stack: TicketStackKey,
        risk: BetRiskSide
    ) => void;
};

type SideBetAnswer = "YES" | "NO";

export function BettingPhase({
    socketPlayerId,
    currentPlayerName,
    draft,
    availableTickets,
    currentSideBet,
    publicDeckDefinitionIds,
    privateHand,
    onConfirmDraft
}: BettingPhaseProps) {
    const [selectedStack, setSelectedStack] =
        useState<TicketStackKey | null>(null);

    const [selectedRisk, setSelectedRisk] =
        useState<BetRiskSide | null>(null);

    const isMyTurn =
        draft.currentPlayerId === socketPlayerId;

    function selectTicket(
        stack: TicketStackKey,
        risk: BetRiskSide
    ) {
        if (!isMyTurn) {
            return;
        }

        setSelectedStack(stack);
        setSelectedRisk(risk);
    }

    function confirmDraft() {
        if (
            !isMyTurn ||
            selectedStack === null ||
            selectedRisk === null
        ) {
            return;
        }

        onConfirmDraft(
            selectedStack,
            selectedRisk
        );

        setSelectedStack(null);
        setSelectedRisk(null);
    }

    function renderAvailableTicket(
        ticket: AvailableTicket
    ) {
        const stack = ticket.stack;

        if (isMascotStack(stack)) {
            return (
                <MascotBetTicketView
                    key={stack}
                    racer={stack}
                    tier={ticket.tier}
                    selectedSide={
                        selectedStack === stack
                            ? selectedRisk
                            : null
                    }
                    disabled={!isMyTurn}
                    onSelectSide={(risk) =>
                        selectTicket(stack, risk)
                    }
                />
            );
        }

        if (isSideBetAnswer(stack)) {
            return (
                <SideBetTicketView
                    key={stack}
                    sideBet={currentSideBet}
                    answer={stack}
                    tier={ticket.tier}
                    selectedSide={
                        selectedStack === stack
                            ? selectedRisk
                            : null
                    }
                    disabled={!isMyTurn}
                    onSelectSide={(risk) =>
                        selectTicket(stack, risk)
                    }
                />
            );
        }

        return null;
    }

    return (
        <div className="bettingPhase">
            <section className="draftStatus">
                <h3>Betting draft</h3>

                <strong>
                    {isMyTurn
                        ? "It is your turn!"
                        : `Waiting for player ${currentPlayerName ?? ""}`}
                </strong>
            </section>

            <PublicRaceDeck
                definitionIds={publicDeckDefinitionIds}
            />

            <PrivateHand
                cards={privateHand}
            />

            <section>
                <h3>Current side bet</h3>

                <p className="currentSideBetQuestion">
                    {currentSideBet.text}
                </p>
            </section>

            <section className="availableTicketSection">
                <h3>Available betting tickets</h3>

                <div className="availableTicketGrid">
                    {availableTickets.map(
                        renderAvailableTicket
                    )}
                </div>
            </section>

            {isMyTurn && (
                <button
                    type="button"
                    disabled={
                        selectedStack === null ||
                        selectedRisk === null
                    }
                    onClick={confirmDraft}
                >
                    Confirm drafted ticket
                </button>
            )}
        </div>
    );
}

function isMascotStack(
    stack: TicketStackKey
): stack is RacerName {
    return (
        stack === "LION" ||
        stack === "HOTDOG" ||
        stack === "FISH" ||
        stack === "QUEEN"
    );
}

function isSideBetAnswer(
    stack: TicketStackKey
): stack is SideBetAnswer {
    return (
        stack === "YES" ||
        stack === "NO"
    );
}