import type {
    RaceEvent,
    RacerName
} from "@crazy-racing/shared";

import "./Board.css";

import {
    LANE_ORDER,
    RacerOnBoard,
    getVisibleStartPosition
} from "./BoardModel";

import { Lane } from "./Lane";
import { RacerLayer } from "./RacerLayer";

type BoardProps = {
    racers: RacerOnBoard[];

    shortenedBy?: number;
    remainingCards: number;

    deckCounterLabel?: string;

    activeEvent?: RaceEvent | null;

    activeCardOwner?:
    | RacerName
    | "GREEN"
    | null;

    isAnimating?: boolean;
};

export function Board({
    racers,
    shortenedBy = 0,
    remainingCards,

    deckCounterLabel,

    activeEvent = null,
    activeCardOwner = null,

    isAnimating = false
}: BoardProps) {
    const visibleStartPosition =
        getVisibleStartPosition(
            shortenedBy
        );

    const counterText =
        deckCounterLabel ??
        (
            `Racing deck: ` +
            `${remainingCards} cards remaining`
        );

    const isReshuffling =
        activeEvent?.type ===
        "DECK_RESHUFFLED";

    const isFolding =
        activeEvent?.type ===
        "TRACK_FOLDED";

    const hasFinishEvent =
        activeEvent?.type ===
        "RACER_FINISHED";

    const hasDqEvent =
        activeEvent?.type ===
        "RACER_DISQUALIFIED";

    return (
        <section
            className={[
                "boardScene",

                isAnimating
                    ? "boardAnimating"
                    : "",

                isReshuffling
                    ? "boardReshuffling"
                    : "",

                isFolding
                    ? "boardFolding"
                    : "",

                hasFinishEvent
                    ? "boardFinishEvent"
                    : "",

                hasDqEvent
                    ? "boardDqEvent"
                    : ""
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <div className="boardFrame">
                <div className="boardTitle">
                    <span>
                        CRAZY RACING TRACK
                    </span>

                    <span className="boardDeckCounter">
                        {counterText}
                    </span>
                </div>

                <div className="trackMat">
                    {LANE_ORDER.map(
                        (
                            laneName,
                            laneIndex
                        ) => (
                            <Lane
                                key={
                                    laneName
                                }
                                laneIndex={
                                    laneIndex
                                }
                                laneName={
                                    laneName
                                }
                                visibleStartPosition={
                                    visibleStartPosition
                                }
                            />
                        )
                    )}

                    <RacerLayer
                        racers={racers}
                        activeEvent={
                            activeEvent
                        }
                        activeCardOwner={
                            activeCardOwner
                        }
                    />
                </div>
            </div>
        </section>
    );
}