import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

const {
  VITE_SUPABASE_URL: supabaseUrl,
  VITE_SUPABASE_PUBLISHABLE_KEY: supabaseKey,
} = import.meta.env;

if (!supabaseUrl || !supabaseKey)
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY — copy .env.example to .env.local",
  );

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
