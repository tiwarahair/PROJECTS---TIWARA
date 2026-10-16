import { z } from "npm:zod@4";
import { admin } from "../_shared/admin.ts";
import { getClientIp } from "../_shared/client-ip.ts";
import { corsHeaders, respond } from "../_shared/cors.ts";
import { isWithinLimit } from "../_shared/rate-limit.ts";

const IP_LIMIT = 30;
const WINDOW_SECONDS = 600;

const BOOKING_ERRORS = [
  "not_bookable",
  "invalid_choices",
  "outside_area",
  "hold_not_found",
  "slot_taken",
];

const requestSchema = z.object({
  serviceId: z.uuid(),
  choices: z.object({
    variations: z.array(z.uuid()).max(20),
    addons: z.array(z.uuid()).max(20),
    colour: z.string().max(40).optional(),
  }),
  startsAt: z.iso.datetime({ offset: true }),
  location: z.object({ lat: z.number(), lng: z.number() }).optional(),
  hold: z
    .object({ id: z.uuid(), secret: z.string().min(1).max(100) })
    .optional(),
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) return respond(400, { error: "invalid_request" });

  const isAllowed = await isWithinLimit(
    `booking-hold:${getClientIp(request)}`,
    IP_LIMIT,
    WINDOW_SECONDS,
  ).catch(() => null);

  if (isAllowed === null) return respond(500, { error: "unknown" });

  if (!isAllowed) return respond(429, { error: "rate_limited" });

  const { serviceId, choices, startsAt, location, hold } = parsed.data;

  const { data, error } = await admin.rpc("hold_booking", {
    target_service: serviceId,
    choices,
    slot_start: startsAt,
    client_lat: location?.lat ?? null,
    client_lng: location?.lng ?? null,
    hold_id: hold?.id ?? null,
    hold_secret: hold?.secret ?? null,
  });

  if (error && BOOKING_ERRORS.includes(error.message))
    return respond(409, { error: error.message });

  if (error) {
    console.error("hold_booking failed", error.code);

    return respond(500, { error: "unknown" });
  }

  return respond(200, data);
});
