import { Check, CreditCard, Send, TriangleAlert, Undo, X } from "lucide-react";
import type { DecoratedBooking } from "../decorate";
import { hhmm } from "../../core/format";
import type { ActionItem } from "../../core/types";
import { confirmWithoutProtection } from "../../../../lib/studio-api/booking-writes";
import { getFreshLink } from "./booking";
import type { SheetContext } from "./context";
import { CANCEL_STEP } from "./types";
import type { StatusMenuKind } from "./types";

/** A status action's hint when it is not available yet: only on the day, else from a set time. */
const getOnTheDaySubtitle = (
  canDo: boolean,
  dayOffset: number,
  fromText: string,
) => {
  if (canDo) return "";

  return dayOffset !== 0 ? "Only on the day" : fromText;
};

const getStatusMenuKind = ({
  awaiting,
  autoX,
  status,
}: DecoratedBooking): StatusMenuKind => {
  if (awaiting) return "awaiting";

  if (autoX) return "autoCancelled";

  return status === "arrived" ? "arrived" : "upcoming";
};

const getCancelItem = ({ setState }: SheetContext): ActionItem => ({
  label: "Cancel",
  icon: X,
  danger: true,
  run: () => setState(CANCEL_STEP),
});

const askToConfirmUnprotected = ({
  booking,
  actions,
  setState,
  saveBooking,
}: SheetContext) =>
  setState({
    confirm: {
      title: "Confirm without protection?",
      yesLabel: "Confirm booking",
      noLabel: "Keep waiting",
      body: `${booking.firstName}’s link stops working, and no cancellation or no-show fee can be charged on this booking.`,
      yes: () => {
        setState({ confirm: null });

        saveBooking(
          {
            status: "confirmed",
            paid: "none",
            protect: "none",
            expiresAt: undefined,
            linkAmount: undefined,
          },
          confirmWithoutProtection,
        );

        actions.showToast("Confirmed without protection");
      },
    },
  });

const STATUS_ITEMS: Record<
  StatusMenuKind,
  (context: SheetContext) => ActionItem[]
> = {
  awaiting: (context) => {
    const { booking, resendLink } = context;

    return [
      {
        label: "Confirmed",
        icon: Check,
        subtitle: "Confirm without protection",
        run: () => askToConfirmUnprotected(context),
      },
      {
        label: booking.canResend ? "Resend payment link" : "No resends left",
        icon: Send,
        disabled: !booking.canResend,
        run: () => resendLink({ statusMenuOpen: false }),
      },
      getCancelItem(context),
    ];
  },
  autoCancelled: ({ booking, actions }) => [
    {
      label: "Send a new link",
      icon: Send,
      subtitle: "Starts a fresh 48 hrs",
      run: () =>
        actions.setStatus(
          booking.id,
          "awaiting",
          `New link sent to ${booking.firstName}`,
          { paid: "link", resends: 0, ...getFreshLink(booking) },
        ),
    },
  ],
  upcoming: (context) => {
    const { booking, setState, actions } = context;

    return [
      {
        label: "Arrived",
        icon: Check,
        disabled: !booking.canArrive,
        subtitle: getOnTheDaySubtitle(
          booking.canArrive,
          booking.dayOffset,
          `From ${hhmm(booking.startMinutes - 60)}`,
        ),
        run: () =>
          actions.setStatus(booking.id, "arrived", "Marked as arrived"),
      },
      {
        label: "No-show",
        icon: TriangleAlert,
        disabled: !booking.canNoShow,
        danger: true,
        subtitle: getOnTheDaySubtitle(
          booking.canNoShow,
          booking.dayOffset,
          `From ${hhmm(booking.graceEnd)} (${booking.graceMinutes} min grace)`,
        ),
        run: () => setState({ bookingStep: "noshow", noShowCharge: "deposit" }),
      },
      getCancelItem(context),
    ];
  },
  arrived: ({ booking, setState, actions }) => [
    {
      label: "Completed",
      icon: CreditCard,
      subtitle:
        booking.due > 0 ? `Collect £${booking.due}` : "Nothing left to collect",
      run: () => setState({ bookingStep: "checkout", checkoutMethod: null }),
    },
    {
      label: "Confirmed",
      icon: Undo,
      subtitle: "Undo arrived",
      run: () =>
        actions.setStatus(booking.id, "confirmed", "Back to confirmed"),
    },
  ],
};

// ---- the status menu ----
export const getStatusMenu = (context: SheetContext) => ({
  statusItems: STATUS_ITEMS[getStatusMenuKind(context.booking)](context).map(
    (item) => ({
      ...item,
      run: () => {
        if (item.disabled) return;

        context.setState({ statusMenuOpen: false });
        item.run();
      },
    }),
  ),
});
