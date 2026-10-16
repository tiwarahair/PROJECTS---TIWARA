// The booking sheet's values and actions: the status menu, cancel / no-show / checkout, reschedule, payment.
import type { ChangeEvent, MouseEvent } from "react";
import {
  Check,
  CreditCard,
  Link,
  Send,
  TriangleAlert,
  Undo,
  X,
} from "lucide-react";
import type {
  CheckoutBooking,
  PaymentMode,
} from "../../../../components/checkout/data";
import { CLIENTS, SLOT_TIMES } from "../../core/data";
import { decorateBooking, getDecoratedBookings } from "../decorate";
import type { DecoratedBooking } from "../decorate";
import {
  copyText,
  dayInfo,
  dateLabel,
  getAvatarSrc,
  hhmm,
} from "../../core/format";
import {
  getBookingBuffer,
  getClient,
  getConflicts,
  getPolicyFee,
  getProtectionExpiry,
  getProtectionNoun,
  getSlots,
  getWorkingHours,
} from "../../core/model";
import type {
  ActionItem,
  CheckoutRecord,
  PastRecord,
  StudioBooking,
  StudioState,
} from "../../core/types";
import type { StudioController } from "../../core/use-studio";
import { formatMoney } from "../../../../utils/money";

const CLOSED_STATUSES = [
  "cancelled",
  "completed",
  "noshow",
  "auto_cancelled",
  "expired",
];

const VIA_LABELS: Record<string, string> = {
  cash: "Cash",
  bank: "Bank transfer",
  reader: "Card reader",
};

const getPaymentMode = ({
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

/** A status action's hint when it is not available yet: only on the day, else from a set time. */
const getOnTheDaySubtitle = (
  canDo: boolean,
  dayOffset: number,
  fromText: string,
) => {
  if (canDo) return "";

  return dayOffset !== 0 ? "Only on the day" : fromText;
};

const getCheckoutLabel = ({
  method,
  charged,
  via,
  refundAuto,
}: CheckoutRecord) => {
  if (method === "link") return `Link sent · £${charged} due`;

  if (method === "record") return `Paid · ${VIA_LABELS[via] || "Recorded"}`;

  if (method === "card") return "Paid · Card";

  return refundAuto > 0 ? `Refunded £${refundAuto}` : "Paid";
};

/** The booking in the shape CheckoutSheet takes. */
const getCheckoutBooking = (
  state: StudioState,
  booking: DecoratedBooking,
): CheckoutBooking => {
  const raw = state.bookings.find(({ id }) => id === booking.id);
  const client = booking.client ? getClient(state, booking.client) : null;

  const addons: [string, number][] = (raw?.addons || []).map(
    ({ name, quantity, price }) => [
      (name || "Add-on") + ((quantity || 1) > 1 ? ` × ${quantity}` : ""),
      (price || 0) * (quantity || 1),
    ],
  );

  let addonSum = 0;

  for (const [, amount] of addons) addonSum += amount;

  const mode = getPaymentMode(booking);

  return {
    client: booking.client ? booking.clientName : "Walk-in",
    first: booking.client ? booking.firstName : "your client",
    service: booking.service,
    meta: booking.durationLabel,
    price: Math.max(0, booking.price - addonSum),
    addons,
    mode,
    paid: booking.paidAmount || 0,
    card: mode === "none" ? null : "4242",
    brand: "Visa",
    paidOn: "",
    phone: client?.phone || "",
    email: client?.email || "",
    day: booking.dayLabel,
    time: booking.timeRange,
    arrived: "",
  };
};

export const getBookingSheetView = (studio: StudioController) => {
  const { state, setState, isWide, isNew, actions, context } = studio;

  const {
    showToast,
    openSheet,
    closeSheet,
    openActionSheet,
    setStatus,
    rebookFrom,
  } = actions;

  if (state.sheet !== "booking") return null;

  const upcoming = getDecoratedBookings(state, isNew, (booking) =>
    openSheet("booking", { sheetBookingId: booking.id }),
  );

  const raw =
    state.bookings.find(({ id }) => id === state.sheetBookingId) ||
    state.bookings[0];

  const booking =
    state.bookingStep === "done" && state.doneBooking
      ? decorateBooking(state, state.doneBooking, 0, () => {})
      : (upcoming.find(({ id }) => id === state.sheetBookingId) ??
        (raw
          ? decorateBooking(state, raw, 0, () =>
              openSheet("booking", { sheetBookingId: raw.id }),
            )
          : null));

  if (!booking) return null;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const patchBooking = (patch: Partial<StudioBooking>) =>
    setState(({ bookings }) => ({
      bookings: bookings.map((item) =>
        item.id === booking.id ? { ...item, ...patch } : item,
      ),
    }));

  const hoursToStart =
    (booking.dayOffset * 1440 + booking.startMinutes - nowMinutes) / 60;

  const isLate = hoursToStart < state.policy.window;
  const lateFee = getPolicyFee(state, "late", booking);
  const noShowFee = getPolicyFee(state, "noShow", booking);

  const windowText =
    state.policy.window < 1 ? "30-minute" : `${state.policy.window}-hour`;

  const isFeeKept =
    state.cancelWho === "client" &&
    isLate &&
    lateFee.amount > 0 &&
    state.cancelFee;

  const noShowChoice =
    noShowFee.amount > 0 && state.noShowCharge !== "none" ? "fee" : "none";

  const isClosed = CLOSED_STATUSES.includes(booking.status);
  const due = booking.due;

  /** Moves the booking to Past with an undo. */
  const finish = (record: Partial<PastRecord>, message: string) => {
    const current = context.getState();
    const previousBookings = current.bookings;
    const previousPast = current.pastNew;
    const original = previousBookings.find(({ id }) => id === booking.id);

    setState({
      bookings: previousBookings.filter(({ id }) => id !== booking.id),
      pastNew: [
        {
          pastId: Date.now(),
          client: booking.client,
          service: booking.service,
          price: booking.price,
          duration: booking.durationLabel,
          when: dateLabel(booking.dayOffset || 0),
          time: booking.time,
          at: Date.now(),
          original,
          ...record,
        } as PastRecord,
      ].concat(previousPast),
    });

    showToast(message, () => {
      setState({ bookings: previousBookings, pastNew: previousPast });
      closeSheet();
    });
  };

  // ---- the payment breakdown ----
  const addonLines = (
    state.bookings.find(({ id }) => id === booking.id)?.addons || []
  ).map(({ name, quantity: rawQuantity, price }) => {
    const quantity = rawQuantity || 1;
    const amount = (price || 0) * quantity;

    return {
      key: (name || "Add-on") + quantity,
      label: (name || "Add-on") + (quantity > 1 ? ` × ${quantity}` : ""),
      value: `£${amount}`,
      amount,
    };
  });

  let addonSum = 0;

  for (const { amount } of addonLines) addonSum += amount;

  const paidAmount = booking.price - booking.dueAmount;

  const received: {
    key: string;
    label: string;
    subtitle: string;
    value: string;
    tone: "paid" | "quiet" | "failed";
  }[] = [];

  if (booking.paidKind === "deposit" || booking.paidKind === "full")
    received.push({
      key: "paid",
      label: booking.paidKind === "deposit" ? "Deposit" : "Paid in full",
      subtitle: "Card · online at booking",
      value: `£${paidAmount}`,
      tone: "paid",
    });
  else if (booking.awaiting)
    received.push({
      key: "link",
      label: booking.protectionWord,
      subtitle: `Link sent ${booking.linkSentLabel || ""}`,
      value: "Pending",
      tone: "quiet",
    });
  else if (booking.paidKind === "failed")
    received.push({
      key: "failed",
      label: "Card payment",
      subtitle: "Declined",
      value: "£0",
      tone: "failed",
    });
  else
    received.push({
      key: "none",
      label: "Nothing paid yet",
      subtitle: booking.noProtect
        ? "No booking protection"
        : "Collect at checkout",
      value: "£0",
      tone: "quiet",
    });

  const fee = Math.round((booking.price * 0.015 + 0.5) * 100) / 100;

  // ---- the status menu ----
  const items: ActionItem[] = [];

  if (booking.awaiting) {
    items.push({
      label: "Confirmed",
      icon: Check,
      subtitle: "Confirm without protection",
      run: () =>
        setStatus(booking.id, "confirmed", "Marked as confirmed", {
          paid: booking.protectionMode === "full" ? "full" : "deposit",
          protect: "link",
        }),
    });

    items.push({
      label: booking.canResend ? "Resend payment link" : "No resends left",
      icon: Send,
      disabled: !booking.canResend,
      run: () => {
        const count = (booking.resends || 0) + 1;
        const sentAt = Date.now();

        setState({
          statusMenuOpen: false,
          bookings: state.bookings.map((item) =>
            item.id === booking.id
              ? {
                  ...item,
                  resends: count,
                  linkSentAt: sentAt,
                  expiresAt: getProtectionExpiry(
                    sentAt,
                    booking.dayOffset,
                    booking.time,
                  ),
                }
              : item,
          ),
        });

        showToast(
          `Link resent to ${booking.firstName} · ${2 - count} of 2 left`,
        );
      },
    });

    items.push({
      label: "Cancel",
      icon: X,
      danger: true,
      run: () =>
        setState({
          bookingStep: "cancel",
          cancelWho: "client",
          cancelFee: true,
          cancelReason: "",
        }),
    });
  } else if (booking.autoX) {
    items.push({
      label: "Send a new link",
      icon: Send,
      subtitle: "Starts a fresh 48 hrs",
      run: () => {
        const sentAt = Date.now();

        setStatus(
          booking.id,
          "awaiting",
          `New link sent to ${booking.firstName}`,
          {
            paid: "link",
            resends: 0,
            linkSentAt: sentAt,
            expiresAt: getProtectionExpiry(
              sentAt,
              booking.dayOffset,
              booking.time,
            ),
          },
        );
      },
    });
  } else if (booking.status !== "arrived") {
    items.push({
      label: "Arrived",
      icon: Check,
      disabled: !booking.canArrive,
      subtitle: getOnTheDaySubtitle(
        booking.canArrive,
        booking.dayOffset,
        `From ${hhmm(booking.startMinutes - 60)}`,
      ),
      run: () => setStatus(booking.id, "arrived", "Marked as arrived"),
    });

    items.push({
      label: "No-show",
      icon: TriangleAlert,
      disabled: !booking.canNoShow,
      danger: true,
      subtitle: getOnTheDaySubtitle(
        booking.canNoShow,
        booking.dayOffset,
        `From ${hhmm(booking.graceEnd)} (${state.policy.grace} min grace)`,
      ),
      run: () => setState({ bookingStep: "noshow", noShowCharge: "deposit" }),
    });

    items.push({
      label: "Cancel",
      icon: X,
      danger: true,
      run: () =>
        setState({
          bookingStep: "cancel",
          cancelWho: "client",
          cancelFee: true,
          cancelReason: "",
        }),
    });
  } else {
    items.push({
      label: "Completed",
      icon: CreditCard,
      subtitle: due > 0 ? `Collect £${due}` : "Nothing left to collect",
      run: () => setState({ bookingStep: "checkout", checkoutMethod: null }),
    });

    items.push({
      label: "Confirmed",
      icon: Undo,
      subtitle: "Undo arrived",
      run: () => setStatus(booking.id, "confirmed", "Back to confirmed"),
    });
  }

  // ---- change client ----
  const changeQuery = (state.changeClientQuery || "").trim();
  const lowerQuery = changeQuery.toLowerCase();
  const everyone = CLIENTS.concat(state.extraClients);

  const applyClient = (
    clientId: string | null,
    patch: Partial<StudioBooking> = {},
  ) => {
    setState({ bookingStepOut: true });

    window.setTimeout(
      () =>
        setState(({ bookings }) => ({
          bookingStepOut: false,
          bookingStep: "view",
          bookingStepBack: true,
          confirm: null,
          bookings: bookings.map((item) =>
            item.id === booking.id
              ? { ...item, client: clientId, ...patch }
              : item,
          ),
        })),
      200,
    );

    window.setTimeout(() => setState({ bookingStepBack: false }), 900);
  };

  const setClient = (clientId: string | null) => {
    const other = everyone.find(({ id }) => id === clientId);

    const getName = () => {
      if (!clientId) return "a walk-in";

      return other ? (other.name.split(" ")[0] ?? "") : "the client";
    };

    const name = getName();

    if (!clientId || state.policy.mode === "none") {
      applyClient(clientId, {
        protect: "none",
        paid: "none",
        status: "confirmed",
      });

      return;
    }

    const sentAt = Date.now();
    const protectionNoun = getProtectionNoun(state);

    setState({
      confirm: {
        title: `Ask ${name} for booking protection?`,
        yesLabel: "Send a link",
        noLabel: "No protection",
        body: `Protection was agreed with the previous client, so it does not carry over. Sending a link asks ${name} for ${protectionNoun}; the booking waits 48 hrs to be confirmed.`,
        yes: () =>
          applyClient(clientId, {
            protect: "link",
            paid: "link",
            status: "awaiting",
            protectionMode: state.policy.mode,
            resends: 0,
            linkSentAt: sentAt,
            expiresAt: getProtectionExpiry(
              sentAt,
              booking.dayOffset,
              booking.time,
            ),
          }),
        onNo: () =>
          applyClient(clientId, {
            protect: "none",
            paid: "none",
            status: "confirmed",
          }),
      },
    });
  };

  context.memo.setChangeClient = setClient;

  // ---- reschedule ----
  const slots = getSlots(
    state,
    state.rescheduleDay,
    booking.durationMinutes,
    getBookingBuffer(state, booking.service),
    booking.id,
  );

  const rescheduleConflicts = getConflicts(
    state,
    state.rescheduleDay,
    state.rescheduleTime,
    booking.durationMinutes,
    booking.id,
  );

  const rescheduleDate = new Date();

  rescheduleDate.setDate(rescheduleDate.getDate() + (state.rescheduleDay || 0));

  const rescheduleHours = state.hours[(rescheduleDate.getDay() + 6) % 7] ?? {
    day: "",
    on: true,
    start: "09:00",
    end: "18:00",
  };

  const customTime = state.rescheduleTime || "";
  const isCustom = !!state.rescheduleCustom;

  const isInRange =
    !customTime || !rescheduleHours.on
      ? false
      : customTime >= rescheduleHours.start && customTime < rescheduleHours.end;

  const isOutside =
    isCustom && !!customTime && (!rescheduleHours.on || !isInRange);

  const canMove = state.rescheduleDay != null && !!state.rescheduleTime;

  const getCustomHint = () => {
    if (!rescheduleHours.on)
      return "You’re closed this day. You can still book it.";

    if (isOutside)
      return `Outside your hours (${rescheduleHours.start}–${rescheduleHours.end}). You can still book it.`;

    return `Any time between ${rescheduleHours.start} and ${rescheduleHours.end}`;
  };

  const reschedule = () => {
    if (!canMove) return;

    const previous = state.bookings;

    setState({
      bookings: state.bookings.map((item) =>
        item.id === state.sheetBookingId
          ? {
              ...item,
              dayOffset: state.rescheduleDay ?? 0,
              time: state.rescheduleTime ?? item.time,
              pending: false,
            }
          : item,
      ),
      dayIndex: state.rescheduleDay ?? 0,
      bookingsLayout: "cal",
    });

    const { label: dayLabel } = dayInfo(state.rescheduleDay ?? 0);

    showToast(
      `Moved to ${dayLabel}, ${state.rescheduleTime}. ${booking.firstName} notified`,
      () => setState({ bookings: previous }),
    );

    closeSheet();
  };

  context.memo.applyReschedule = reschedule;

  // ---- cancel ----
  const cancel = () => {
    const who = state.cancelWho === "me" ? "you" : booking.firstName;

    const notice =
      hoursToStart < 48
        ? `${Math.max(1, Math.round(hoursToStart))} hours before`
        : `${Math.round(hoursToStart / 24)} days before`;

    const isNothingPaid =
      state.policy.mode === "card" || state.policy.mode === "none";

    // the outcome copy: a late fee is kept, nothing was taken, or a full refund
    const getCancelCopy = () => {
      if (isFeeKept)
        return {
          meta: "Fee pending",
          noteTail: ` ${lateFee.subtitle}.`,
          toast: `Cancelled. ${lateFee.label} fee pending`,
        };

      if (isNothingPaid)
        return { meta: "No charge", noteTail: "", toast: "Booking cancelled" };

      return {
        meta: "Refunded",
        noteTail: " Refunded in full.",
        toast: `Cancelled. ${booking.firstName} refunded in full`,
      };
    };

    const { meta, noteTail, toast } = getCancelCopy();
    const reason = state.cancelReason.trim();
    const reasonNote = reason ? ` ${reason}` : "";

    finish(
      {
        status: "Cancelled",
        feeKept: isFeeKept,
        feePending: isFeeKept,
        feeLabel: lateFee.label,
        meta,
        note: `Cancelled by ${who} ${notice}.${noteTail}${reasonNote}`,
      },
      toast,
    );

    closeSheet();
  };

  context.memo.cancelBooking = cancel;

  const getCancelBody = () => {
    if (state.cancelWho === "me")
      return `Cancelling refunds ${booking.firstName} in full, including the booking fee, and frees the slot for online booking.`;

    if (!isLate)
      return `${booking.firstName} is cancelling outside your ${windowText} window, so there is no fee. ${lateFee.refund}. The slot opens up for online booking.`;

    if (lateFee.amount > 0)
      return `${booking.firstName} is cancelling inside your ${windowText} window, so your policy charges a ${lateFee.label} late cancellation fee (${lateFee.subtitle}). The slot opens up.`;

    const refundNote = lateFee.refund.toLowerCase();

    return `${booking.firstName} is cancelling inside your ${windowText} window. Your policy has no late cancellation fee: ${refundNote}. The slot opens up.`;
  };

  const rescheduleConflictList = rescheduleConflicts
    .map(({ name, range }) => `${name} (${range})`)
    .join(", ");

  return {
    booking,
    raw,
    patchBooking,
    finish,
    sensitivities: (() => {
      const bookingRaw =
        state.sheetBookingId != null
          ? state.bookings.find(({ id }) => id === state.sheetBookingId)
          : null;

      const client = bookingRaw?.client
        ? getClient(state, bookingRaw.client)
        : null;

      return client?.sensitivities || "";
    })(),
    isView: state.bookingStep === "view",
    isMain:
      ![
        "done",
        "resched",
        "cancel",
        "editsvc",
        "changesvc",
        "addaddon",
        "changeclient",
        "payment",
      ].includes(state.bookingStep) &&
      !(
        !isWide &&
        (state.bookingStep === "checkout" || state.bookingStep === "noshow")
      ),
    // client row: hover reveals change / walk-in unless a payment locks the client
    isClientLocked:
      booking.paidKind === "deposit" ||
      booking.paidKind === "full" ||
      (booking.protect === "link" &&
        booking.protectionMode === "card" &&
        !booking.awaiting),
    openClient: () => {
      if (!booking.client) {
        setState({ bookingStep: "changeclient", changeClientQuery: "" });

        return;
      }

      openSheet("cliView", {
        selectedClientId: booking.client,
        clientAppointmentsTab: "up",
        clientFromBookingId: booking.id,
      });
    },
    changeClient: () =>
      setState({ bookingStep: "changeclient", changeClientQuery: "" }),
    clearClient: () =>
      setState({
        confirm: {
          title: "Make this a walk-in?",
          yesLabel: "Make walk-in",
          noLabel: "Keep client",
          body: `The appointment stays in your calendar with no client attached. ${booking.firstName} will not get reminders for it.`,
          yes: () => {
            setState(({ bookings }) => ({
              confirm: null,
              bookings: bookings.map((item) =>
                item.id === booking.id ? { ...item, client: null } : item,
              ),
            }));

            showToast("Now a walk-in");
          },
        },
      }),
    statusItems: items.map((item) => ({
      ...item,
      run: () => {
        if (item.disabled) return;

        setState({ statusMenuOpen: false });
        item.run();
      },
    })),
    // payment
    payLines: [
      {
        key: "svc",
        label: booking.service,
        value: `£${Math.max(0, booking.price - addonSum)}`,
      },
    ].concat(
      addonLines.map(({ key, label, value }) => ({ key, label, value })),
    ),
    payReceived: received,
    payFeeLabel: formatMoney(fee, { pence: "always" }),
    feeWho: booking.client ? booking.firstName : "the client",
    payRowLabel: booking.dueAmount > 0 ? "To pay" : "Paid",
    // footer
    canCheckout:
      !isClosed &&
      !booking.awaiting &&
      !booking.autoX &&
      (booking.status === "arrived" ||
        booking.dayOffset < 0 ||
        (booking.dayOffset === 0 && nowMinutes >= booking.startMinutes)),
    hasMore: !isClosed,
    more: (event: MouseEvent) => {
      const host = event.currentTarget as Element;
      const rect = host.getBoundingClientRect?.();

      const anchor = rect
        ? { bottom: window.innerHeight - rect.top + 8, left: rect.left }
        : null;

      const guest: ActionItem[] = booking.client
        ? [
            {
              label: "Copy guest management link",
              icon: Link,
              run: () => {
                copyText(`tiwaras.house/manage/${booking.id}`);
                showToast(`Guest link copied for ${booking.firstName}`);
              },
            },
          ]
        : [];

      openActionSheet({
        title: booking.clientName || "Walk-in",
        subtitle: `${booking.service} · ${booking.dayShort} ${booking.timeRange || ""}`,
        anchor,
        items: guest.concat([
          {
            label: "Reschedule",
            icon: Undo,
            run: () =>
              setState({
                bookingStep: "resched",
                rescheduleDay: null,
                rescheduleTime: null,
                rescheduleCustom: false,
                statusMenuOpen: false,
              }),
          },
          {
            label: "Cancel",
            icon: X,
            danger: true,
            run: () =>
              setState({
                bookingStep: "cancel",
                cancelWho: "client",
                cancelFee: true,
                cancelReason: "",
                statusMenuOpen: false,
              }),
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
                showToast(
                  "No-show can be marked once the appointment has started",
                );
            },
          },
        ]),
      });
    },
    bookAgain: () => rebookFrom(booking),
    goCheckout: () =>
      setState({
        bookingStep: "checkout",
        checkoutMethod: null,
        statusMenuOpen: false,
      }),
    openPayment: () =>
      setState({ bookingStep: "payment", statusMenuOpen: false }),
    // awaiting confirmation
    resend: () => {
      if (!booking.canResend) return;

      const count = (booking.resends || 0) + 1;
      const sentAt = Date.now();

      setState({
        bookings: state.bookings.map((item) =>
          item.id === booking.id
            ? {
                ...item,
                resends: count,
                linkSentAt: sentAt,
                expiresAt: getProtectionExpiry(
                  sentAt,
                  booking.dayOffset,
                  booking.time,
                ),
              }
            : item,
        ),
      });

      showToast(`Link resent to ${booking.firstName} · ${2 - count} of 2 left`);
    },
    copyPaymentLink: () => {
      copyText(`tiwaras.house/pay/${booking.id}`);
      showToast("Payment link copied");
    },
    // location (mobile stylists)
    toggleLocation: () => {
      if (!state.bookingAddressOn) {
        setState({
          bookingAddressOn: true,
          bookingAddressDraft: booking.address,
        });

        return;
      }

      const address = state.bookingAddressDraft.trim();

      setState({
        bookingAddressOn: false,
        clientAddresses: {
          ...state.clientAddresses,
          [booking.client ?? ""]: address,
        },
      });

      patchBooking({ address });

      showToast(
        address
          ? `Address saved to ${booking.firstName}’s profile`
          : "Address removed",
      );
    },
    // the stylist's own note
    saveNote: () => {
      patchBooking({ stylistNote: state.bookingNoteDraft.trim() });
      setState({ bookingNoteOn: false });
      showToast(state.bookingNoteDraft.trim() ? "Note saved" : "Note removed");
    },
    // change client
    changeRows: everyone
      .filter(
        ({ name }) => !lowerQuery || name.toLowerCase().includes(lowerQuery),
      )
      .map((client) => ({
        key: client.id ?? "",
        name: client.name,
        imgSrc: getAvatarSrc(client),
        meta:
          (client.visits || 0) +
          (client.visits === 1 ? " visit" : " visits") +
          (client.area ? ` · ${client.area}` : ""),
        isCurrent: client.id === booking.client,
        pick: () => setClient(client.id),
      })),
    canAddTyped:
      changeQuery.length > 1 &&
      !everyone.some(({ name }) => name.toLowerCase() === lowerQuery),
    openNewClient: () => {
      const parts = changeQuery.split(" ");

      setState({
        newClient: {
          first: parts[0] || "",
          last: parts.slice(1).join(" "),
          email: "",
          phone: "",
        },
      });
    },
    addTypedClient: () => {
      const id = `c${Date.now()}`;

      setState(({ extraClients }) => ({
        extraClients: extraClients.concat([
          {
            id,
            name: changeQuery,
            first: changeQuery.split(" ")[0],
            img: "",
            area: "",
            visits: 0,
            since: "today",
            spent: 0,
            phone: "",
            email: "",
          },
        ]),
      }));

      setClient(id);
      showToast(`${changeQuery} added`);
    },
    makeWalkIn: () => setClient(null),
    // reschedule
    rescheduleDays: Array.from({ length: 8 }, (_slot, offset) => {
      const info = dayInfo(offset);

      return {
        key: offset,
        weekday: info.weekday,
        dayNumber: info.dayNumber,
        isOn: state.rescheduleDay === offset,
        pick: () => setState({ rescheduleDay: offset }),
      };
    }),
    rescheduleTimes: slots.map((time) => ({
      key: time,
      label: time,
      isOn: state.rescheduleTime === time,
      pick: () => setState({ rescheduleTime: time, rescheduleCustom: false }),
    })),
    hasNoSlots: state.rescheduleDay != null && slots.length === 0,
    noSlotsText: getWorkingHours(state, state.rescheduleDay || 0).on
      ? "No free 30-minute starts left this day. Use a custom time if you want to squeeze it in."
      : "You’re closed this day. Use a custom time to book it anyway.",
    isCustom,
    toggleCustom: () =>
      setState({
        rescheduleCustom: !isCustom,
        rescheduleTime:
          isCustom || SLOT_TIMES.includes(state.rescheduleTime ?? "")
            ? null
            : state.rescheduleTime,
      }),
    customTime,
    onCustomTime: (event: ChangeEvent<HTMLInputElement>) =>
      setState({ rescheduleTime: event.target.value || null }),
    customHint: getCustomHint(),
    isCustomWarn: isOutside || !rescheduleHours.on,
    rescheduleWarning: rescheduleConflicts.length
      ? `Overlaps ${rescheduleConflictList}. You can still move it.`
      : "",
    canMove,
    reschedule,
    // cancel
    cancelWhoOptions: [
      { id: "client", label: `${booking.firstName} is cancelling` },
      { id: "me", label: "I am cancelling" },
    ],
    cancelBody: getCancelBody(),
    isFeeShown: state.cancelWho === "client" && isLate && lateFee.amount > 0,
    feeLabel: `Charge the ${lateFee.label || ""} late cancellation fee`,
    cancel,
    // no-show
    noShowOptions: (noShowFee.amount > 0
      ? [
          {
            id: "fee",
            label: `Charge the ${noShowFee.label} no-show fee`,
            subtitle: noShowFee.subtitle ?? "",
          },
          { id: "none", label: "No charge", subtitle: noShowFee.refund },
        ]
      : [
          {
            id: "none",
            label: "No charge",
            subtitle: `Your payment policy has no no-show fee. ${noShowFee.refund}.`,
          },
        ]
    ).map((option) => ({
      ...option,
      isOn: noShowChoice === option.id,
      pick: () => setState({ noShowCharge: option.id }),
    })),
    confirmNoShow: () => {
      const isCharging = noShowChoice === "fee";
      const noShowNote = isCharging ? noShowFee.subtitle : noShowFee.refund;

      finish(
        {
          status: "No show",
          meta: isCharging ? "Fee pending" : "No charge",
          feeKept: isCharging,
          feePending: isCharging,
          feeLabel: noShowFee.label,
          note: `Client did not attend. ${noShowNote}.`,
        },
        "Marked as no-show",
      );

      closeSheet();
    },
    backToView: () => {
      const to =
        state.bookingStep === "changesvc" || state.bookingStep === "addaddon"
          ? "editsvc"
          : "view";

      setState({ bookingStepOut: true });

      window.setTimeout(
        () =>
          setState({
            bookingStepOut: false,
            bookingStepBack: to === "view",
            bookingStep: to,
          }),
        200,
      );

      if (to === "view")
        window.setTimeout(() => setState({ bookingStepBack: false }), 700);
    },
    // done
    doneTitle: `Done, ${booking.firstName} is all set`,
    doneBody:
      state.checkoutMethod === "link"
        ? `A payment link for £${due} is on its way to ${booking.firstName}. The booking is in Past.`
        : "Marked completed and moved to Past.",
    rebook: () => rebookFrom(booking),
    // the embedded checkout's result
    onCheckoutComplete: (result: CheckoutRecord, action: string) => {
      const label = getCheckoutLabel(result);

      finish(
        {
          status: "Completed",
          meta: label,
          price: result.total,
          checkout: result,
        },
        "Checkout complete",
      );

      if (action === "rebook") rebookFrom(booking);
      else closeSheet();
    },
    checkoutBooking: getCheckoutBooking(state, booking),
  };
};

export type BookingSheetView = NonNullable<
  ReturnType<typeof getBookingSheetView>
>;
