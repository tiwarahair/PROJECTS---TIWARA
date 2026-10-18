import type { BookingDetails } from "./booking-emails.ts";

const SENDER_ID = "Tiwaras";

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

const getShortWhen = (iso: string) => {
  const part = Object.fromEntries(londonParts.formatToParts(new Date(iso)).map(({ type, value }) => [type, value]));

  return `${part.weekday} ${part.day} ${part.month}, ${part.hour}:${part.minute}`;
};

const toPlain = (text: string) =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’‘]/g, "'").replace(/[^\x20-\x7E]/g, "");

export const toE164 = (phone: string) => `+44${phone.replace(/\D/g, "").replace(/^44/, "").replace(/^0/, "")}`;

const getLine =
  (label: string, prefix = "") =>
  (payload: Record<string, unknown>) => {
    const { client_name: client, service_name: service, starts_at: startsAt, ref } = payload as unknown as BookingDetails;

    return `${label}: ${client}, ${service}, ${prefix}${getShortWhen(startsAt)}. Ref ${ref}.`;
  };

const templates: Record<string, (payload: Record<string, unknown>) => string> = {
  new_booking: getLine("New booking"),
  client_cancelled: getLine("Cancelled"),
  client_rescheduled: getLine("Moved", "now "),
  fee_failed: getLine("Fee unpaid"),
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
