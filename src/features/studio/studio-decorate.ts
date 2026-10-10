// A booking dressed for display: status, payment, colours and labels (prototype renderVals `decorate`).
import { getTaxonomy } from "./studio-service-actions";
import {
  dayInfo,
  durToMin,
  fmtDT,
  getAvatarSrc,
  timeRange,
  toMin,
} from "./studio-format";
import {
  getClient,
  getProtTotal,
  getServiceDur,
  getTileTone,
  isOngoing,
} from "./studio-model";
import type { StudioBooking, StudioState } from "./studio-types";

const INK = "#1a1714";
const YELLOW = "var(--brand-yellow,#f2c94c)";
const YELLOW_BG = "rgba(223,207,62,.10)";
const YELLOW_LINE = "rgba(223,207,62,.40)";
const YELLOW_INK = "#6b5a10";

interface Tone {
  bg: string;
  border: string;
  color: string;
}

export const decorateBooking = (
  state: StudioState,
  booking: StudioBooking,
  index: number,
  onOpen: () => void,
) => {
  const client = getClient(state, booking.client);
  const day = dayInfo(booking.off);
  const status = booking.status || "confirmed";
  const paid = booking.paid || "deposit";
  const duration = booking.dur || getServiceDur(state, booking.svc);
  const startMin = toMin(booking.time);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const ongoing = isOngoing(booking);
  const isPre = status === "confirmed";
  const canArrive = isPre && booking.off === 0 && startMin - nowMin <= 60;
  const graceEnd = startMin + (state.policy.grace || 0);
  const canNoShow = isPre && booking.off === 0 && nowMin >= graceEnd;
  const depAmt = Math.round(booking.price * state.policy.deposit) / 100;
  const paidAmt =
    paid === "full" ? booking.price : paid === "deposit" ? depAmt : 0;
  const due = Math.max(0, booking.price - paidAmt);
  const awaiting = status === "awaiting";
  const autoX = status === "autocancelled";
  const msLeft = booking.expiresAt
    ? Math.max(0, booking.expiresAt - Date.now())
    : 0;
  const leftShort =
    msLeft >= 3600000
      ? Math.round(msLeft / 3600000) + " h"
      : Math.max(1, Math.round(msLeft / 60000)) + " min";
  const badge = ongoing
    ? "In progress"
    : awaiting
      ? msLeft > 0
        ? "Auto-cancels in " + leftShort
        : "Auto-cancels now"
      : autoX
        ? "Auto-cancelled"
        : status === "arrived"
          ? "Arrived"
          : paid === "none"
            ? "Nothing paid"
            : paid === "failed"
              ? "Payment failed"
              : paid === "link"
                ? "Link sent"
                : "";
  const quiet: Tone = {
    bg: "var(--quiet)",
    border: "var(--border-subtle)",
    color: "var(--text-secondary)",
  };
  const waiting: Tone = {
    bg: YELLOW_BG,
    border: YELLOW_LINE,
    color: YELLOW_INK,
  };
  const tone: Tone = awaiting
    ? waiting
    : autoX
      ? quiet
      : ongoing
        ? { bg: YELLOW, border: YELLOW, color: INK }
        : status === "arrived"
          ? { bg: INK, border: INK, color: "var(--neutral-100)" }
          : paid === "none" || paid === "link"
            ? {
                bg: "rgba(181,84,31,.1)",
                border: "rgba(181,84,31,.3)",
                color: "var(--accent-500)",
              }
            : paid === "failed"
              ? {
                  bg: "var(--accent-wash)",
                  border: "var(--accent-line)",
                  color: "var(--accent-700)",
                }
              : {
                  bg: "var(--accent-wash)",
                  border: "var(--accent-line)",
                  color: "var(--accent-900)",
                };
  const statusTone: Tone = awaiting
    ? waiting
    : autoX
      ? quiet
      : ongoing
        ? { bg: YELLOW, border: YELLOW, color: INK }
        : status === "arrived"
          ? { bg: INK, border: INK, color: "var(--neutral-100)" }
          : {
              bg: "var(--accent-wash)",
              border: "var(--accent-line)",
              color: "var(--accent-900)",
            };
  const tileTone = getTileTone(state, booking.svc);
  const address = booking.addr || client.addr || "";
  const range = timeRange(booking.time, duration);
  const resends = booking.resends || 0;
  const isPaid = paid === "full" || paid === "deposit";
  const phone = (client.phone || "").replace(/\s/g, "");
  const service = state.services.find(({ name }) => name === booking.svc);
  const group = service ? getTaxonomy(service.cat) : null;
  return {
    ...booking,
    st: status,
    paid,
    canArrive,
    canNoShow,
    startMin,
    graceEnd,
    durMin: durToMin(duration),
    depAmt,
    paidAmt,
    due,
    clientName: client.name,
    firstName: client.name.split(" ")[0] ?? "",
    img: client.img,
    // a 1px transparent gif while the hole is unresolved, so nothing 404s mid-stream
    imgSrc: getAvatarSrc(client),
    phone: client.phone || "",
    hasPhone: !!client.phone,
    hasEmail: !!client.email,
    hasContact: !!(client.phone || client.email),
    mailHref: "mailto:" + (client.email || ""),
    telHref: "tel:" + phone,
    smsHref: "sms:" + phone,
    tileBg: tileTone.bg,
    tileBar: tileTone.bar,
    tileLine: awaiting ? "rgba(201,181,40,.55)" : "transparent",
    tileBorder: awaiting ? "dashed" : "solid",
    tileText: tileTone.text,
    tileMeta: tileTone.meta,
    visitLabel:
      (client.visits || 0) + (client.visits === 1 ? " visit" : " visits"),
    sinceLabel: client.since
      ? " · client since " + client.since
      : client.area
        ? " · " + client.area
        : "",
    catLabel: (group ? group.name : "Service").toUpperCase(),
    timeRange: range,
    endTime: range === booking.time ? "" : "–" + (range.split("–")[1] ?? ""),
    durLabel: duration,
    ongoing,
    badge,
    badgeBg: tone.bg,
    badgeBorder: tone.border,
    badgeColor: tone.color,
    badgeDot: ongoing,
    sub: "",
    subColor: "var(--accent-500)",
    stLabel: awaiting
      ? "Awaiting confirmation"
      : autoX
        ? "Auto-cancelled"
        : booking.autoDone
          ? "Completed · Unpaid"
          : ongoing
            ? "In progress"
            : status === "arrived"
              ? "Arrived"
              : "Confirmed",
    stBg: statusTone.bg,
    stBorder: statusTone.border,
    stColor: statusTone.color,
    stDot: ongoing,
    awaiting,
    autoX,
    noProtect: booking.protect === "none",
    protIsCard: booking.protMode === "card",
    protIsFull: booking.protMode === "full",
    protWord:
      booking.protMode === "card"
        ? "Card request"
        : booking.protMode === "full"
          ? "Payment request"
          : "Deposit request",
    linkSentLabel: booking.linkSentAt ? fmtDT(booking.linkSentAt) : "",
    expiryLabel: booking.expiresAt ? fmtDT(booking.expiresAt) : "",
    hoursLeft: booking.expiresAt ? leftShort + " left" : "",
    resendsLeft: Math.max(0, 2 - resends),
    resendLabel:
      "Resend by email/SMS (" + Math.max(0, 2 - resends) + " of 2 left)",
    canResend: resends < 2,
    resendOp: resends < 2 ? "1" : ".45",
    protAmtLabel: "£" + getProtTotal(state, booking.price).toFixed(2),
    payLabel:
      paid === "full"
        ? "Paid in full"
        : paid === "deposit"
          ? "Deposit paid"
          : paid === "link"
            ? booking.protMode === "card"
              ? "Card request sent"
              : "Payment link sent"
            : paid === "failed"
              ? "Payment failed"
              : "Nothing paid yet",
    payBg: isPaid
      ? "rgba(46,125,79,.1)"
      : paid === "failed"
        ? "var(--accent-wash)"
        : "rgba(181,84,31,.1)",
    payBorder: isPaid
      ? "rgba(46,125,79,.25)"
      : paid === "failed"
        ? "var(--accent-line)"
        : "rgba(181,84,31,.3)",
    payColor: isPaid
      ? "#2e7d4f"
      : paid === "failed"
        ? "var(--accent-700)"
        : "var(--accent-500)",
    paidKind: paid,
    dueAmt: due,
    visits: client.visits || 0,
    ended:
      booking.off < 0 ||
      (booking.off === 0 && startMin + durToMin(duration) <= nowMin),
    unpaidFlag:
      !!booking.ckUnpaid ||
      ((status === "confirmed" || status === "arrived") &&
        !awaiting &&
        (booking.off < 0 ||
          (booking.off === 0 &&
            nowMin - (startMin + durToMin(duration)) >= 60))),
    paidLabel: "£" + paidAmt,
    dueLabel: "£" + due,
    dueColor: due > 0 ? "var(--text-primary)" : "var(--text-secondary)",
    addrLabel: address || "No address yet",
    addrColor: address ? "var(--text-primary)" : "var(--text-secondary)",
    addr: address,
    hasStNote: !!booking.stylistNote,
    noStNote: !booking.stylistNote,
    stylistNote: booking.stylistNote || "",
    priceLabel: "£" + booking.price,
    dayShort: day.short,
    dayLabel: day.label,
    deposit: "£" + depAmt.toFixed(2),
    dly: (index * 0.05).toFixed(2) + "s",
    stripe: tileTone.bar,
    open: onOpen,
  };
};

export type DecoratedBooking = ReturnType<typeof decorateBooking>;

/** Every booking, sorted by day then time and decorated (prototype `upcoming`); empty for a new account. */
export const getDecoratedBookings = (
  state: StudioState,
  isNew: boolean,
  onOpen: (booking: StudioBooking) => void,
): DecoratedBooking[] =>
  isNew
    ? []
    : state.bookings
        .slice()
        .sort(
          (first, second) =>
            first.off - second.off || first.time.localeCompare(second.time),
        )
        .map((booking, index) =>
          decorateBooking(state, booking, index, () => onOpen(booking)),
        );
