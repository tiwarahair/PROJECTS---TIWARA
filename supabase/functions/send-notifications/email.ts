// Emails through Resend, or Mailpit on the local stack (no RESEND_API_KEY), so nothing local is ever delivered.
import type { Attachment, RenderedEmail } from "../_shared/email-layout.ts";

const FROM_EMAIL = "info@tiwarashouse.com";
const FROM_NAME = "Tiwára’s House";
// Mailpit's container on the local Docker network (`supabase start`)
const MAILPIT_SEND_URL = "http://inbucket:8025/api/v1/send";

export const resendKey = Deno.env.get("RESEND_API_KEY");

const toBase64 = (text: string) => btoa(String.fromCharCode(...new TextEncoder().encode(text)));

const post = async (url: string, body: unknown, headers: Record<string, string> = {}) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    // a hung request mustn't use up the run; the row is retried instead
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error(`${response.status} ${(await response.text()).slice(0, 500)}`);
};

const sendWithResend = (to: string, { subject, html, text, attachments = [] }: RenderedEmail, id: string) =>
  post(
    "https://api.resend.com/emails",
    {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
      text,
      attachments: attachments.map(({ filename, content, contentType }: Attachment) => ({
        filename,
        content: toBase64(content),
        content_type: contentType,
      })),
    },
    // a retry after a lost response doesn't send the email twice
    { authorization: `Bearer ${resendKey}`, "idempotency-key": id },
  );

const sendWithMailpit = (to: string, { subject, html, text, attachments = [] }: RenderedEmail) =>
  post(MAILPIT_SEND_URL, {
    From: { Email: FROM_EMAIL, Name: FROM_NAME },
    To: [{ Email: to }],
    Subject: subject,
    HTML: html,
    Text: text,
    Attachments: attachments.map(({ filename, content, contentType }: Attachment) => ({
      Filename: filename,
      Content: toBase64(content),
      ContentType: contentType,
    })),
  });

export const sendEmail = (to: string, email: RenderedEmail, id: string) =>
  resendKey ? sendWithResend(to, email, id) : sendWithMailpit(to, email);
