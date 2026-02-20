import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Supabase Server Environment Variables are missing!");
}

export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
