type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

function configuredLevel(): LogLevel {
    const value = process.env.LOG_LEVEL?.trim().toLowerCase();

    if (value === "debug" || value === "info" || value === "warn" || value === "error") {
        return value;
    }

    return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function serialiseError(error: unknown): unknown {
    if (!(error instanceof Error)) {
        return error;
    }

    return {
        name: error.name,
        message: error.message,
        stack: error.stack,
    };
}

function write(level: LogLevel, message: string, context: LogContext = {}): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[configuredLevel()]) {
        return;
    }

    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...Object.fromEntries(
            Object.entries(context).map(([key, value]) => [key, serialiseError(value)]),
        ),
    };

    const line = JSON.stringify(entry);

    if (level === "error") {
        console.error(line);
    } else if (level === "warn") {
        console.warn(line);
    } else {
        console.log(line);
    }
}

export const logger = Object.freeze({
    debug(message: string, context?: LogContext): void {
        write("debug", message, context);
    },
    info(message: string, context?: LogContext): void {
        write("info", message, context);
    },
    warn(message: string, context?: LogContext): void {
        write("warn", message, context);
    },
    error(message: string, context?: LogContext): void {
        write("error", message, context);
    },
});
