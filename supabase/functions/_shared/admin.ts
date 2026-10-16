import { createClient } from "npm:@supabase/supabase-js@2";

/** The service-role client: bypasses RLS, so only server code that has already checked the caller uses it. */
export const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
