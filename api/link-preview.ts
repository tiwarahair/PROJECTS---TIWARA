// vercel serverless function: crawlers asking for /{slug} get the profile's preview tags (vercel.json sends only them here) - needed for whatsapp/imessage previews etc.
import { getPreviewHtml } from "./_link-preview-html.js";
import type { PreviewProfile } from "./_link-preview-html.js";

const fetchProfile = async (slug: string): Promise<PreviewProfile | null> => {
  const { VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key } =
    process.env;

  if (!url || !key || !/^[a-z0-9-]{1,60}$/i.test(slug)) return null;

  const response = await fetch(`${url}/rest/v1/rpc/get_stylist_profile`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ lookup: slug }),
  }).catch(() => null);

  return response?.ok
    ? ((await response.json()) as PreviewProfile | null)
    : null;
};

export const GET = async (request: Request) => {
  const { origin, searchParams } = new URL(request.url);
  const profile = await fetchProfile(searchParams.get("slug") ?? "");

  return new Response(
    getPreviewHtml(origin, process.env.VITE_SUPABASE_URL ?? "", profile),
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
      },
    },
  );
};
