import { RacerName } from "./BoardModel";

const racerImages: Record<RacerName, string> = {
    QUEEN: "/src/assets/queen.svg",
    FISH: "/src/assets/fish.svg",
    HOTDOG: "/src/assets/hotdog.svg",
    LION: "/src/assets/lion.svg"
};

type MascotProps = {
    name: RacerName;
    countInSpace: number;
    indexInSpace: number;
    fallen?: boolean;
    facing?: number;
};

export function Mascot({
    name,
    countInSpace,
    indexInSpace,
    fallen = false,
    facing = 1
}: MascotProps) {
    return (
        <img
            className={[
                "mascot",
                `mascotCount${countInSpace}`,
                `mascotIndex${indexInSpace}`,
                fallen ? "fallen" : "",
                facing === -1 ? "turnedAround" : ""
            ]
                .filter(Boolean)
                .join(" ")}
            src={racerImages[name]}
            alt={name}
            title={name}
        />
    );
}
