import {
    useEffect,
    useMemo,
    useState,
    type CSSProperties
} from "react";

import "./ConfettiBlast.css";

type ConfettiBlastProps = {
    durationMs?: number;
    pieceCount?: number;
};

type ConfettiPiece = {
    id: number;
    left: number;
    startTop: number;
    delay: number;
    duration: number;
    drift: number;
    rotation: number;
    size: number;
    shape:
    | "rectangle"
    | "circle";
    colorIndex: number;
};

const DEFAULT_DURATION_MS =
    7000;

const DEFAULT_PIECE_COUNT =
    360;

const CONFETTI_COLORS = [
    "#facc15",
    "#38bdf8",
    "#22c55e",
    "#f97316",
    "#e11d48",
    "#a855f7",
    "#f8fafc",
    "#fb7185",
    "#2dd4bf",
    "#f472b6"
];

export function ConfettiBlast({
    durationMs =
    DEFAULT_DURATION_MS,

    pieceCount =
    DEFAULT_PIECE_COUNT
}: ConfettiBlastProps) {
    const [
        visible,
        setVisible
    ] = useState(true);

    const [
        documentHeight,
        setDocumentHeight
    ] = useState(
        getDocumentHeight()
    );

    useEffect(() => {
        function updateDocumentHeight() {
            setDocumentHeight(
                getDocumentHeight()
            );
        }

        updateDocumentHeight();

        window.addEventListener(
            "resize",
            updateDocumentHeight
        );

        const observer =
            new ResizeObserver(
                updateDocumentHeight
            );

        observer.observe(
            document.documentElement
        );

        return () => {
            window.removeEventListener(
                "resize",
                updateDocumentHeight
            );

            observer.disconnect();
        };
    }, []);

    const pieces =
        useMemo<ConfettiPiece[]>(
            () =>
                Array.from(
                    {
                        length:
                            pieceCount
                    },
                    (
                        _,
                        index
                    ) => ({
                        id:
                            index,

                        left:
                            randomBetween(
                                0,
                                100
                            ),

                        /*
                         * Confetti is emitted in several
                         * horizontal waves down the page,
                         * rather than only from the top
                         * of the viewport.
                         */
                        startTop:
                            randomBetween(
                                -120,
                                Math.max(
                                    0,
                                    documentHeight *
                                    0.22
                                )
                            ),

                        delay:
                            randomBetween(
                                0,
                                1800
                            ),

                        duration:
                            randomBetween(
                                durationMs *
                                0.58,
                                durationMs
                            ),

                        drift:
                            randomBetween(
                                -260,
                                260
                            ),

                        rotation:
                            randomBetween(
                                540,
                                1800
                            ),

                        size:
                            randomBetween(
                                7,
                                16
                            ),

                        shape:
                            Math.random() >
                                0.74
                                ? "circle"
                                : "rectangle",

                        colorIndex:
                            Math.floor(
                                Math.random() *
                                CONFETTI_COLORS.length
                            )
                    })
                ),
            [
                documentHeight,
                durationMs,
                pieceCount
            ]
        );

    useEffect(() => {
        const timeout =
            window.setTimeout(
                () => {
                    setVisible(false);
                },
                durationMs +
                2500
            );

        return () => {
            window.clearTimeout(
                timeout
            );
        };
    }, [durationMs]);

    if (!visible) {
        return null;
    }

    return (
        <div
            className="confettiBlast"
            aria-hidden="true"
            style={
                {
                    "--confetti-page-height":
                        `${documentHeight}px`
                } as CSSProperties
            }
        >
            <div className="confettiCannon confettiCannonLeft">
                <span />
            </div>

            <div className="confettiCannon confettiCannonRight">
                <span />
            </div>

            {pieces.map(
                (piece) => (
                    <span
                        key={piece.id}
                        className={[
                            "confettiPiece",

                            piece.shape ===
                                "circle"
                                ? "confettiPieceCircle"
                                : ""
                        ]
                            .filter(Boolean)
                            .join(" ")}
                        style={
                            {
                                "--confetti-left":
                                    `${piece.left}%`,

                                "--confetti-start-top":
                                    `${piece.startTop}px`,

                                "--confetti-delay":
                                    `${piece.delay}ms`,

                                "--confetti-duration":
                                    `${piece.duration}ms`,

                                "--confetti-drift":
                                    `${piece.drift}px`,

                                "--confetti-rotation":
                                    `${piece.rotation}deg`,

                                "--confetti-size":
                                    `${piece.size}px`,

                                "--confetti-color":
                                    CONFETTI_COLORS[
                                    piece.colorIndex
                                    ]
                            } as CSSProperties
                        }
                    />
                )
            )}
        </div>
    );
}

function getDocumentHeight(): number {
    return Math.max(
        document.documentElement
            .scrollHeight,
        document.body?.scrollHeight ??
        0,
        window.innerHeight
    );
}

function randomBetween(
    minimum: number,
    maximum: number
): number {
    return (
        Math.random() *
        (
            maximum -
            minimum
        ) +
        minimum
    );
}