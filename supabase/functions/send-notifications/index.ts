// Every minute (pg_cron): claims due rows from the notifications outbox, renders and sends each email, then marks
// it sent or failed (the database retries failed rows with backoff). Without RESEND_API_KEY (local stack) every
// email goes to Mailpit, so nothing local is ever delivered for real.
import { createClient } from "npm:@supabase/supabase-js@2";
import { renderEmail } from "./templates.ts";
import type { RenderedEmail } from "./templates.ts";

const FROM_EMAIL = "info@tiwarashouse.com";
const FROM_NAME = "Tiwára’s House";
// Mailpit's container on the local Docker network (`supabase start`)
const MAILPIT_SEND_URL = "http://inbucket:8025/api/v1/send";

interface Notification {
  id: string;
  channel: "email" | "sms";
  to_address: string;
  template: string;
  payload: Record<string, unknown>;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const resendKey = Deno.env.get("RESEND_API_KEY");

const post = async (
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

  if (!response.ok)
    throw new Error(
      `${response.status} ${(await response.text()).slice(0, 500)}`,
    );
};

const sendWithResend = (
  to: string,
  { subject, html, text }: RenderedEmail,
  id: string,
) =>
  post(
    "https://api.resend.com/emails",
    { from: `${FROM_NAME} <${FROM_EMAIL}>`, to: [to], subject, html, text },
    // a retry after a lost response doesn't send the email twice
    { authorization: `Bearer ${resendKey}`, "idempotency-key": id },
  );

const sendWithMailpit = (to: string, { subject, html, text }: RenderedEmail) =>
  post(MAILPIT_SEND_URL, {
    From: { Email: FROM_EMAIL, Name: FROM_NAME },
    To: [{ Email: to }],
    Subject: subject,
    HTML: html,
    Text: text,
  });

const send = async ({
  id,
  channel,
  to_address: toAddress,
  template,
  payload,
}: Notification) => {
  if (channel !== "email")
    throw new Error(`${channel} sending is not set up yet`);

  const email = renderEmail(template, payload);

  await (resendKey
    ? sendWithResend(toAddress, email, id)
    : sendWithMailpit(toAddress, email));
};

Deno.serve(async (request) => {
  const secret = Deno.env.get("CRON_SECRET");

  if (!secret || request.headers.get("x-cron-secret") !== secret)
    return new Response("Forbidden", { status: 403 });

  const { data: notifications, error } = await supabase.rpc(
    "claim_notifications",
  );

  if (error) return new Response(error.message, { status: 500 });

  let sent = 0;

  for (const notification of notifications as Notification[]) {
    try {
      await send(notification);
      await supabase.rpc("mark_notification_sent", {
        notification_id: notification.id,
      });
      sent += 1;
    } catch (sendError) {
      const message =
        sendError instanceof Error ? sendError.message : String(sendError);

      await supabase.rpc("mark_notification_failed", {
        notification_id: notification.id,
        error: message,
      });
    }
  }

  return Response.json({ claimed: notifications.length, sent });
});
