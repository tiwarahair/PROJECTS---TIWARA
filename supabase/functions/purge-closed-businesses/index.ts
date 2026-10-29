// Nightly (pg_cron): deletes the photos and client photos of businesses closed over 15 days ago, then clears their details.
// If a photo can't be deleted nothing is cleared, so tomorrow's run tries again.
import { createClient } from "@supabase/supabase-js";

const PHOTO_BUCKET = "stylist-photos";
const CLIENT_PHOTO_BUCKET = "client-photos";
const BATCH = 100;

// covers and portfolio photos ("…-full.jpg") have copies beside them: same widths as src/utils/image-sources.ts
const UPLOAD_WIDTHS = [400, 800, 1200];

const withCopies = (path: string) =>
  path.endsWith("-full.jpg")
    ? [
        path,
        ...UPLOAD_WIDTHS.flatMap((width) =>
          ["webp", "jpg"].map((extension) => path.replace(/-full\.jpg$/, `-${width}.${extension}`)),
        ),
      ]
    : [path];

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const removeAll = async (bucket: string, paths: string[]) => {
  for (let start = 0; start < paths.length; start += BATCH) {
    const { error } = await supabase.storage.from(bucket).remove(paths.slice(start, start + BATCH));

    if (error) return error;
  }
};

Deno.serve(async (request) => {
  const secret = Deno.env.get("CRON_SECRET");

  if (!secret || request.headers.get("x-cron-secret") !== secret) return new Response("Forbidden", { status: 403 });

  const { data: closurePhotos, error } = await supabase.rpc("get_due_closure_photos");

  if (error) return new Response(error.message, { status: 500 });

  const { data: clientPhotos, error: clientError } = await supabase.rpc("get_due_closure_client_photos");

  if (clientError) return new Response(clientError.message, { status: 500 });

  const photos: string[] = closurePhotos.flatMap(withCopies);

  const removeError = (await removeAll(PHOTO_BUCKET, photos)) ?? (await removeAll(CLIENT_PHOTO_BUCKET, clientPhotos));

  if (removeError) return new Response(removeError.message, { status: 500 });

  const { error: purgeError } = await supabase.rpc("purge_closed_businesses");

  if (purgeError) return new Response(purgeError.message, { status: 500 });

  return Response.json({ photosRemoved: photos.length, clientPhotosRemoved: clientPhotos.length });
});
