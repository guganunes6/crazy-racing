import type {
    CardAction,
    RaceCardDefinition,
    RacerState
} from "@crazy-racing/shared";
import type { Room } from "../gameLogic.js";
import {
    moveGreenRacersSimultaneously,
    moveRacer,
    moveRacerToNextStar,
    swerveRacer
} from "./Movement.js";
import {
    checkRaceEnd,
    disqualifyRacer
} from "./Podium.js";
import {
    recordRaceEvent,
    recordRaceState
} from "./RaceEvents.js";

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
        (candidate) =>
            candidate.name === definition.racer
    );

    if (
        !racer ||
        racer.finished ||
        racer.dq
    ) {
        return;
    }

    for (const action of definition.actions) {
        if (
            racer.finished ||
            racer.dq
        ) {
            break;
        }

        executeAction(
            room,
            racer,
            action,
            definition,
            true
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
    for (const action of definition.actions) {
        const activeRacers = room.racers.filter(
            (racer) =>
                !racer.finished &&
                !racer.dq
        );

        if (action.type === "MOVE") {
            moveGreenRacersSimultaneously(
                room,
                activeRacers,
                action.value
            );
        } else {
            for (const racer of activeRacers) {
                executeAction(
                    room,
                    racer,
                    action,
                    definition,
                    false
                );
            }

            recordRaceState(
                room,
                sourceForAction(action)
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
    definition: RaceCardDefinition,
    recordState: boolean
): void {
    const movementOptions = {
        canCollide: definition.canCollide,
        canFinish: definition.canFinish
    };

    switch (action.type) {
        case "RECOVER":
            recoverRacer(room, racer, recordState);
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
            turnRacerAround(room, racer, recordState);
            return;

        case "FALL_DOWN":
            makeRacerFall(room, racer, recordState);
            return;

        case "SWERVE_LEFT":
            swerveRacer(
                room,
                racer,
                "LEFT",
                definition.canCollide,
                recordState
            );
            return;

        case "SWERVE_RIGHT":
            swerveRacer(
                room,
                racer,
                "RIGHT",
                definition.canCollide,
                recordState
            );
            return;
    }
}

function recoverRacer(
    room: Room,
    racer: RacerState,
    recordState: boolean
): void {
    racer.fallen = false;
    racer.facing = 1;

    recordRaceEvent(room, {
        type: "RACER_RECOVERED",
        racer: racer.name
    });

    if (recordState) {
        recordRaceState(room, "RECOVER");
    }
}

function turnRacerAround(
    room: Room,
    racer: RacerState,
    recordState: boolean
): void {
    racer.facing =
        racer.facing === 1
            ? -1
            : 1;

    recordRaceEvent(room, {
        type: "RACER_TURNED",
        racer: racer.name,
        facing: racer.facing
    });

    if (recordState) {
        recordRaceState(room, "TURN");
    }
}

function makeRacerFall(
    room: Room,
    racer: RacerState,
    recordState: boolean
): void {
    if (racer.fallen) {
        disqualifyRacer(
            room,
            racer,
            "had to fall while already fallen",
            "knockout"
        );

        return;
    }

    racer.fallen = true;

    recordRaceEvent(room, {
        type: "RACER_FELL",
        racer: racer.name,
        cause: "CARD"
    });

    if (recordState) {
        recordRaceState(room, "FALL");
    }
}

function sourceForAction(
    action: CardAction
): "MOVE" | "SWERVE" | "FALL" | "RECOVER" | "TURN" {
    switch (action.type) {
        case "RECOVER":
            return "RECOVER";
        case "MOVE":
        case "MOVE_TO_STAR":
            return "MOVE";
        case "TURN_AROUND":
            return "TURN";
        case "FALL_DOWN":
            return "FALL";
        case "SWERVE_LEFT":
        case "SWERVE_RIGHT":
            return "SWERVE";
    }
}
