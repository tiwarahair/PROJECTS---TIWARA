import { renderNotice } from "../_shared/email-layout.ts";
import type { RenderedEmail } from "../_shared/email-layout.ts";
import { pounds } from "./booking-emails.ts";

export interface PayoutNotice {
  business_name: string;
  amount_pence: number;
  arrival_date: string | null;
  bank_label: string | null;
  failure_message: string | null;
}

const londonDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  weekday: "short",
  day: "numeric",
  month: "short",
});

const getBank = ({ bank_label: bank }: PayoutNotice) => (bank ? ` (${bank})` : "");

export const payoutPaid = (payout: PayoutNotice): RenderedEmail =>
  renderNotice({
    title: `${pounds(payout.amount_pence)} has been paid to your bank`,
    paragraphs: [
      `Your payout of ${pounds(payout.amount_pence)} has been paid to your bank account${getBank(payout)}${
        payout.arrival_date ? ` and should be there by ${londonDate.format(new Date(payout.arrival_date))}` : ""
      }. Banks can take a few hours to show it.`,
      "You can see the payments it includes in Studio → Earnings → Payouts.",
    ],
    footnote: "You get this email for every payout, so you always know when money is coming.",
  });

export const payoutFailed = (payout: PayoutNotice): RenderedEmail =>
  renderNotice({
    title: `Your ${pounds(payout.amount_pence)} payout couldn't be sent`,
    paragraphs: [
      `Your bank couldn't accept the payout of ${pounds(payout.amount_pence)}${getBank(payout)}${
        payout.failure_message ? `: ${payout.failure_message.replace(/\.$/, "")}` : ""
      }.`,
      "Update your bank details in Studio → Earnings (Update bank details in Stripe). The money stays safe in your balance and is sent again once your bank details are fixed.",
    ],
    footnote: "You get this email whenever a payout fails.",
  });
