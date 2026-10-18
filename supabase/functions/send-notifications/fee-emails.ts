import { renderNotice } from "../_shared/email-layout.ts";
import type { RenderedEmail } from "../_shared/email-layout.ts";
import { formatWhen, pounds } from "./booking-emails.ts";
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
