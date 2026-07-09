import { PodiumEntry, RacerName } from "./BoardModel";

const racerImages: Record<RacerName, string> = {
    QUEEN: "/src/assets/queen.svg",
    FISH: "/src/assets/fish.svg",
    HOTDOG: "/src/assets/hotdog.svg",
    LION: "/src/assets/lion.svg"
};

type PodiumProps = {
    podium: PodiumEntry[];
};

export function Podium({ podium }: PodiumProps) {
    const places = [1, 2, 3, 4];

    return (
        <aside className="podiumPanel">
            <h3>Podium</h3>

            <div className="podiumSteps">
                {places.map((place) => {
                    const entries = podium.filter((entry) => entry.place === place);

                    return (
                        <div key={place} className={`podiumPlace place${place}`}>
                            <div className="placeLabel">{place}</div>

                            <div className="podiumRacers">
                                {entries.map((entry) => (
                                    <div key={entry.racer} className="podiumRacer">
                                        <img src={racerImages[entry.racer]} alt={entry.racer} />
                                        <span>{entry.racer}</span>
                                        {entry.status === "DQ" && <strong>DQ</strong>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}