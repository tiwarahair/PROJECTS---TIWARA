// The booking sheet's values and actions (prototype renderVals: sheetB, bk*, cc, the status menu, cancel / no-show /
// checkout, reschedule, payment).
import type { ChangeEvent, MouseEvent } from "react";
import type {
  CheckoutBooking,
  PaymentMode,
} from "../../components/checkout-sheet/checkout-data";
import { CLIENTS, SLOT_TIMES } from "./studio-data";
import { decorateBooking, getDecoratedBookings } from "./studio-decorate";
import type { DecoratedBooking } from "./studio-decorate";
import {
  copyText,
  dayInfo,
  dateLabel,
  getAvatarSrc,
  hhmm,
} from "./studio-format";
import {
  getBookingBuffer,
  getClient,
  getConflicts,
  getPolicyFee,
  getProtExpiry,
  getProtNoun,
  getSlots,
  getWorkingHours,
} from "./studio-model";
import type {
  ActionItem,
  CheckoutRecord,
  PastRecord,
  StudioBooking,
  StudioState,
} from "./studio-types";
import type { StudioController } from "./use-studio";

const CLOSED_STATUSES = [
  "cancelled",
  "completed",
  "noshow",
  "auto_cancelled",
  "expired",
];

/** The booking in the shape CheckoutSheet takes (prototype ckBookingOf). */
export const getCheckoutBooking = (
  state: StudioState,
  booking: DecoratedBooking,
): CheckoutBooking => {
  const raw = state.bookings.find(({ id }) => id === booking.id);
  const client = booking.client ? getClient(state, booking.client) : null;
  const addons: [string, number][] = (raw?.addons || []).map(
    ({ name, qty, price }) => [
      (name || "Add-on") + ((qty || 1) > 1 ? " × " + qty : ""),
      (price || 0) * (qty || 1),
    ],
  );
  let addonSum = 0;
  for (const [, amount] of addons) addonSum += amount;
  const mode: PaymentMode =
    booking.paidKind === "full"
      ? "full"
      : booking.paidKind === "deposit"
        ? "deposit"
        : booking.protect === "link" &&
            booking.protMode === "card" &&
            !booking.awaiting
          ? "card"
          : "none";
  return {
    client: booking.client ? booking.clientName : "Walk-in",
    first: booking.client ? booking.firstName : "your client",
    svc: booking.svc,
    meta: booking.durLabel,
    price: Math.max(0, booking.price - addonSum),
    addons,
    mode,
    paid: booking.paidAmt || 0,
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
  const { toastMsg, openSheet, closeSheet, openActs, setStatus, rebookFrom } =
    actions;
  if (state.sheet !== "booking") return null;
  const upcoming = getDecoratedBookings(state, isNew, (booking) =>
    openSheet("booking", { sheetBId: booking.id }),
  );
  const raw =
    state.bookings.find(({ id }) => id === state.sheetBId) || state.bookings[0];
  const booking =
    state.bkStep === "done" && state.bkDoneB
      ? decorateBooking(state, state.bkDoneB, 0, () => {})
      : (upcoming.find(({ id }) => id === state.sheetBId) ??
        (raw
          ? decorateBooking(state, raw, 0, () =>
              openSheet("booking", { sheetBId: raw.id }),
            )
          : null));
  if (!booking) return null;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const patchBooking = (patch: Partial<StudioBooking>) =>
    setState(({ bookings }) => ({
      bookings: bookings.map((item) =>
        item.id === booking.id ? { ...item, ...patch } : item,
      ),
    }));
  const hoursToStart = (booking.off * 1440 + booking.startMin - nowMin) / 60;
  const isLate = hoursToStart < state.policy.window;
  const lateFee = getPolicyFee(state, "late", booking);
  const noShowFee = getPolicyFee(state, "ns", booking);
  const windowText =
    state.policy.window < 1 ? "30-minute" : state.policy.window + "-hour";
  const isFeeKept =
    state.cxWho === "client" && isLate && lateFee.amt > 0 && state.cxFee;
  const noShowChoice =
    noShowFee.amt > 0 && state.nsCharge !== "none" ? "fee" : "none";
  const isClosed = CLOSED_STATUSES.includes(booking.st);
  const due = booking.due;

  /** Moves the booking to Past with an undo (prototype finish). */
  const finish = (record: Partial<PastRecord>, message: string) => {
    const current = context.getState();
    const previousBookings = current.bookings;
    const previousPast = current.pastNew;
    const original = previousBookings.find(({ id }) => id === booking.id);
    setState({
      bookings: previousBookings.filter(({ id }) => id !== booking.id),
      pastNew: [
        {
          pid: Date.now(),
          client: booking.client,
          svc: booking.svc,
          price: booking.price,
          dur: booking.durLabel,
          when: dateLabel(booking.off || 0),
          time: booking.time,
          at: Date.now(),
          orig: original,
          ...record,
        } as PastRecord,
      ].concat(previousPast),
    });
    toastMsg(message, () => {
      setState({ bookings: previousBookings, pastNew: previousPast });
      closeSheet();
    });
  };

  // ---- the payment breakdown ----
  const addonLines = (
    state.bookings.find(({ id }) => id === booking.id)?.addons || []
  ).map(({ name, qty, price }) => {
    const quantity = qty || 1;
    const amount = (price || 0) * quantity;
    return {
      key: (name || "Add-on") + quantity,
      label: (name || "Add-on") + (quantity > 1 ? " × " + quantity : ""),
      value: "£" + amount,
      amount,
    };
  });
  let addonSum = 0;
  for (const { amount } of addonLines) addonSum += amount;
  const paidAmount = booking.price - booking.dueAmt;
  const received: {
    key: string;
    label: string;
    sub: string;
    value: string;
    tone: "paid" | "quiet" | "failed";
  }[] = [];
  if (booking.paidKind === "deposit" || booking.paidKind === "full")
    received.push({
      key: "paid",
      label: booking.paidKind === "deposit" ? "Deposit" : "Paid in full",
      sub: "Card · online at booking",
      value: "£" + paidAmount,
      tone: "paid",
    });
  else if (booking.awaiting)
    received.push({
      key: "link",
      label: booking.protWord,
      sub: "Link sent " + (booking.linkSentLabel || ""),
      value: "Pending",
      tone: "quiet",
    });
  else if (booking.paidKind === "failed")
    received.push({
      key: "failed",
      label: "Card payment",
      sub: "Declined",
      value: "£0",
      tone: "failed",
    });
  else
    received.push({
      key: "none",
      label: "Nothing paid yet",
      sub: booking.noProtect ? "No booking protection" : "Collect at checkout",
      value: "£0",
      tone: "quiet",
    });
  const fee = Math.round((booking.price * 0.015 + 0.5) * 100) / 100;

  // ---- the status menu ----
  const items: {
    label: string;
    d: string;
    sub?: string;
    off?: boolean;
    danger?: boolean;
    run: () => void;
  }[] = [];
  if (booking.awaiting) {
    items.push({
      label: "Confirmed",
      d: "M20 6 9 17l-5-5",
      sub: "Confirm without protection",
      run: () =>
        setStatus(booking.id, "confirmed", "Marked as confirmed", {
          paid: booking.protMode === "full" ? "full" : "deposit",
          protect: "link",
        }),
    });
    items.push({
      label: booking.canResend ? "Resend payment link" : "No resends left",
      d: "m22 2-7 20-4-9-9-4Z",
      off: !booking.canResend,
      run: () => {
        const count = (booking.resends || 0) + 1;
        const sentAt = Date.now();
        setState({
          stMenu: false,
          bookings: state.bookings.map((item) =>
            item.id === booking.id
              ? {
                  ...item,
                  resends: count,
                  linkSentAt: sentAt,
                  expiresAt: getProtExpiry(sentAt, booking.off, booking.time),
                }
              : item,
          ),
        });
        toastMsg(
          "Link resent to " +
            booking.firstName +
            " · " +
            (2 - count) +
            " of 2 left",
        );
      },
    });
    items.push({
      label: "Cancel",
      d: "M18 6 6 18M6 6l12 12",
      danger: true,
      run: () =>
        setState({
          bkStep: "cancel",
          cxWho: "client",
          cxFee: true,
          cxReason: "",
        }),
    });
  } else if (booking.autoX) {
    items.push({
      label: "Send a new link",
      d: "m22 2-7 20-4-9-9-4Z",
      sub: "Starts a fresh 48 hrs",
      run: () => {
        const sentAt = Date.now();
        setStatus(
          booking.id,
          "awaiting",
          "New link sent to " + booking.firstName,
          {
            paid: "link",
            resends: 0,
            linkSentAt: sentAt,
            expiresAt: getProtExpiry(sentAt, booking.off, booking.time),
          },
        );
      },
    });
  } else if (booking.st !== "arrived") {
    items.push({
      label: "Arrived",
      d: "M20 6 9 17l-5-5",
      off: !booking.canArrive,
      sub: booking.canArrive
        ? ""
        : booking.off !== 0
          ? "Only on the day"
          : "From " + hhmm(booking.startMin - 60),
      run: () => setStatus(booking.id, "arrived", "Marked as arrived"),
    });
    items.push({
      label: "No-show",
      d: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
      off: !booking.canNoShow,
      danger: true,
      sub: booking.canNoShow
        ? ""
        : booking.off !== 0
          ? "Only on the day"
          : "From " +
            hhmm(booking.graceEnd) +
            " (" +
            state.policy.grace +
            " min grace)",
      run: () => setState({ bkStep: "noshow", nsCharge: "deposit" }),
    });
    items.push({
      label: "Cancel",
      d: "M18 6 6 18M6 6l12 12",
      danger: true,
      run: () =>
        setState({
          bkStep: "cancel",
          cxWho: "client",
          cxFee: true,
          cxReason: "",
        }),
    });
  } else {
    items.push({
      label: "Completed",
      d: "M2 7h20v12H2zM2 11h20",
      sub: due > 0 ? "Collect £" + due : "Nothing left to collect",
      run: () => setState({ bkStep: "checkout", coMethod: null }),
    });
    items.push({
      label: "Confirmed",
      d: "M3 7v6h6M21 17a9 9 0 0 0-15-6.7L3 13",
      sub: "Undo arrived",
      run: () => setStatus(booking.id, "confirmed", "Back to confirmed"),
    });
  }

  // ---- change client ----
  const changeQuery = (state.ccQ || "").trim();
  const lowerQuery = changeQuery.toLowerCase();
  const everyone = CLIENTS.concat(state.extraClients);
  const applyClient = (
    clientId: string | null,
    patch: Partial<StudioBooking> = {},
  ) => {
    setState({ bkOut: true });
    window.setTimeout(
      () =>
        setState(({ bookings }) => ({
          bkOut: false,
          bkStep: "view",
          bkBack: true,
          confirm: null,
          bookings: bookings.map((item) =>
            item.id === booking.id
              ? { ...item, client: clientId, ...patch }
              : item,
          ),
        })),
      200,
    );
    window.setTimeout(() => setState({ bkBack: false }), 900);
  };
  const setClient = (clientId: string | null) => {
    const other = everyone.find(({ id }) => id === clientId);
    const name = clientId
      ? other
        ? (other.name.split(" ")[0] ?? "")
        : "the client"
      : "a walk-in";
    if (!clientId || state.policy.mode === "none") {
      applyClient(clientId, {
        protect: "none",
        paid: "none",
        status: "confirmed",
      });
      return;
    }
    const sentAt = Date.now();
    setState({
      confirm: {
        title: "Ask " + name + " for booking protection?",
        yesLabel: "Send a link",
        noLabel: "No protection",
        body:
          "Protection was agreed with the previous client, so it does not carry over. Sending a link asks " +
          name +
          " for " +
          getProtNoun(state) +
          "; the booking waits 48 hrs to be confirmed.",
        yes: () =>
          applyClient(clientId, {
            protect: "link",
            paid: "link",
            status: "awaiting",
            protMode: state.policy.mode,
            resends: 0,
            linkSentAt: sentAt,
            expiresAt: getProtExpiry(sentAt, booking.off, booking.time),
          }),
        no: () =>
          applyClient(clientId, {
            protect: "none",
            paid: "none",
            status: "confirmed",
          }),
      },
    });
  };
  context.memo.ccSet = setClient;

  // ---- reschedule ----
  const slots = getSlots(
    state,
    state.rsDay,
    booking.durMin,
    getBookingBuffer(state, booking.svc),
    booking.id,
  );
  const rescheduleConflicts = getConflicts(
    state,
    state.rsDay,
    state.rsTime,
    booking.durMin,
    booking.id,
  );
  const rescheduleDate = new Date();
  rescheduleDate.setDate(rescheduleDate.getDate() + (state.rsDay || 0));
  const rescheduleHours = state.hours[(rescheduleDate.getDay() + 6) % 7] ?? {
    d: "",
    on: true,
    s: "09:00",
    e: "18:00",
  };
  const customTime = state.rsTime || "";
  const isCustom = !!state.rsCustom;
  const isInRange =
    !customTime || !rescheduleHours.on
      ? false
      : customTime >= rescheduleHours.s && customTime < rescheduleHours.e;
  const isOutside =
    isCustom && !!customTime && (!rescheduleHours.on || !isInRange);
  const canMove = state.rsDay != null && !!state.rsTime;
  const reschedule = () => {
    if (!canMove) return;
    const previous = state.bookings;
    setState({
      bookings: state.bookings.map((item) =>
        item.id === state.sheetBId
          ? {
              ...item,
              off: state.rsDay ?? 0,
              time: state.rsTime ?? item.time,
              pending: false,
            }
          : item,
      ),
      dayIdx: state.rsDay ?? 0,
      bview: "cal",
    });
    toastMsg(
      "Moved to " +
        dayInfo(state.rsDay ?? 0).label +
        ", " +
        state.rsTime +
        ". " +
        booking.firstName +
        " notified",
      () => setState({ bookings: previous }),
    );
    closeSheet();
  };
  context.memo.reschedFn = reschedule;

  // ---- cancel ----
  const cancel = () => {
    const who = state.cxWho === "me" ? "you" : booking.firstName;
    const notice =
      hoursToStart < 48
        ? Math.max(1, Math.round(hoursToStart)) + " hours before"
        : Math.round(hoursToStart / 24) + " days before";
    const isNothingPaid =
      state.policy.mode === "card" || state.policy.mode === "none";
    finish(
      {
        status: "Cancelled",
        feeKept: isFeeKept,
        feePending: isFeeKept,
        feeLabel: lateFee.label,
        meta: isFeeKept
          ? "Fee pending"
          : isNothingPaid
            ? "No charge"
            : "Refunded",
        note:
          "Cancelled by " +
          who +
          " " +
          notice +
          "." +
          (isFeeKept
            ? " " + lateFee.sub + "."
            : isNothingPaid
              ? ""
              : " Refunded in full.") +
          (state.cxReason.trim() ? " " + state.cxReason.trim() : ""),
      },
      isFeeKept
        ? "Cancelled. " + lateFee.label + " fee pending"
        : isNothingPaid
          ? "Booking cancelled"
          : "Cancelled. " + booking.firstName + " refunded in full",
    );
    closeSheet();
  };
  context.memo.cancelFn = cancel;

  return {
    booking,
    raw,
    patchBooking,
    finish,
    sens: (() => {
      const bookingRaw =
        state.sheetBId != null
          ? state.bookings.find(({ id }) => id === state.sheetBId)
          : null;
      const client = bookingRaw?.client
        ? getClient(state, bookingRaw.client)
        : null;
      return client?.sens || "";
    })(),
    isView: state.bkStep === "view",
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
      ].includes(state.bkStep) &&
      !(!isWide && (state.bkStep === "checkout" || state.bkStep === "noshow")),
    // client row: hover reveals change / walk-in unless a payment locks the client
    isClientLocked:
      booking.paidKind === "deposit" ||
      booking.paidKind === "full" ||
      (booking.protect === "link" &&
        booking.protMode === "card" &&
        !booking.awaiting),
    openClient: () => {
      if (!booking.client) {
        setState({ bkStep: "changeclient", ccQ: "" });
        return;
      }
      openSheet("cliView", {
        cliSel: booking.client,
        cliApptTab: "up",
        cFromB: booking.id,
      });
    },
    changeClient: () => setState({ bkStep: "changeclient", ccQ: "" }),
    clearClient: () =>
      setState({
        confirm: {
          title: "Make this a walk-in?",
          yesLabel: "Make walk-in",
          noLabel: "Keep client",
          body:
            "The appointment stays in your calendar with no client attached. " +
            booking.firstName +
            " will not get reminders for it.",
          yes: () => {
            setState(({ bookings }) => ({
              confirm: null,
              bookings: bookings.map((item) =>
                item.id === booking.id ? { ...item, client: null } : item,
              ),
            }));
            toastMsg("Now a walk-in");
          },
        },
      }),
    statusItems: items.map((item) => ({
      ...item,
      run: () => {
        if (item.off) return;
        setState({ stMenu: false });
        item.run();
      },
    })),
    // payment
    payLines: [
      {
        key: "svc",
        label: booking.svc,
        value: "£" + Math.max(0, booking.price - addonSum),
      },
    ].concat(
      addonLines.map(({ key, label, value }) => ({ key, label, value })),
    ),
    payReceived: received,
    payFeeLabel: "£" + fee.toFixed(2),
    feeWho: booking.client ? booking.firstName : "the client",
    payRowLabel: booking.dueAmt > 0 ? "To pay" : "Paid",
    // footer
    canCheckout:
      !isClosed &&
      !booking.awaiting &&
      !booking.autoX &&
      (booking.st === "arrived" ||
        booking.off < 0 ||
        (booking.off === 0 && nowMin >= booking.startMin)),
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
              d: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7",
              run: () => {
                copyText("tiwaras.house/manage/" + booking.id);
                toastMsg("Guest link copied for " + booking.firstName);
              },
            },
          ]
        : [];
      openActs({
        title: booking.clientName || "Walk-in",
        sub:
          booking.svc +
          " · " +
          booking.dayShort +
          " " +
          (booking.timeRange || ""),
        anchor,
        items: guest.concat([
          {
            label: "Reschedule",
            d: "M3 7v6h6M21 17a9 9 0 0 0-15-6.7L3 13",
            run: () =>
              setState({
                bkStep: "resched",
                rsDay: null,
                rsTime: null,
                rsCustom: false,
                stMenu: false,
              }),
          },
          {
            label: "Cancel",
            d: "M18 6 6 18M6 6l12 12",
            danger: true,
            run: () =>
              setState({
                bkStep: "cancel",
                cxWho: "client",
                cxFee: true,
                cxReason: "",
                stMenu: false,
              }),
          },
          {
            label: "No-show",
            d: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
            danger: true,
            run: () => {
              if (booking.canNoShow)
                setState({
                  bkStep: "noshow",
                  nsCharge: "deposit",
                  stMenu: false,
                });
              else
                toastMsg(
                  "No-show can be marked once the appointment has started",
                );
            },
          },
        ]),
      });
    },
    bookAgain: () => rebookFrom(booking),
    goCheckout: () =>
      setState({ bkStep: "checkout", coMethod: null, stMenu: false }),
    openPayment: () => setState({ bkStep: "payment", stMenu: false }),
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
                expiresAt: getProtExpiry(sentAt, booking.off, booking.time),
              }
            : item,
        ),
      });
      toastMsg(
        "Link resent to " +
          booking.firstName +
          " · " +
          (2 - count) +
          " of 2 left",
      );
    },
    copyPaymentLink: () => {
      copyText("tiwaras.house/pay/" + booking.id);
      toastMsg("Payment link copied");
    },
    // location (mobile stylists)
    toggleLocation: () => {
      if (!state.bkLocOn) {
        setState({ bkLocOn: true, bkAddrDraft: booking.addr });
        return;
      }
      const address = state.bkAddrDraft.trim();
      setState({
        bkLocOn: false,
        clientAddrs: { ...state.clientAddrs, [booking.client ?? ""]: address },
      });
      patchBooking({ addr: address });
      toastMsg(
        address
          ? "Address saved to " + booking.firstName + "’s profile"
          : "Address removed",
      );
    },
    // the stylist's own note
    saveNote: () => {
      patchBooking({ stylistNote: state.bkNoteDraft.trim() });
      setState({ bkNoteOn: false });
      toastMsg(state.bkNoteDraft.trim() ? "Note saved" : "Note removed");
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
          (client.area ? " · " + client.area : ""),
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
      const id = "c" + Date.now();
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
      toastMsg(changeQuery + " added");
    },
    makeWalkIn: () => setClient(null),
    // reschedule
    rescheduleDays: Array.from({ length: 8 }, (_, offset) => {
      const info = dayInfo(offset);
      return {
        key: offset,
        dow: info.dow,
        num: info.num,
        isOn: state.rsDay === offset,
        pick: () => setState({ rsDay: offset }),
      };
    }),
    rescheduleTimes: slots.map((time) => ({
      key: time,
      label: time,
      isOn: state.rsTime === time,
      pick: () => setState({ rsTime: time, rsCustom: false }),
    })),
    hasNoSlots: state.rsDay != null && slots.length === 0,
    noSlotsText: getWorkingHours(state, state.rsDay || 0).on
      ? "No free 30-minute starts left this day. Use a custom time if you want to squeeze it in."
      : "You’re closed this day. Use a custom time to book it anyway.",
    isCustom,
    toggleCustom: () =>
      setState({
        rsCustom: !isCustom,
        rsTime: isCustom
          ? null
          : SLOT_TIMES.includes(state.rsTime ?? "")
            ? null
            : state.rsTime,
      }),
    customTime,
    onCustomTime: (event: ChangeEvent<HTMLInputElement>) =>
      setState({ rsTime: event.target.value || null }),
    customHint: !rescheduleHours.on
      ? "You’re closed this day. You can still book it."
      : isOutside
        ? "Outside your hours (" +
          rescheduleHours.s +
          "–" +
          rescheduleHours.e +
          "). You can still book it."
        : "Any time between " + rescheduleHours.s + " and " + rescheduleHours.e,
    isCustomWarn: isOutside || !rescheduleHours.on,
    rescheduleWarning: rescheduleConflicts.length
      ? "Overlaps " +
        rescheduleConflicts
          .map(({ name, range }) => name + " (" + range + ")")
          .join(", ") +
        ". You can still move it."
      : "",
    canMove,
    reschedule,
    // cancel
    cancelWhoOptions: [
      { id: "client", label: booking.firstName + " is cancelling" },
      { id: "me", label: "I am cancelling" },
    ],
    cancelBody:
      state.cxWho === "me"
        ? "Cancelling refunds " +
          booking.firstName +
          " in full, including the booking fee, and frees the slot for online booking."
        : isLate
          ? lateFee.amt > 0
            ? booking.firstName +
              " is cancelling inside your " +
              windowText +
              " window, so your policy charges a " +
              lateFee.label +
              " late cancellation fee (" +
              lateFee.sub +
              "). The slot opens up."
            : booking.firstName +
              " is cancelling inside your " +
              windowText +
              " window. Your policy has no late cancellation fee: " +
              lateFee.refund.toLowerCase() +
              ". The slot opens up."
          : booking.firstName +
            " is cancelling outside your " +
            windowText +
            " window, so there is no fee. " +
            lateFee.refund +
            ". The slot opens up for online booking.",
    isFeeShown: state.cxWho === "client" && isLate && lateFee.amt > 0,
    feeLabel: "Charge the " + (lateFee.label || "") + " late cancellation fee",
    cancel,
    // no-show
    noShowOptions: (noShowFee.amt > 0
      ? [
          {
            id: "fee",
            label: "Charge the " + noShowFee.label + " no-show fee",
            sub: noShowFee.sub ?? "",
          },
          { id: "none", label: "No charge", sub: noShowFee.refund },
        ]
      : [
          {
            id: "none",
            label: "No charge",
            sub:
              "Your payment policy has no no-show fee. " +
              noShowFee.refund +
              ".",
          },
        ]
    ).map((option) => ({
      ...option,
      isOn: noShowChoice === option.id,
      pick: () => setState({ nsCharge: option.id }),
    })),
    confirmNoShow: () => {
      const isCharging = noShowChoice === "fee";
      finish(
        {
          status: "No show",
          meta: isCharging ? "Fee pending" : "No charge",
          feeKept: isCharging,
          feePending: isCharging,
          feeLabel: noShowFee.label,
          note:
            "Client did not attend." +
            (isCharging
              ? " " + noShowFee.sub + "."
              : " " + noShowFee.refund + "."),
        },
        "Marked as no-show",
      );
      closeSheet();
    },
    backToView: () => {
      const to =
        state.bkStep === "changesvc" || state.bkStep === "addaddon"
          ? "editsvc"
          : "view";
      setState({ bkOut: true });
      window.setTimeout(
        () => setState({ bkOut: false, bkBack: to === "view", bkStep: to }),
        200,
      );
      if (to === "view")
        window.setTimeout(() => setState({ bkBack: false }), 700);
    },
    // done
    doneTitle: "Done, " + booking.firstName + " is all set",
    doneBody:
      state.coMethod === "link"
        ? "A payment link for £" +
          due +
          " is on its way to " +
          booking.firstName +
          ". The booking is in Past."
        : "Marked completed and moved to Past.",
    rebook: () => rebookFrom(booking),
    // the embedded checkout's result
    onCheckoutComplete: (result: CheckoutRecord, action: string) => {
      const label =
        result.method === "link"
          ? "Link sent · £" + result.charged + " due"
          : result.method === "record"
            ? "Paid · " +
              ((
                {
                  cash: "Cash",
                  bank: "Bank transfer",
                  reader: "Card reader",
                } as Record<string, string>
              )[result.via] || "Recorded")
            : result.method === "card"
              ? "Paid · Card"
              : result.refundAuto > 0
                ? "Refunded £" + result.refundAuto
                : "Paid";
      finish(
        { status: "Completed", meta: label, price: result.total, ck: result },
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
