// Nightly (pg_cron): deletes the photos of businesses closed over 15 days ago, then clears their details.
// If a photo can't be deleted nothing is cleared, so tomorrow's run tries again.
import { createClient } from "npm:@supabase/supabase-js@2";

const PHOTO_BUCKET = "stylist-photos";
const BATCH = 100;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (request) => {
  const secret = Deno.env.get("CRON_SECRET");

  if (!secret || request.headers.get("x-cron-secret") !== secret)
    return new Response("Forbidden", { status: 403 });

  const { data: photos, error } = await supabase.rpc("get_due_closure_photos");

  if (error) return new Response(error.message, { status: 500 });

  for (let start = 0; start < photos.length; start += BATCH) {
    const { error: removeError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .remove(photos.slice(start, start + BATCH));

    if (removeError) return new Response(removeError.message, { status: 500 });
  }

  const { error: purgeError } = await supabase.rpc("purge_closed_businesses");

  if (purgeError) return new Response(purgeError.message, { status: 500 });

  return Response.json({ photosRemoved: photos.length });
});
