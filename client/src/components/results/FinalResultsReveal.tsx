import type {
    CSSProperties,
    ReactNode
} from "react";

import "./FinalResultsReveal.css";

type FinalResultsRevealProps = {
    children: ReactNode;
};

type FinalResultEntryProps = {
    index: number;
    winner?: boolean;
    children: ReactNode;
};

export function FinalResultsReveal({
    children
}: FinalResultsRevealProps) {
    return (
        <div className="finalResultsReveal">
            <div className="finalResultsTitleReveal">
                <span>
                    Championship complete
                </span>

                <h3>
                    Final Results
                </h3>
            </div>

            {children}
        </div>
    );
}

export function FinalResultEntry({
    index,
    winner = false,
    children
}: FinalResultEntryProps) {
    return (
        <div
            className={[
                "finalResultRevealEntry",

                winner
                    ? "finalResultRevealWinner"
                    : ""
            ]
                .filter(Boolean)
                .join(" ")}
            style={
                {
                    "--final-entry-delay":
                        `${250 + index * 130}ms`
                } as CSSProperties
            }
        >
            {winner && (
                <span className="finalWinnerGlow">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                </span>
            )}

            {children}
        </div>
    );
}