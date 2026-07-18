const DEFAULT_DEVELOPMENT_SERVER_URL = "http://localhost:3001";

function normalizeUrl(value: string): string {
    return value.trim().replace(/\/+$/, "");
}

function getServerUrl(): string {
    const configuredUrl = import.meta.env.VITE_SERVER_URL?.trim();

    if (configuredUrl) {
        return normalizeUrl(configuredUrl);
    }

    if (import.meta.env.DEV) {
        return DEFAULT_DEVELOPMENT_SERVER_URL;
    }

    throw new Error(
        "VITE_SERVER_URL is required for a production client build.",
    );
}

export const environment = Object.freeze({
    mode: import.meta.env.MODE,
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    serverUrl: getServerUrl(),
});
