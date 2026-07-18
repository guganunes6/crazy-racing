import { config as loadEnvFile } from "dotenv";
import { resolve } from "node:path";

const initialNodeEnv = process.env.NODE_ENV?.trim() || "development";

/*
 * npm workspace commands run with the server workspace as the current
 * directory. Load the environment-specific file first, then allow an
 * untracked .env file and hosting-provider variables to override it.
 */
loadEnvFile({
    path: resolve(process.cwd(), `.env.${initialNodeEnv}`),
});

loadEnvFile({
    path: resolve(process.cwd(), ".env"),
    override: true,
});

type NodeEnvironment = "development" | "test" | "production";

function readNodeEnvironment(): NodeEnvironment {
    const value = process.env.NODE_ENV?.trim() || initialNodeEnv;

    if (value === "development" || value === "test" || value === "production") {
        return value;
    }

    throw new Error(
        `Invalid NODE_ENV "${value}". Expected development, test, or production.`,
    );
}

function readPort(): number {
    const rawPort = process.env.PORT?.trim() || "3001";
    const port = Number(rawPort);

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid PORT "${rawPort}".`);
    }

    return port;
}

function readClientOrigins(nodeEnv: NodeEnvironment): string[] {
    const configuredOrigins = process.env.CLIENT_URLS ?? process.env.CLIENT_URL;

    const origins = configuredOrigins
        ?.split(",")
        .map((origin) => origin.trim().replace(/\/+$/, ""))
        .filter(Boolean) ?? [];

    if (origins.length > 0) {
        return [...new Set(origins)];
    }

    if (nodeEnv !== "production") {
        return ["http://localhost:5173"];
    }

    throw new Error(
        "CLIENT_URL or CLIENT_URLS must be configured in production.",
    );
}

const nodeEnv = readNodeEnvironment();

export const environment = Object.freeze({
    nodeEnv,
    isProduction: nodeEnv === "production",
    port: readPort(),
    clientOrigins: readClientOrigins(nodeEnv),
});
