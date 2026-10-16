import { admin } from "../_shared/admin.ts";
import { getCalendarFile } from "../_shared/calendar-file.ts";

Deno.serve(async (request) => {
  const params = new URL(request.url).searchParams;

  const { data } = await admin.rpc("get_booking_calendar", {
    token: params.get("token"),
    target: params.get("booking"),
    secret: params.get("secret"),
  });

  if (!data) return new Response("This calendar link isn't valid.", { status: 404 });

  const { ref, service_name: service, stylist_name: stylist, starts_at: startsAt, ends_at: endsAt, where } = data;

  return new Response(
    getCalendarFile({
      ref,
      title: `${service} with ${stylist}`,
      startsAt,
      endsAt,
      location: where,
      description: `Booking ${ref}`,
    }),
    {
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": `inline; filename="${ref}.ics"`,
        "cache-control": "no-store",
      },
    },
  );
});
