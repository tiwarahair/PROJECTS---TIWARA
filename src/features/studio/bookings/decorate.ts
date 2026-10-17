// A booking dressed for display: status, payment, colours and labels.
import { getTaxonomy } from "../services/actions";
import {
  dayInfo,
  durationToMinutes,
  formatDateTime,
  getAvatarSrc,
  timeRange,
  timeToMinutes,
} from "../core/format";
import {
  getClient,
  getProtectionTotal,
  getServiceDuration,
  getTileTone,
  isOngoing,
} from "../core/model";
import type { StudioBooking, StudioClient, StudioState } from "../core/types";
import { formatMoney } from "../../../utils/money";

const INK = "#1a1714";
const YELLOW = "var(--brand-yellow,#f2c94c)";
const YELLOW_BACKGROUND = "rgba(223,207,62,.10)";
const YELLOW_LINE = "rgba(223,207,62,.40)";
const YELLOW_INK = "#6b5a10";

interface Tone {
  background: string;
  border: string;
  color: string;
}

interface StatusFlags {
  awaiting: boolean;
  autoX: boolean;
  ongoing: boolean;
  status: string;
}

const QUIET_TONE: Tone = {
  background: "var(--quiet)",
  border: "var(--border-subtle)",
  color: "var(--text-secondary)",
};

const WAITING_TONE: Tone = {
  background: YELLOW_BACKGROUND,
  border: YELLOW_LINE,
  color: YELLOW_INK,
};

const ONGOING_TONE: Tone = { background: YELLOW, border: YELLOW, color: INK };

const ARRIVED_TONE: Tone = {
  background: INK,
  border: INK,
  color: "var(--neutral-100)",
};

const CONFIRMED_TONE: Tone = {
  background: "var(--accent-wash)",
  border: "var(--accent-line)",
  color: "var(--accent-900)",
};

const UNPAID_TONE: Tone = {
  background: "rgba(181,84,31,.1)",
  border: "rgba(181,84,31,.3)",
  color: "var(--accent-500)",
};

const FAILED_TONE: Tone = {
  background: "var(--accent-wash)",
  border: "var(--accent-line)",
  color: "var(--accent-700)",
};

const PAID_TONE: Tone = {
  background: "rgba(46,125,79,.1)",
  border: "rgba(46,125,79,.25)",
  color: "#2e7d4f",
};

const PAID_BADGES: Record<string, string> = {
  none: "Nothing paid",
  failed: "Payment failed",
  link: "Link sent",
};

const PROTECTION_WORDS: Record<string, string> = {
  card: "Card request",
  full: "Payment request",
};

// Status wins over payment: awaiting, auto-cancelled, ongoing and arrived each have a fixed tone.
const getStatusTone = (
  { awaiting, autoX, ongoing, status }: StatusFlags,
  fallback: Tone,
): Tone => {
  if (awaiting) return WAITING_TONE;

  if (autoX) return QUIET_TONE;

  if (ongoing) return ONGOING_TONE;

  if (status === "arrived") return ARRIVED_TONE;

  return fallback;
};

const getPaidTone = (paid: string): Tone => {
  if (paid === "none" || paid === "link") return UNPAID_TONE;

  if (paid === "failed") return FAILED_TONE;

  return CONFIRMED_TONE;
};

const getPayTone = (isPaid: boolean, paid: string): Tone => {
  if (isPaid) return PAID_TONE;

  if (paid === "failed") return FAILED_TONE;

  return UNPAID_TONE;
};

const getBadge = (
  { awaiting, autoX, ongoing, status }: StatusFlags,
  paid: string,
  msLeft: number,
  leftShort: string,
) => {
  if (ongoing) return "In progress";

  if (awaiting)
    return msLeft > 0 ? `Auto-cancels in ${leftShort}` : "Auto-cancels now";

  if (autoX) return "Auto-cancelled";

  if (status === "arrived") return "Arrived";

  return PAID_BADGES[paid] ?? "";
};

const getStatusLabel = (
  { awaiting, autoX, ongoing, status }: StatusFlags,
  autoDone: boolean | undefined,
) => {
  if (awaiting) return "Awaiting confirmation";

  if (autoX) return "Auto-cancelled";

  if (autoDone) return "Completed · Unpaid";

  if (ongoing) return "In progress";

  if (status === "arrived") return "Arrived";

  return "Confirmed";
};

const getPayLabel = (paid: string, protectionMode: string | undefined) => {
  if (paid === "full") return "Paid in full";

  if (paid === "deposit") return "Deposit paid";

  if (paid === "link")
    return protectionMode === "card"
      ? "Card request sent"
      : "Payment link sent";

  if (paid === "failed") return "Payment failed";

  return "Nothing paid yet";
};

const getSinceLabel = ({ since, area }: StudioClient) => {
  if (since) return ` · client since ${since}`;

  if (area) return ` · ${area}`;

  return "";
};

export const decorateBooking = (
  state: StudioState,
  booking: StudioBooking,
  index: number,
  onOpen: () => void,
) => {
  const client = getClient(state, booking.client);
  const day = dayInfo(booking.dayOffset);
  const status = booking.status || "confirmed";
  const paid = booking.paid || "deposit";

  const duration =
    booking.duration || getServiceDuration(state, booking.service);

  const startMinutes = timeToMinutes(booking.time);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const ongoing = isOngoing(booking);
  const isPre = status === "confirmed";

  const canArrive =
    isPre && booking.dayOffset === 0 && startMinutes - nowMinutes <= 60;

  const graceMinutes = booking.grace ?? (state.policy.grace || 0);
  const graceEnd = startMinutes + graceMinutes;
  const canNoShow = isPre && booking.dayOffset === 0 && nowMinutes >= graceEnd;
  const depositAmount = Math.round(booking.price * state.policy.deposit) / 100;

  const paidAmounts: Record<string, number> = {
    full: booking.price,
    deposit: depositAmount,
  };

  const paidAmount = paidAmounts[paid] ?? 0;
  const due = Math.max(0, booking.price - paidAmount);
  const awaiting = status === "awaiting";
  const autoX = status === "autocancelled";

  const msLeft = booking.expiresAt
    ? Math.max(0, booking.expiresAt - Date.now())
    : 0;

  const leftShort =
    msLeft >= 3600000
      ? `${Math.round(msLeft / 3600000)} h`
      : `${Math.max(1, Math.round(msLeft / 60000))} min`;

  const flags: StatusFlags = { awaiting, autoX, ongoing, status };
  const badge = getBadge(flags, paid, msLeft, leftShort);
  const tone = getStatusTone(flags, getPaidTone(paid));
  const statusTone = getStatusTone(flags, CONFIRMED_TONE);
  const payTone = getPayTone(paid === "full" || paid === "deposit", paid);
  const tileTone = getTileTone(state, booking.service);
  const address = booking.address || client.address || "";
  const range = timeRange(booking.time, duration);
  const resends = booking.resends || 0;
  const phone = (client.phone || "").replace(/\s/g, "");
  const service = state.services.find(({ name }) => name === booking.service);
  const group = service ? getTaxonomy(service.taxonomyId) : null;

  return {
    ...booking,
    status,
    paid,
    canArrive,
    canNoShow,
    startMinutes,
    graceMinutes,
    graceEnd,
    durationMinutes: durationToMinutes(duration),
    depositAmount,
    paidAmount,
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
    mailHref: `mailto:${client.email || ""}`,
    telHref: `tel:${phone}`,
    smsHref: `sms:${phone}`,
    tileBackground: tileTone.background,
    tileBar: tileTone.bar,
    tileLine: awaiting ? "rgba(201,181,40,.55)" : "transparent",
    tileBorder: awaiting ? "dashed" : "solid",
    tileText: tileTone.text,
    tileMeta: tileTone.meta,
    visitLabel:
      (client.visits || 0) + (client.visits === 1 ? " visit" : " visits"),
    sinceLabel: getSinceLabel(client),
    categoryLabel: (group ? group.name : "Service").toUpperCase(),
    timeRange: range,
    endTime: range === booking.time ? "" : `–${range.split("–")[1] ?? ""}`,
    durationLabel: duration,
    ongoing,
    badge,
    badgeBackground: tone.background,
    badgeBorder: tone.border,
    badgeColor: tone.color,
    badgeDot: ongoing,
    subtitle: "",
    subtitleColor: "var(--accent-500)",
    statusLabel: getStatusLabel(flags, booking.autoDone),
    statusBackground: statusTone.background,
    statusBorder: statusTone.border,
    statusColor: statusTone.color,
    statusDot: ongoing,
    awaiting,
    autoX,
    noProtect: booking.protect === "none",
    protectionIsCard: booking.protectionMode === "card",
    protectionIsFull: booking.protectionMode === "full",
    protectionWord:
      PROTECTION_WORDS[booking.protectionMode ?? ""] ?? "Deposit request",
    linkSentLabel: booking.linkSentAt ? formatDateTime(booking.linkSentAt) : "",
    expiryLabel: booking.expiresAt ? formatDateTime(booking.expiresAt) : "",
    hoursLeft: booking.expiresAt ? `${leftShort} left` : "",
    resendsLeft: Math.max(0, 2 - resends),
    resendLabel: `Resend by email/SMS (${Math.max(0, 2 - resends)} of 2 left)`,
    canResend: resends < 2,
    resendOpacity: resends < 2 ? "1" : ".45",
    protectionAmountLabel: formatMoney(
      getProtectionTotal(state, booking.price),
      { pence: "always" },
    ),
    payLabel: getPayLabel(paid, booking.protectionMode),
    payBackground: payTone.background,
    payBorder: payTone.border,
    payColor: payTone.color,
    paidKind: paid,
    dueAmount: due,
    visits: client.visits || 0,
    ended:
      booking.dayOffset < 0 ||
      (booking.dayOffset === 0 &&
        startMinutes + durationToMinutes(duration) <= nowMinutes),
    unpaidFlag:
      !!booking.checkoutUnpaid ||
      ((status === "confirmed" || status === "arrived") &&
        !awaiting &&
        (booking.dayOffset < 0 ||
          (booking.dayOffset === 0 &&
            nowMinutes - (startMinutes + durationToMinutes(duration)) >= 60))),
    paidLabel: `£${paidAmount}`,
    dueLabel: `£${due}`,
    dueColor: due > 0 ? "var(--text-primary)" : "var(--text-secondary)",
    addressLabel: address || "No address yet",
    addressColor: address ? "var(--text-primary)" : "var(--text-secondary)",
    address,
    hasStylistNote: !!booking.stylistNote,
    noStylistNote: !booking.stylistNote,
    stylistNote: booking.stylistNote || "",
    priceLabel: `£${booking.price}`,
    dayShort: day.short,
    dayLabel: day.label,
    deposit: formatMoney(depositAmount, { pence: "always" }),
    delay: `${(index * 0.05).toFixed(2)}s`,
    stripe: tileTone.bar,
    open: onOpen,
  };
};

export type DecoratedBooking = ReturnType<typeof decorateBooking>;

/** Every booking, sorted by day then time and decorated. */
export const getDecoratedBookings = (
  state: StudioState,
  onOpen: (booking: StudioBooking) => void,
): DecoratedBooking[] =>
  state.bookings
    .slice()
    .sort(
      (first, second) =>
        first.dayOffset - second.dayOffset ||
        first.time.localeCompare(second.time),
    )
    .map((booking, index) =>
      decorateBooking(state, booking, index, () => onOpen(booking)),
    );
