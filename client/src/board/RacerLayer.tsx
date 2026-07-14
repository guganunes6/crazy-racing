import type {
    CSSProperties
} from "react";

import type {
    RaceEvent,
    RacerName
} from "@crazy-racing/shared";

import type {
    RacerOnBoard
} from "./BoardModel";

import { Mascot } from "./Mascot";

type CardOwner =
    | RacerName
    | "GREEN";

type RacerLayerProps = {
    racers: RacerOnBoard[];

    activeEvent?:
    RaceEvent | null;

    activeCardOwner?:
    CardOwner | null;
};

type PositionedRacer =
    RacerOnBoard & {
        countInSpace: number;
        indexInSpace: number;
    };

export function RacerLayer({
    racers,
    activeEvent = null,
    activeCardOwner = null
}: RacerLayerProps) {
    const activeRacers =
        racers.filter(
            (racer) =>
                !racer.finished &&
                !racer.dq
        );

    const positionedRacers:
        PositionedRacer[] =
        activeRacers.map(
            (racer) => {
                const sameSpace =
                    activeRacers.filter(
                        (candidate) =>
                            candidate.lane ===
                            racer.lane &&
                            candidate.position ===
                            racer.position
                    );

                return {
                    ...racer,

                    countInSpace:
                        sameSpace.length,

                    indexInSpace:
                        sameSpace.findIndex(
                            (candidate) =>
                                candidate.name ===
                                racer.name
                        )
                };
            }
        );

    return (
        <div
            className="racerLayer"
            aria-hidden="true"
        >
            {positionedRacers.map(
                (racer) => {
                    const eventClass =
                        getEventClass(
                            activeEvent,
                            racer.name
                        );

                    const affectedByGreenCard =
                        activeCardOwner ===
                        "GREEN";

                    const affectedByMascotCard =
                        activeCardOwner ===
                        racer.name;

                    const glowClass =
                        affectedByGreenCard
                            ? "racerGreenAffected"
                            : (
                                affectedByMascotCard
                                    ? "racerCardAffected"
                                    : ""
                            );

                    return (
                        <div
                            key={racer.name}
                            className={[
                                "racerToken",
                                eventClass,
                                glowClass
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            style={
                                {
                                    "--racer-position":
                                        racer.position,

                                    "--racer-lane":
                                        racer.lane
                                } as CSSProperties
                            }
                        >
                            <Mascot
                                name={
                                    racer.name
                                }
                                countInSpace={
                                    racer.countInSpace
                                }
                                indexInSpace={
                                    racer.indexInSpace
                                }
                                fallen={
                                    racer.fallen
                                }
                                facing={
                                    racer.facing
                                }
                            />
                        </div>
                    );
                }
            )}
        </div>
    );
}

function getEventClass(
    event: RaceEvent | null,
    racer: RacerName
): string {
    if (!event) {
        return "";
    }

    switch (event.type) {
        case "RACER_MOVED":
            if (
                event.racer !== racer
            ) {
                return "";
            }

            return event.crawling
                ? "racerAnimatingCrawl"
                : "racerAnimatingMove";

        case "RACER_SWERVED":
            return event.racer === racer
                ? "racerAnimatingSwerve"
                : "";

        case "RACER_FELL":
            return event.racer === racer
                ? "racerAnimatingFall"
                : "";

        case "RACER_RECOVERED":
            return event.racer === racer
                ? "racerAnimatingRecover"
                : "";

        case "RACER_TURNED":
            return event.racer === racer
                ? "racerAnimatingTurn"
                : "";

        case "COLLISION":
            if (
                event.movingRacer ===
                racer
            ) {
                return "racerAnimatingHit";
            }

            return (
                event.affectedRacer ===
                    racer
                    ? "racerAnimatingCollision"
                    : ""
            );

        case "RACER_DISQUALIFIED":
            return event.racer === racer
                ? "racerAnimatingDq"
                : "";

        case "RACER_FINISHED":
            return event.racer === racer
                ? "racerAnimatingFinish"
                : "";

        default:
            return "";
    }
}