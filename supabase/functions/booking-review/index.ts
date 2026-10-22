// The client's review page: "view" shows the booking to review, "submit" posts the stars and optional words
import { z } from "npm:zod@4";
import { admin } from "../_shared/admin.ts";
import { getClientIp } from "../_shared/client-ip.ts";
import { corsHeaders, respond } from "../_shared/cors.ts";
import { isWithinLimit } from "../_shared/rate-limit.ts";

const tokenSchema = z.string().min(1).max(100);

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("view"), token: tokenSchema }),
  z.object({
    action: z.literal("submit"),
    token: tokenSchema,
    rating: z.number().int().min(1).max(5),
    body: z.string().max(1000).nullable(),
  }),
]);

interface ReviewPage {
  booking_id: string;
  [shown: string]: unknown;
}

const getPage = async (token: string) => {
  const { data, error } = await admin.rpc("get_review_page", { token });

  if (error) throw error;

  return data as ReviewPage | null;
};

// what the page shows: none of our ids
const toPage = ({ booking_id: _bookingId, ...shown }: ReviewPage) => shown;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) return respond(400, { error: "invalid_request" });

  const clientIp = getClientIp(request);
  const { action, token } = parsed.data;

  try {
    if (!(await isWithinLimit(`booking-review:${clientIp}`, 30, 600)))
      return respond(429, { error: "rate_limited" });

    if (action === "submit") {
      const { rating, body } = parsed.data;

      const { data: outcome, error } = await admin.rpc("submit_review", {
        token,
        rating,
        body,
      });

      if (error) throw error;

      if (outcome === "link_not_valid")
        return respond(404, { error: "link_not_valid" });
    }

    const page = await getPage(token);

    if (!page) return respond(404, { error: "link_not_valid" });

    return respond(200, toPage(page));
  } catch (error) {
    console.error(
      "booking-review failed",
      error instanceof Error ? error.message : error,
    );

    return respond(500, { error: "unknown" });
  }
});
