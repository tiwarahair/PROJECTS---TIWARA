import { renderNotice } from "../_shared/email-layout.ts";
import type { RenderedEmail } from "../_shared/email-layout.ts";
import { formatWhen } from "./booking-emails.ts";

export interface LoginAlert {
  device: string;
  signed_in_at: string;
}

export const loginAlert = ({ device, signed_in_at: signedInAt }: LoginAlert): RenderedEmail =>
  renderNotice({
    title: "New sign-in to your account",
    paragraphs: [
      `Someone signed in to your account from ${device} on ${formatWhen(signedInAt)} (UK time).`,
      "If this was you, there’s nothing to do.",
      "If it wasn’t, change your password in Studio → Settings → Security, and sign out of any session you don’t recognise there.",
    ],
    footnote: "You can turn these emails off in Studio → Settings → Security.",
  });
