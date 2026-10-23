import { renderNotice } from "../_shared/email-layout.ts";
import type { RenderedEmail } from "../_shared/email-layout.ts";
import { formatWhen, getLinkWording, pounds } from "./booking-emails.ts";
import type { BookingDetails } from "./booking-emails.ts";

type FeeKind = "late_cancel" | "no_show";

export interface ScheduledFee extends BookingDetails {
  kind: FeeKind;
  fee_pence: number;
  kept_pence: number;
  refund_pence: number;
  charge_pence: number;
  charge_after: string;
}

export interface WaivedFee extends BookingDetails {
  kind: FeeKind;
  fee_pence: number;
  refund_pence: number;
}

const FEE_NAMES: Record<FeeKind, string> = {
  late_cancel: "late cancellation fee",
  no_show: "no-show fee",
};

const getReason = ({
  kind,
  stylist_name: stylist,
  service_name: service,
  starts_at: startsAt,
}: ScheduledFee) =>
  kind === "no_show"
    ? `${stylist} marked you as not attending ${service} on ${formatWhen(startsAt)} (UK time).`
    : `You cancelled ${service} with ${stylist} on ${formatWhen(startsAt)} (UK time) after the free cancellation deadline.`;

export const feeScheduled = (fee: ScheduledFee): RenderedEmail => {
  const settleOn = formatWhen(fee.charge_after);
  const name = FEE_NAMES[fee.kind];

  return renderNotice({
    title: `${name.charAt(0).toUpperCase()}${name.slice(1)}: ${pounds(fee.fee_pence)}`,
    paragraphs: [
      `${getReason(fee)} ${fee.stylist_name}’s policy has a ${pounds(fee.fee_pence)} ${name}.`,
      ...(fee.kept_pence
        ? [`${pounds(fee.kept_pence)} of what you paid is kept towards it.`]
        : []),
      ...(fee.charge_pence
        ? [
            `${pounds(fee.charge_pence)} will be charged to your saved card on ${settleOn}.`,
          ]
        : []),
      ...(fee.refund_pence
        ? [
            `${pounds(fee.refund_pence)} will be refunded to your card on ${settleOn}.`,
          ]
        : []),
      `Booking reference: ${fee.ref}`,
    ],
    footnote:
      fee.kind === "no_show"
        ? `If you did attend, reply to this email before ${settleOn} so we can look into it.`
        : `Questions about this fee? Reply to this email before ${settleOn}.`,
  });
};

export const feeWaived = ({
  fee_pence,
  kind,
  refund_pence,
  stylist_name,
  service_name,
  starts_at,
  ref,
}: WaivedFee): RenderedEmail =>
  renderNotice({
    title: `Your ${pounds(fee_pence)} fee has been waived`,
    paragraphs: [
      `${stylist_name} has waived the ${FEE_NAMES[kind]} for ${service_name} on ${formatWhen(starts_at)} (UK time). You won’t be charged it.`,
      ...(refund_pence
        ? [
            `${pounds(refund_pence)} is refunded to your card. It can take 5–10 working days to show.`,
          ]
        : []),
      `Booking reference: ${ref}`,
    ],
    footnote: "Questions? Reply to this email.",
  });

export interface DeclinedFee extends BookingDetails {
  kind: FeeKind;
  fee_pence: number;
  amount_pence: number;
  card_label: string | null;
  expires_at: string;
  pay_url: string;
  is_reminder?: boolean;
}

export const feeDeclined = (fee: DeclinedFee): RenderedEmail => {
  const { title, expiry } = getLinkWording(
    `Pay your ${pounds(fee.amount_pence)} ${FEE_NAMES[fee.kind]}`,
    fee.expires_at,
    fee.is_reminder,
  );

  return renderNotice({
    title,
    paragraphs: [
      `We couldn’t charge ${fee.card_label ?? "your saved card"} for the ${FEE_NAMES[fee.kind]} from ${fee.service_name} with ${fee.stylist_name} on ${formatWhen(fee.starts_at)} (UK time).`,
      `Please pay the ${pounds(fee.amount_pence)} left with the button below. You can use any card.`,
      `You can’t book with ${fee.stylist_name} again until it’s paid.`,
      `Booking reference: ${fee.ref}`,
    ],
    button: { label: `Pay ${pounds(fee.amount_pence)}`, url: fee.pay_url },
    footnote: `${expiry} Questions about this fee? Reply to this email.`,
  });
};

export interface UnpaidFeeNotice extends BookingDetails {
  kind: FeeKind;
  amount_pence: number;
  card_label: string | null;
  studio_url: string;
}

export const feeUnpaid = (fee: UnpaidFeeNotice): RenderedEmail =>
  renderNotice({
    title: `Fee unpaid: ${fee.client_name}`,
    paragraphs: [
      `${fee.client_name}’s ${fee.card_label ?? "card"} was declined for the ${pounds(fee.amount_pence)} ${FEE_NAMES[fee.kind]} from ${fee.service_name} on ${formatWhen(fee.starts_at)} (UK time).`,
      "We’ve emailed them a link to pay it. They can’t book with you again until it’s paid. You can retry the card, resend the link, record it as paid or waive it in Studio.",
      `Booking reference: ${fee.ref}`,
    ],
    button: { label: "Open Studio", url: fee.studio_url },
    footnote: "You can choose which booking emails and texts you get in Studio → Settings → Notifications.",
  });

export interface DisputeNotice extends BookingDetails {
  amount_pence: number;
  reason: string | null;
  respond_by?: string | null;
}

export const disputeOpened = (dispute: DisputeNotice): RenderedEmail =>
  renderNotice({
    title: `A payment is disputed: ${pounds(dispute.amount_pence)}`,
    paragraphs: [
      `${dispute.client_name} has asked their bank to reverse a ${pounds(dispute.amount_pence)} payment for ${dispute.service_name} on ${formatWhen(dispute.starts_at)} (UK time).`,
      ...(dispute.reason ? [`The bank’s reason: ${dispute.reason.replaceAll("_", " ")}.`] : []),
      "Your share of the payment is held while the bank decides, and is returned to you if the decision goes your way.",
      `Send your side in Studio → Earnings${dispute.respond_by ? ` by ${formatWhen(dispute.respond_by)} (UK time)` : ""}: what happened, plus any photos or messages. We add the booking details ourselves. If you'd rather not fight it, you can accept it there. If we don't hear from you, we send what we have.`,
      `Booking reference: ${dispute.ref}`,
    ],
    footnote: "Questions? Reply to this email.",
  });

export interface CancelledFee extends BookingDetails {
  kind: FeeKind;
  fee_pence: number;
}

export const feeCancelled = (fee: CancelledFee): RenderedEmail =>
  renderNotice({
    title: `Your ${FEE_NAMES[fee.kind]} is cancelled`,
    paragraphs: [
      `${fee.stylist_name} has undone the no-show for ${fee.service_name} on ${formatWhen(fee.starts_at)} (UK time), so there’s no ${pounds(fee.fee_pence)} fee and nothing will be charged.`,
      `Booking reference: ${fee.ref}`,
    ],
    footnote: "Questions? Reply to this email.",
  });
