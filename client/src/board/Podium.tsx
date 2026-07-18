import {
    useEffect,
    useRef
} from "react";

import {
    useSound
} from "../audio/useSound";

import type {
    PodiumEntry,
    RacerName
} from "./BoardModel";
import { racerImages } from "../assets/racerAssets";


type PodiumProps = {
    podium: PodiumEntry[];
};

export function Podium({
    podium
}: PodiumProps) {
    const places = [
        1,
        2,
        3,
        4
    ];

    const {
        playEffect
    } = useSound();

    const previousEntryCountRef =
        useRef(
            podium.length
        );

    useEffect(() => {
        if (
            podium.length >
            previousEntryCountRef.current
        ) {
            playEffect(
                "podium",
                {
                    volume: 0.75
                }
            );
        }

        previousEntryCountRef.current =
            podium.length;
    }, [
        playEffect,
        podium.length
    ]);

    return (
        <aside className="podiumPanel">
            <h3>
                Podium
            </h3>

            <div className="podiumSteps">
                {places.map(
                    (place) => {
                        const entries =
                            podium.filter(
                                (entry) =>
                                    entry.place ===
                                    place
                            );

                        return (
                            <div
                                key={place}
                                className={[
                                    "podiumPlace",
                                    `place${place}`,

                                    entries.length >
                                        0
                                        ? "podiumPlaceOccupied"
                                        : ""
                                ]
                                    .filter(Boolean)
                                    .join(" ")}
                            >
                                <div className="placeLabel">
                                    {place}
                                </div>

                                <div className="podiumRacers">
                                    {entries.map(
                                        (
                                            entry,
                                            entryIndex
                                        ) => (
                                            <div
                                                key={
                                                    `${entry.racer}-${entry.status}`
                                                }
                                                className={[
                                                    "podiumRacer",

                                                    place ===
                                                        1
                                                        ? "podiumRacerWinner"
                                                        : "",

                                                    entry.status ===
                                                        "DQ"
                                                        ? "podiumRacerDq"
                                                        : ""
                                                ]
                                                    .filter(Boolean)
                                                    .join(" ")}
                                                style={
                                                    {
                                                        "--podium-entry-delay":
                                                            `${entryIndex * 90}ms`
                                                    } as React.CSSProperties
                                                }
                                            >
                                                <span className="podiumWinnerSparkles">
                                                    <i />
                                                    <i />
                                                    <i />
                                                    <i />
                                                </span>

                                                <img
                                                    src={
                                                        racerImages[
                                                        entry.racer
                                                        ]
                                                    }
                                                    alt={
                                                        entry.racer
                                                    }
                                                />

                                                <span>
                                                    {
                                                        entry.racer
                                                    }
                                                </span>

                                                {entry.status ===
                                                    "DQ" && (
                                                        <strong>
                                                            DQ
                                                        </strong>
                                                    )}
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    }
                )}
            </div>
        </aside>
    );
}
