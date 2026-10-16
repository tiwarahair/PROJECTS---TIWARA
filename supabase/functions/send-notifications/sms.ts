// Texts to stylists (when they turn them on) through Twilio's REST API from the "Tiwaras" sender ID, which names us.
// Without TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN, SMS is off and texts fail at once instead of being retried.
import type { BookingDetails } from "./booking-emails.ts";

const SENDER_ID = "Tiwaras";

/** A failure that retrying won't fix. */
export class FinalError extends Error {}

const londonParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "Thu 22 Oct, 17:30" (UK time), built from parts so every runtime writes it the same way */
const getShortWhen = (iso: string) => {
  const part = Object.fromEntries(londonParts.formatToParts(new Date(iso)).map(({ type, value }) => [type, value]));

  return `${part.weekday} ${part.day} ${part.month}, ${part.hour}:${part.minute}`;
};

/** Plain letters only (é → e, ’ → '), so a text stays in the cheaper GSM-7 alphabet. */
const toPlain = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’‘]/g, "'").replace(/[^\x20-\x7E]/g, "");

/** A UK mobile as Twilio wants it: 07700 900123 → +447700900123. */
export const toE164 = (phone: string) => `+44${phone.replace(/\D/g, "").replace(/^44/, "").replace(/^0/, "")}`;

type SmsBuilder = (payload: Record<string, unknown>) => string;

const templates: Record<string, SmsBuilder> = {
  new_booking: (payload) => {
    const booking = payload as unknown as BookingDetails;

    return `New booking: ${booking.client_name}, ${booking.service_name}, ${getShortWhen(booking.starts_at)}. Ref ${booking.ref}.`;
  },
};

export const renderSms = (template: string, payload: Record<string, unknown>) => {
  const build = templates[template];

  if (!build) throw new FinalError(`unknown text template ${template}`);

  return toPlain(build(payload));
};

export const sendSms = async (to: string, body: string) => {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");

  if (!accountSid || !authToken) throw new FinalError("SMS off");

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: { authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}` },
    body: new URLSearchParams({ To: toE164(to), From: SENDER_ID, Body: body }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error(`${response.status} ${(await response.text()).slice(0, 500)}`);
};
