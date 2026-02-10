import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseApiKey = import.meta.env.VITE_SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseApiKey) {
    throw new Error(
        'Missing Supabase environment variables. ' +
            'Copy .env.example to .env and fill in your Supabase project credentials.'
    );
}

export const supabase = createClient(supabaseUrl, supabaseApiKey);
