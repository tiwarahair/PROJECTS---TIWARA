import type { MouseEvent } from "react";
import { Link, TriangleAlert, Undo, X } from "lucide-react";
import { copyText } from "../../core/format";
import type { ActionItem } from "../../core/types";
import type { SheetContext } from "./context";
import { CANCEL_STEP, CLOSED_STATUSES, RESCHEDULE_STEP } from "./types";

const getGuestItems = ({ booking, actions }: SheetContext): ActionItem[] =>
  booking.client
    ? [
        {
          label: "Copy guest management link",
          icon: Link,
          run: () => {
            copyText(`tiwaras.house/manage/${booking.id}`);
            actions.showToast(`Guest link copied for ${booking.firstName}`);
          },
        },
      ]
    : [];

const getMoreItems = (context: SheetContext): ActionItem[] => {
  const { booking, setState, actions } = context;

  return getGuestItems(context).concat([
    {
      label: "Reschedule",
      icon: Undo,
      run: () => setState({ ...RESCHEDULE_STEP, statusMenuOpen: false }),
    },
    {
      label: "Cancel",
      icon: X,
      danger: true,
      run: () => setState({ ...CANCEL_STEP, statusMenuOpen: false }),
    },
    {
      label: "No-show",
      icon: TriangleAlert,
      danger: true,
      run: () => {
        if (booking.canNoShow)
          setState({
            bookingStep: "noshow",
            noShowCharge: "deposit",
            statusMenuOpen: false,
          });
        else
          actions.showToast(
            "No-show can be marked once the appointment has started",
          );
      },
    },
  ]);
};

export const getFooterView = (context: SheetContext) => {
  const { setState, actions, booking, nowMinutes } = context;
  const isClosed = CLOSED_STATUSES.includes(booking.status);

  return {
    canCheckout:
      !isClosed &&
      !booking.awaiting &&
      !booking.autoX &&
      (booking.status === "arrived" ||
        booking.dayOffset < 0 ||
        (booking.dayOffset === 0 && nowMinutes >= booking.startMinutes)),
    hasMore: !isClosed,
    more: (event: MouseEvent) => {
      const rect = (event.currentTarget as Element).getBoundingClientRect?.();

      actions.openActionSheet({
        title: booking.clientName || "Walk-in",
        subtitle: `${booking.service} · ${booking.dayShort} ${booking.timeRange || ""}`,
        anchor: rect
          ? { bottom: window.innerHeight - rect.top + 8, left: rect.left }
          : null,
        items: getMoreItems(context),
      });
    },
    bookAgain: () => actions.rebookFrom(booking),
    goCheckout: () =>
      setState({
        bookingStep: "checkout",
        checkoutMethod: null,
        statusMenuOpen: false,
      }),
    openPayment: () =>
      setState({ bookingStep: "payment", statusMenuOpen: false }),
  };
};
