import type { StudioEarnings } from "../../../lib/studio-api/earnings";
import { formatWeekdayDate } from "../../../utils/dates";
import { toLondonTime } from "../../../utils/london-time";
import { formatMoney } from "../../../utils/money";
import { getText } from "../bookings/row-values";
import type { StudioController } from "../core/use-studio";
import { openDispute } from "../disputes/open";
import { getOpenDisputes } from "./records";

export const getDisputeBanner = (
  studio: StudioController,
  earnings: StudioEarnings,
) => {
  const [first, ...others] = getOpenDisputes(
    earnings,
    studio.state.answeredDisputes,
  );

  if (!first?.row.booking) return undefined;

  const {
    record,
    row: {
      booking: { id, contact, snapshot, starts_at: startsAt },
    },
  } = first;

  const firstName = getText(contact, "first");
  const due = formatWeekdayDate(new Date(record.respondBy));
  const amount = formatMoney(record.amount, { pence: "always" });

  return {
    text: others.length
      ? `${others.length + 1} payments are disputed. Respond to ${firstName || "the first"}’s by ${due}.`
      : `${firstName || "A client"} disputed a ${amount} payment. Respond by ${due}.`,
    onRespond: () =>
      openDispute(studio, {
        dispute: record,
        bookingId: id,
        clientName: `${firstName} ${getText(contact, "last")}`.trim(),
        service: getText(snapshot, "service_name"),
        when: `${formatWeekdayDate(new Date(startsAt))} · ${toLondonTime(startsAt).time}`,
      }),
  };
};
