// vercel serverless function: /cal/{key}.ics & /cal/studio/{key}.ics (see vercel.json) -> so the link they subscribe to stays on our domain
const FEEDS = {
  client: { name: "client-calendar", keyPattern: /^[a-f0-9]{48}$/ },
  studio: { name: "stylist-calendar", keyPattern: /^[\w-]{32}$/ },
};

const isFeed = (value: string | null): value is keyof typeof FEEDS =>
  value === "client" || value === "studio";

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const feed = searchParams.get("feed");
  const key = searchParams.get("key") ?? "";
  const url = process.env.VITE_SUPABASE_URL;

  if (!isFeed(feed) || !FEEDS[feed].keyPattern.test(key))
    return new Response("This calendar link isn't valid.", { status: 404 });

  // a 404 can make calendar apps drop the subscription, so outages say "try again"
  const response = url
    ? await fetch(
        `${url}/functions/v1/${FEEDS[feed].name}?key=${encodeURIComponent(key)}`,
      ).catch(() => null)
    : null;

  if (!response) return new Response("Try again later.", { status: 503 });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "text/plain",
      "Cache-Control": "no-store",
    },
  });
};
