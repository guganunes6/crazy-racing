import { RacerName, RACERS } from "../racers/Racers";

export type CardAction =
    | { type: "RECOVER" }
    | { type: "MOVE"; value: number }
    | { type: "MOVE_TO_STAR" }
    | { type: "TURN_AROUND" }
    | { type: "FALL_DOWN" }
    | { type: "SWERVE_LEFT" }
    | { type: "SWERVE_RIGHT" };

export type RaceCardDefinition = {
    id: string;
    name: string;
    racer: RacerName | "GREEN";
    actions: CardAction[];
    green: boolean;
    canCollide: boolean;
    canFinish: boolean;
};

function mascotCard(
    racer: RacerName,
    suffix: string,
    name: string,
    actions: CardAction[]
): RaceCardDefinition {
    return {
        id: `${racer}_${suffix}`,
        name,
        racer,
        actions,
        green: false,
        canCollide: true,
        canFinish: true
    };
}

function greenCard(
    id: string,
    name: string,
    actions: CardAction[]
): RaceCardDefinition {
    return {
        id,
        name,
        racer: "GREEN",
        actions,
        green: true,
        canCollide: false,
        canFinish: false
    };
}

function createMascotCards(racer: RacerName): RaceCardDefinition[] {
    const swerveAction =
        racer === "LION" || racer === "HOTDOG"
            ? ({ type: "SWERVE_RIGHT" } as CardAction)
            : ({ type: "SWERVE_LEFT" } as CardAction);

    const swerveName =
        racer === "LION" || racer === "HOTDOG" ? "Swerve Right" : "Swerve Left";

    const swerveSuffix =
        racer === "LION" || racer === "HOTDOG" ? "SWERVE_RIGHT" : "SWERVE_LEFT";

    return [
        mascotCard(racer, "RECOVER_MOVE_1", "Recover then Move 1", [
            { type: "RECOVER" },
            { type: "MOVE", value: 1 }
        ]),
        mascotCard(racer, "RECOVER_MOVE_2", "Recover then Move 2", [
            { type: "RECOVER" },
            { type: "MOVE", value: 2 }
        ]),
        mascotCard(racer, "MOVE_2", "Move 2", [{ type: "MOVE", value: 2 }]),
        mascotCard(racer, "MOVE_3", "Move 3", [{ type: "MOVE", value: 3 }]),
        mascotCard(racer, "MOVE_BACK_2", "Move -2", [
            { type: "MOVE", value: -2 }
        ]),
        mascotCard(racer, "MOVE_TO_STAR", "Move to Star", [
            { type: "MOVE_TO_STAR" }
        ]),
        mascotCard(racer, "TURN_AROUND", "Turn Around", [
            { type: "TURN_AROUND" }
        ]),
        mascotCard(racer, "FALL_DOWN", "Fall Down", [{ type: "FALL_DOWN" }]),
        mascotCard(racer, `MOVE_1_${swerveSuffix}`, `Move 1 then ${swerveName}`, [
            { type: "MOVE", value: 1 },
            swerveAction
        ]),
        mascotCard(racer, `MOVE_2_${swerveSuffix}`, `Move 2 then ${swerveName}`, [
            { type: "MOVE", value: 2 },
            swerveAction
        ]),
        mascotCard(racer, `MOVE_3_${swerveSuffix}`, `Move 3 then ${swerveName}`, [
            { type: "MOVE", value: 3 },
            swerveAction
        ])
    ];
}

export const CARD_CATALOG: RaceCardDefinition[] = [
    ...RACERS.flatMap(createMascotCards),

    greenCard("GREEN_MOVE_1_A", "Green Move 1", [{ type: "MOVE", value: 1 }]),
    greenCard("GREEN_MOVE_1_B", "Green Move 1", [{ type: "MOVE", value: 1 }]),

    greenCard("GREEN_MOVE_2_A", "Green Move 2", [{ type: "MOVE", value: 2 }]),
    greenCard("GREEN_MOVE_2_B", "Green Move 2", [{ type: "MOVE", value: 2 }]),

    greenCard("GREEN_MOVE_3_A", "Green Move 3", [{ type: "MOVE", value: 3 }]),
    greenCard("GREEN_MOVE_3_B", "Green Move 3", [{ type: "MOVE", value: 3 }]),

    greenCard("GREEN_RECOVER_MOVE_2", "Green Recover then Move 2", [
        { type: "RECOVER" },
        { type: "MOVE", value: 2 }
    ]),
    greenCard("GREEN_RECOVER_MOVE_3", "Green Recover then Move 3", [
        { type: "RECOVER" },
        { type: "MOVE", value: 3 }
    ]),
    greenCard("GREEN_MOVE_BACK_2", "Green Move -2", [
        { type: "MOVE", value: -2 }
    ])
];

export const CARD_CATALOG_BY_ID = Object.fromEntries(
    CARD_CATALOG.map((card) => [card.id, card])
) as Record<string, RaceCardDefinition>;

export function getCardDefinition(cardId: string) {
    return CARD_CATALOG_BY_ID[cardId];
}