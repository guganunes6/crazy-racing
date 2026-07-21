/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly MODE: string;
    readonly BASE_URL: string;
    readonly PROD: boolean;
    readonly DEV: boolean;
    readonly SSR: boolean;
    readonly VITE_SERVER_URL?: string;
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
