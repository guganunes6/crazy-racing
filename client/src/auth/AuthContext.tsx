import { createContext, useContext } from "react";

import type { AuthContextValue } from "./authTypes";

export const AuthContext = createContext<AuthContextValue | undefined>(
    undefined,
);

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider.");
    }

    return context;
}
