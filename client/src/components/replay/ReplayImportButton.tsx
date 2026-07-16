import {
    useRef,
    useState
} from "react";

import type {
    CompletedRaceReplay
} from "@crazy-racing/shared";

import {
    importRaceReplayFile
} from "../../replay/ReplayFile";

import "./ReplayImportButton.css";

type ReplayImportButtonProps = {
    onReplayImported: (
        replay:
            CompletedRaceReplay
    ) => void;

    onError: (
        message: string
    ) => void;
};

export function ReplayImportButton({
    onReplayImported,
    onError
}: ReplayImportButtonProps) {
    const inputRef =
        useRef<HTMLInputElement>(
            null
        );

    const [
        isImporting,
        setIsImporting
    ] = useState(false);

    async function handleFileChange(
        event:
            React.ChangeEvent<HTMLInputElement>
    ) {
        const file =
            event.target.files?.[0];

        event.target.value = "";

        if (!file) {
            return;
        }

        setIsImporting(true);

        try {
            const replay =
                await importRaceReplayFile(
                    file
                );

            onError("");
            onReplayImported(
                replay
            );
        } catch (error) {
            onError(
                error instanceof Error
                    ? error.message
                    : "Could not import the replay."
            );
        } finally {
            setIsImporting(false);
        }
    }

    return (
        <div className="replayImport">
            <input
                ref={inputRef}
                className="replayImportInput"
                type="file"
                accept=".json,application/json"
                onChange={
                    handleFileChange
                }
            />

            <button
                type="button"
                className="replayImportButton"
                disabled={isImporting}
                onClick={() =>
                    inputRef.current?.click()
                }
            >
                {isImporting
                    ? "Importing replay..."
                    : "Import race replay"}
            </button>

            <p>
                Open a previously exported
                CRAZY RACING replay file.
            </p>
        </div>
    );
}