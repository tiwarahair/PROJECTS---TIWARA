import type { PaymentMode } from "../../../../components/checkout/data";
import { decorateBooking, getDecoratedBookings } from "../decorate";
import type { DecoratedBooking } from "../decorate";
import { getProtectionExpiry } from "../../core/model";
import type { StudioBooking } from "../../core/types";
import type { StudioController } from "../../core/use-studio";
import type { AddonLine } from "./types";

export const getSheetBooking = (
  { state, actions: { openSheet } }: StudioController,
  storedBooking: StudioBooking | undefined,
) => {
  if (state.bookingStep === "done" && state.doneBooking)
    return decorateBooking(state, state.doneBooking, 0, () => {});

  const upcoming = getDecoratedBookings(state, ({ id }) =>
    openSheet("booking", { sheetBookingId: id }),
  );

  const match = upcoming.find(({ id }) => id === state.sheetBookingId);

  if (match) return match;

  return storedBooking
    ? decorateBooking(state, storedBooking, 0, () =>
        openSheet("booking", { sheetBookingId: storedBooking.id }),
      )
    : null;
};

export const getPaymentMode = ({
  paidKind,
  protect,
  protectionMode,
  awaiting,
}: DecoratedBooking): PaymentMode => {
  if (paidKind === "full") return "full";

  if (paidKind === "deposit") return "deposit";

  if (protect === "link" && protectionMode === "card" && !awaiting)
    return "card";

  return "none";
};

export const getAddonLines = (
  booking: StudioBooking | undefined,
): AddonLine[] =>
  (booking?.addons || []).map(({ name, quantity: rawQuantity, price }) => {
    const quantity = rawQuantity || 1;
    const amount = (price || 0) * quantity;

    return {
      key: (name || "Add-on") + quantity,
      label: (name || "Add-on") + (quantity > 1 ? ` × ${quantity}` : ""),
      value: `£${amount}`,
      amount,
    };
  });

export const getFreshLink = (
  { dayOffset, time }: DecoratedBooking,
  sentAt = Date.now(),
) => ({
  linkSentAt: sentAt,
  expiresAt: getProtectionExpiry(sentAt, dayOffset, time),
});
