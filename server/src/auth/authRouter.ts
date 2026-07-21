import {
    Router,
    type NextFunction,
    type Request,
    type Response,
} from "express";

import { authenticateRequest } from "./authenticateRequest.js";
import { AuthError } from "./authError.js";
import {
    isUsernameAvailable,
    syncAuthenticatedProfile,
    updateUsername,
} from "./profileService.js";

export const authRouter = Router();

authRouter.get(
    "/me",
    asyncHandler(async (request, response) => {
        const authenticatedUser = await authenticateRequest(request);
        const profile = await syncAuthenticatedProfile(authenticatedUser);

        response.json({
            user: {
                id: authenticatedUser.id,
                email: authenticatedUser.email,
                provider: authenticatedUser.provider,
            },
            profile,
        });
    }),
);

authRouter.post(
    "/sync",
    asyncHandler(async (request, response) => {
        const authenticatedUser = await authenticateRequest(request);
        const profile = await syncAuthenticatedProfile(authenticatedUser);

        response.status(200).json({
            user: {
                id: authenticatedUser.id,
                email: authenticatedUser.email,
                provider: authenticatedUser.provider,
            },
            profile,
        });
    }),
);

authRouter.get(
    "/username-available",
    asyncHandler(async (request, response) => {
        const authenticatedUser = await authenticateRequest(request);
        const username = String(request.query.username ?? "");

        try {
            const available = await isUsernameAvailable(
                username,
                authenticatedUser.id,
            );

            response.json({
                username,
                available,
            });
        } catch (error) {
            response.status(400).json({
                error: {
                    code: "INVALID_USERNAME",
                    message: getErrorMessage(error),
                },
            });
        }
    }),
);

authRouter.patch(
    "/username",
    asyncHandler(async (request, response) => {
        const authenticatedUser = await authenticateRequest(request);

        try {
            const profile = await updateUsername(
                authenticatedUser.id,
                request.body?.username,
            );

            response.json({
                profile,
            });
        } catch (error) {
            if (
                error instanceof Error &&
                error.name === "UsernameConflictError"
            ) {
                response.status(409).json({
                    error: {
                        code: "USERNAME_TAKEN",
                        message: error.message,
                    },
                });
                return;
            }

            response.status(400).json({
                error: {
                    code: "INVALID_USERNAME",
                    message: getErrorMessage(error),
                },
            });
        }
    }),
);

authRouter.use(
    (
        error: unknown,
        _request: Request,
        response: Response,
        _next: NextFunction,
    ) => {
        if (error instanceof AuthError) {
            response.status(error.statusCode).json({
                error: {
                    code: error.code,
                    message: error.message,
                },
            });
            return;
        }

        console.error("Authentication route failed.", error);

        response.status(500).json({
            error: {
                code: "AUTHENTICATION_SERVER_ERROR",
                message:
                    "The authentication server could not complete the request.",
            },
        });
    },
);

function asyncHandler(
    handler: (
        request: Request,
        response: Response,
        next: NextFunction,
    ) => Promise<void>,
) {
    return (
        request: Request,
        response: Response,
        next: NextFunction,
    ): void => {
        handler(request, response, next).catch(next);
    };
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error
        ? error.message
        : "The request could not be completed.";
}
