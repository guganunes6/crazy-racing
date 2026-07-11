import {
    BOARD,
    visibleStart,
    type RacerState
} from "@crazy-racing/shared";
import type { Room } from "../gameLogic.js";
import { resolveCollisions } from "./Collision.js";
import {
    disqualifyRacer,
    finishRacer
} from "./Podium.js";

export type MovementOptions = {
    canCollide: boolean;
    canFinish: boolean;
};

export function moveRacer(
    room: Room,
    racer: RacerState,
    value: number,
    options: MovementOptions
): void {
    if (racer.finished || racer.dq || value === 0) {
        return;
    }

    /*
     * Fallen mascots crawl a maximum of one space.
     * The original movement sign is preserved.
     */
    const effectiveValue = racer.fallen
        ? Math.sign(value)
        : value;

    const movementDirection =
        effectiveValue >= 0
            ? racer.facing
            : racer.facing === 1
                ? -1
                : 1;

    const numberOfSteps = Math.abs(effectiveValue);

    for (let step = 0; step < numberOfSteps; step++) {
        racer.position += movementDirection;

        if (isBehindTrack(room, racer)) {
            disqualifyRacer(
                room,
                racer,
                "moved off the back of the track"
            );

            return;
        }

        /*
         * Green cards cannot finish. They move as far as possible
         * without crossing the finish line.
         */
        if (
            !options.canFinish &&
            racer.position >= BOARD.finishPosition
        ) {
            racer.position = BOARD.finishPosition;
            break;
        }

        if (
            options.canFinish &&
            racer.position >= BOARD.finishPosition
        ) {
            finishRacer(room, racer);
            return;
        }

        /*
         * Collision checks happen after every individual space,
         * allowing collisions with racers that are passed through.
         */
        if (options.canCollide) {
            resolveCollisions(room, racer);
        }

        if (racer.finished || racer.dq) {
            return;
        }
    }

    room.raceLog.push(
        `${racer.name} moves ${value}.`
    );
}

export function moveRacerToNextStar(
    room: Room,
    racer: RacerState,
    options: MovementOptions
): void {
    if (racer.finished || racer.dq) {
        return;
    }

    const stars = [...BOARD.stars].sort((first, second) =>
        racer.facing === 1
            ? first - second
            : second - first
    );

    const destination = stars.find((starPosition) =>
        racer.facing === 1
            ? starPosition > racer.position
            : starPosition < racer.position
    );

    if (destination === undefined) {
        room.raceLog.push(
            `${racer.name} has no star in the direction it is facing.`
        );

        return;
    }

    /*
     * moveRacer applies movement relative to facing.
     * Therefore the distance passed here is always positive.
     */
    const distance = Math.abs(destination - racer.position);

    moveRacer(room, racer, distance, options);
}

export function swerveRacer(
    room: Room,
    racer: RacerState,
    relativeDirection: "LEFT" | "RIGHT",
    canCollide: boolean
): void {
    if (racer.finished || racer.dq) {
        return;
    }

    const baseLaneDelta =
        relativeDirection === "LEFT" ? -1 : 1;

    /*
     * Left and right are relative to the direction the mascot faces.
     */
    const actualLaneDelta =
        baseLaneDelta * racer.facing;

    racer.lane += actualLaneDelta;

    if (
        racer.lane < 0 ||
        racer.lane >= BOARD.laneCount
    ) {
        disqualifyRacer(
            room,
            racer,
            "swerved off the side of the track"
        );

        return;
    }

    if (canCollide) {
        resolveCollisions(room, racer);
    }

    room.raceLog.push(
        `${racer.name} swerves ${relativeDirection.toLowerCase()}.`
    );
}

function isBehindTrack(
    room: Room,
    racer: RacerState
): boolean {
    return racer.position < visibleStart(room.shortenedBy);
}