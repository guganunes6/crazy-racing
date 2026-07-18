import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
    plugins: [react()],
    build: {
        target: "es2020",
        sourcemap: mode !== "production",
        emptyOutDir: true,
        assetsInlineLimit: 4096,
        chunkSizeWarningLimit: 900,
    },
    preview: {
        host: "0.0.0.0",
        port: 4173,
    },
}));
