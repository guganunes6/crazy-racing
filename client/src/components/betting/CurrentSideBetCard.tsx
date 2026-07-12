import type {
    SideBetDefinition
} from "@crazy-racing/shared";
import "./CurrentSideBetCard.css";

type CurrentSideBetCardProps = {
    sideBet: SideBetDefinition;
};

export function CurrentSideBetCard({
    sideBet
}: CurrentSideBetCardProps) {
    return (
        <section className="currentSideBetCard">
            <header>Current side bet</header>

            <div className="currentSideBetAnswers">
                <span className="sideBetYes">YES</span>
                <span className="sideBetNo">NO</span>
            </div>

            <p>{sideBet.text}</p>
        </section>
    );
}