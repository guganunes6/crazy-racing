import { createClient } from "@supabase/supabase-js";

import { environment } from "../config/environment";

export const supabase = createClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    },
);
