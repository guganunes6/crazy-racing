import type {
    CompletedRaceReplay
} from "@crazy-racing/shared";

export const REPLAY_FILE_FORMAT =
    "crazy-racing-replay";

export const REPLAY_FILE_VERSION = 1;

export type CrazyRacingReplayFile = {
    format:
    typeof REPLAY_FILE_FORMAT;

    version:
    typeof REPLAY_FILE_VERSION;

    exportedAt: string;

    replay:
    CompletedRaceReplay;
};

const MAX_REPLAY_FILE_SIZE =
    5 * 1024 * 1024;

export function downloadRaceReplay(
    replay: CompletedRaceReplay
): void {
    const replayFile:
        CrazyRacingReplayFile = {
        format:
            REPLAY_FILE_FORMAT,

        version:
            REPLAY_FILE_VERSION,

        exportedAt:
            new Date().toISOString(),

        replay
    };

    const json =
        JSON.stringify(
            replayFile,
            null,
            2
        );

    const blob =
        new Blob(
            [json],
            {
                type:
                    "application/json"
            }
        );

    const downloadUrl =
        URL.createObjectURL(
            blob
        );

    const anchor =
        document.createElement(
            "a"
        );

    anchor.href =
        downloadUrl;

    anchor.download =
        createReplayFilename(
            replay
        );

    document.body.appendChild(
        anchor
    );

    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(
        downloadUrl
    );
}

export async function importRaceReplayFile(
    file: File
): Promise<CompletedRaceReplay> {
    if (
        file.size >
        MAX_REPLAY_FILE_SIZE
    ) {
        throw new Error(
            "The replay file is larger than 5 MB."
        );
    }

    const fileName =
        file.name.toLowerCase();

    if (
        !fileName.endsWith(
            ".json"
        )
    ) {
        throw new Error(
            "Replay files must use the .json extension."
        );
    }

    let parsed:
        unknown;

    try {
        const text =
            await file.text();

        parsed =
            JSON.parse(text);
    } catch {
        throw new Error(
            "The selected file is not valid JSON."
        );
    }

    if (
        !isCrazyRacingReplayFile(
            parsed
        )
    ) {
        throw new Error(
            "This is not a valid CRAZY RACING replay file."
        );
    }

    return parsed.replay;
}

function isCrazyRacingReplayFile(
    value: unknown
): value is CrazyRacingReplayFile {
    if (!isRecord(value)) {
        return false;
    }

    if (
        value.format !==
        REPLAY_FILE_FORMAT
    ) {
        return false;
    }

    if (
        value.version !==
        REPLAY_FILE_VERSION
    ) {
        return false;
    }

    if (
        typeof value.exportedAt !==
        "string"
    ) {
        return false;
    }

    return isCompletedRaceReplay(
        value.replay
    );
}

function isCompletedRaceReplay(
    value: unknown
): value is CompletedRaceReplay {
    if (!isRecord(value)) {
        return false;
    }

    if (
        !Number.isInteger(
            value.raceNumber
        ) ||
        Number(value.raceNumber) <
        1
    ) {
        return false;
    }

    if (
        !Array.isArray(
            value.initialRacers
        ) ||
        !Array.isArray(
            value.events
        ) ||
        !Array.isArray(
            value.podium
        ) ||
        !Array.isArray(
            value.players
        )
    ) {
        return false;
    }

    if (
        !isRecord(
            value.sideBet
        ) ||
        !isRecord(
            value.payoutSummary
        )
    ) {
        return false;
    }

    if (
        value.initialRacers.length !==
        4
    ) {
        return false;
    }

    if (
        !value.initialRacers.every(
            isReplayRacer
        )
    ) {
        return false;
    }

    if (
        !value.events.every(
            isReplayEvent
        )
    ) {
        return false;
    }

    if (
        !value.players.every(
            isReplayPlayer
        )
    ) {
        return false;
    }

    if (
        typeof value.sideBet.id !==
        "string" ||
        typeof value.sideBet.text !==
        "string"
    ) {
        return false;
    }

    return true;
}

function isReplayRacer(
    value: unknown
): boolean {
    if (!isRecord(value)) {
        return false;
    }

    return (
        isRacerName(
            value.name
        ) &&
        typeof value.lane ===
        "number" &&
        typeof value.position ===
        "number" &&
        (
            value.facing === 1 ||
            value.facing === -1
        ) &&
        typeof value.fallen ===
        "boolean" &&
        typeof value.dq ===
        "boolean" &&
        typeof value.finished ===
        "boolean"
    );
}

function isReplayEvent(
    value: unknown
): boolean {
    if (!isRecord(value)) {
        return false;
    }

    return (
        typeof value.type ===
        "string" &&
        typeof value.sequence ===
        "number" &&
        typeof value.createdAt ===
        "number"
    );
}

function isReplayPlayer(
    value: unknown
): boolean {
    if (!isRecord(value)) {
        return false;
    }

    return (
        typeof value.id ===
        "string" &&
        typeof value.name ===
        "string" &&
        Array.isArray(
            value.draftedTickets
        ) &&
        (
            value.doubledTicketId ===
            null ||
            typeof value.doubledTicketId ===
            "string"
        )
    );
}

function isRacerName(
    value: unknown
): boolean {
    return (
        value === "LION" ||
        value === "HOTDOG" ||
        value === "FISH" ||
        value === "QUEEN"
    );
}

function isRecord(
    value: unknown
): value is Record<
    string,
    unknown
> {
    return (
        typeof value ===
        "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

function createReplayFilename(
    replay: CompletedRaceReplay
): string {
    const timestamp =
        new Date()
            .toISOString()
            .replace(
                /[:.]/g,
                "-"
            );

    return (
        `crazy-racing-race-` +
        `${replay.raceNumber}-` +
        `${timestamp}.json`
    );
}