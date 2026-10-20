import type { MouseEvent } from "react";
import {
  ArrowRightLeft,
  Link,
  Mail,
  Trash,
  TriangleAlert,
  Undo,
  X,
} from "lucide-react";
import { getManageUrl } from "../../../../lib/studio-api/booking-writes";
import { SaveError } from "../../../../lib/studio-writes";
import { copyLaterText, copyText } from "../../core/format";
import type { ActionItem } from "../../core/types";
import { getClientView } from "./client-view";
import type { SheetContext } from "./context";
import { CANCEL_STEP, CLOSED_STATUSES, RESCHEDULE_STEP } from "./types";

// the client row reveals these on hover
const getClientItems = (context: SheetContext): ActionItem[] => {
  const { booking } = context;
  const { changeClient, clearClient, isClientLocked } = getClientView(context);

  return [
    { label: "Change client", icon: ArrowRightLeft, run: changeClient },
    ...(booking.client && !isClientLocked
      ? [{ label: "Make walk-in", icon: Trash, run: clearClient }]
      : []),
  ];
};

const getLinkError = (error: unknown) =>
  error instanceof SaveError ? error.message : "That didn’t work. Try again.";

// a real client's manage page: copy it, or email it to them again
const getGuestItems = ({
  booking,
  raw,
  actions,
}: SheetContext): ActionItem[] => {
  const remoteId = raw?.remoteId;

  const hasStarted =
    !!booking.startsAt && Date.parse(booking.startsAt) <= Date.now();

  // the manage page is for bookings still to come that the client has confirmed
  if (!booking.client || booking.awaiting || hasStarted) return [];

  const showError = (error: unknown) => actions.showToast(getLinkError(error));

  const copyManageLink = () =>
    remoteId
      ? copyLaterText(getManageUrl(remoteId, false))
      : Promise.resolve(copyText(`tiwaras.house/manage/${booking.id}`));

  return [
    {
      label: "Copy guest management link",
      icon: Link,
      run: () =>
        copyManageLink().then(
          () => actions.showToast(`Guest link copied for ${booking.firstName}`),
          showError,
        ),
    },
    ...(remoteId && booking.hasEmail
      ? [
          {
            label: "Email guest management link",
            icon: Mail,
            run: () =>
              getManageUrl(remoteId, true).then(
                () => actions.showToast(`Link emailed to ${booking.firstName}`),
                showError,
              ),
          },
        ]
      : []),
  ];
};

const getMoreItems = (context: SheetContext): ActionItem[] => {
  const { booking, setState, actions } = context;
  // a booking logged after it started can't be moved or marked as a no-show
  const isLoggedLate = !!booking.loggedAfterStart;

  const reschedule: ActionItem = {
    label: "Reschedule",
    icon: Undo,
    run: () => setState({ ...RESCHEDULE_STEP, statusMenuOpen: false }),
  };

  const noShow: ActionItem = {
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
  };

  return [
    ...getGuestItems(context),
    ...getClientItems(context),
    ...(isLoggedLate ? [] : [reschedule]),
    {
      label: "Cancel",
      icon: X,
      danger: true,
      run: () => setState({ ...CANCEL_STEP, statusMenuOpen: false }),
    },
    ...(isLoggedLate ? [] : [noShow]),
  ];
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
    hasMore: !isClosed && !booking.completed,
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
