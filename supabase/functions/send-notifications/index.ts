import { admin } from "../_shared/admin.ts";
import { resendKey, sendEmail } from "./email.ts";
import { FinalError, renderSms, sendSms } from "./sms.ts";
import { renderEmail } from "./templates.ts";

interface Notification {
  id: string;
  channel: "email" | "sms";
  to_address: string;
  template: string;
  payload: Record<string, unknown>;
}

const send = ({ id, channel, to_address: toAddress, template, payload }: Notification) =>
  channel === "sms"
    ? sendSms(toAddress, renderSms(template, payload))
    : sendEmail(toAddress, renderEmail(template, payload), id);

// supabase-js reports errors in the result instead of throwing. If this fails the row stays 'sending' and is
// claimed again after its 5-minute hold (Resend's idempotency key stops a second send).
const record = async (
  name: "mark_notification_sent" | "mark_notification_failed" | "mark_notification_failed_now",
  args: Record<string, string>,
) => {
  const { error } = await admin.rpc(name, args);

  if (error) console.error(`${name} failed`, error.message);
};

Deno.serve(async (request) => {
  const secret = Deno.env.get("CRON_SECRET");

  if (!secret || request.headers.get("x-cron-secret") !== secret) return new Response("Forbidden", { status: 403 });

  if (!resendKey && Deno.env.get("SUPABASE_URL")?.startsWith("https://")) {
    console.error("RESEND_API_KEY is not set: emails stay queued");

    return new Response("RESEND_API_KEY is not set", { status: 500 });
  }

  const { data: notifications, error } = await admin.rpc("claim_notifications");

  if (error) return new Response(error.message, { status: 500 });

  let sent = 0;

  for (const notification of notifications as Notification[]) {
    try {
      await send(notification);
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : String(sendError);

      await record(sendError instanceof FinalError ? "mark_notification_failed_now" : "mark_notification_failed", {
        notification_id: notification.id,
        error: message,
      });
      continue;
    }

    await record("mark_notification_sent", {
      notification_id: notification.id,
    });
    sent += 1;
  }

  return Response.json({ claimed: notifications.length, sent });
});
