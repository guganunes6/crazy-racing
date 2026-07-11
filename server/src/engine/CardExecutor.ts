import {
    type CardAction,
    type RaceCardDefinition,
    type RacerState
} from "@crazy-racing/shared";
import type { Room } from "../gameLogic.js";
import {
    moveRacer,
    moveRacerToNextStar,
    swerveRacer
} from "./Movement.js";
import {
    checkRaceEnd,
    disqualifyRacer
} from "./Podium.js";

export function executeCardDefinition(
    room: Room,
    definition: RaceCardDefinition
): void {
    if (definition.green) {
        executeGreenCard(room, definition);
        return;
    }

    if (definition.racer === "GREEN") {
        return;
    }

    const racer = room.racers.find(
        (candidate) => candidate.name === definition.racer
    );

    if (!racer || racer.finished || racer.dq) {
        room.raceLog.push(
            `${definition.name} has no effect because ${definition.racer} is no longer racing.`
        );

        return;
    }

    for (const action of definition.actions) {
        if (racer.finished || racer.dq) {
            break;
        }

        executeAction(
            room,
            racer,
            action,
            definition
        );

        if (checkRaceEnd(room)) {
            break;
        }
    }
}

function executeGreenCard(
    room: Room,
    definition: RaceCardDefinition
): void {

    /*
     * Each action affects every active mascot.
     * Green movement cannot collide or finish.
     */
    for (const action of definition.actions) {
        const activeRacers = room.racers.filter(
            (racer) => !racer.finished && !racer.dq
        );

        for (const racer of activeRacers) {
            executeAction(
                room,
                racer,
                action,
                definition
            );
        }

        if (checkRaceEnd(room)) {
            break;
        }
    }
}

function executeAction(
    room: Room,
    racer: RacerState,
    action: CardAction,
    definition: RaceCardDefinition
): void {
    const movementOptions = {
        canCollide: definition.canCollide,
        canFinish: definition.canFinish
    };

    switch (action.type) {
        case "RECOVER":
            recoverRacer(room, racer);
            return;

        case "MOVE":
            moveRacer(
                room,
                racer,
                action.value,
                movementOptions
            );
            return;

        case "MOVE_TO_STAR":
            moveRacerToNextStar(
                room,
                racer,
                movementOptions
            );
            return;

        case "TURN_AROUND":
            turnRacerAround(room, racer);
            return;

        case "FALL_DOWN":
            makeRacerFall(room, racer);
            return;

        case "SWERVE_LEFT":
            swerveRacer(
                room,
                racer,
                "LEFT",
                definition.canCollide
            );
            return;

        case "SWERVE_RIGHT":
            swerveRacer(
                room,
                racer,
                "RIGHT",
                definition.canCollide
            );
            return;
    }
}

function recoverRacer(
    room: Room,
    racer: RacerState
): void {
    racer.fallen = false;
    racer.facing = 1;

    room.raceLog.push(
        `${racer.name} recovers, stands up and faces the finish line.`
    );
}

function turnRacerAround(
    room: Room,
    racer: RacerState
): void {
    racer.facing = racer.facing === 1 ? -1 : 1;

    room.raceLog.push(
        `${racer.name} turns around.`
    );
}

function makeRacerFall(
    room: Room,
    racer: RacerState
): void {
    if (racer.fallen) {
        disqualifyRacer(
            room,
            racer,
            "had to fall down while already fallen"
        );

        return;
    }

    racer.fallen = true;

    room.raceLog.push(
        `${racer.name} falls down.`
    );
}