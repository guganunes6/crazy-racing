import { createClient } from "@supabase/supabase-js";

function requireEnvironmentVariable(name: string): string {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

const supabaseUrl = requireEnvironmentVariable("SUPABASE_URL");

const supabasePublishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    requireEnvironmentVariable("SUPABASE_ANON_KEY");

export const supabaseAuth = createClient(
    supabaseUrl,
    supabasePublishableKey,
    {
        auth: {
            autoRefreshToken: false,
            detectSessionInUrl: false,
            persistSession: false,
        },
    },
);
