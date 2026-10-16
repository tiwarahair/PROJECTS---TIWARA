// Account derived values: price, fee, dates, address line, booking details, validation, .ics and download.
import { stylists } from "../../data";
import type { SavedAddress } from "../../types/address";
import type { Stylist } from "../../types/stylist";
import { getAddressOneLine } from "../../utils/address";
import { bookingFee } from "../../utils/pricing";
import { findService } from "../../utils/services";
import type { AccountBooking, Profile, SavedCard } from "./data";
import { formatMoney } from "../../utils/money";
import { formatWeekdayDate, formatClockTime } from "../../utils/dates";
import { getCalendarFile } from "../../utils/calendar-file";

const DAY_MS = 864e5;

type StylistLike = Pick<
  Stylist,
  "id" | "name" | "area" | "addressFull" | "businessType" | "cover"
> &
  Partial<Stylist>;

/** The stylist, or a placeholder. */
export const getAccountStylist = (id: string): StylistLike =>
  stylists.find((stylist) => stylist.id === id) ?? {
    id,
    name: "Your stylist",
    area: "",
    addressFull: "",
    businessType: "shop",
    cover: "",
  };

/** The service's current price (else the booking's fallback) plus the customisation extra. */
const getPrice = (booking: AccountBooking): number => {
  let price = booking.fallbackPrice;
  const stylist = getAccountStylist(booking.stylistId);

  const service = stylist.services
    ? findService(stylist as Stylist, booking.service)
    : null;

  if (service && service.price) price = service.price;

  return price + (booking.extra || 0);
};

/** "Wed 14 Oct" or "Wed 14 Oct, 10:30". */
export const formatAccountDate = (time: number, withTime = false): string => {
  const date = new Date(time);

  const day = formatWeekdayDate(date);

  return withTime ? `${day}, ${formatClockTime(date)}` : day;
};

export const getAddressLine = (address: SavedAddress | undefined): string =>
  address ? getAddressOneLine(address) : "";

interface ReceiptLine {
  label: string;
  subtitle: string;
  amount: string;
}

export interface BookingMoney {
  stylist: StylistLike;
  where: string;
  whereShort: string;
  tag: [string, string, string];
  paid: string;
  due: string;
  lines: ReceiptLine[];
  payments: { label: string; amount: string }[];
  total: number;
}

const STATUS_TAGS: Record<AccountBooking["status"], [string, string, string]> =
  {
    confirmed: ["Confirmed", "rgba(47,122,77,.12)", "#245c3b"],
    awaiting: ["Awaiting confirmation", "rgba(181,84,31,.13)", "#7d3712"],
    cancelled: ["Cancelled", "var(--fill-quiet)", "var(--neutral-600)"],
    completed: ["Completed", "var(--fill-quiet)", "var(--neutral-700,#3d3730)"],
    noshow: [
      "No-show",
      "var(--accent-wash-strong,rgba(143,17,18,.10))",
      "var(--accent-700)",
    ],
  };

/** Where, status tag, paid / due copy and the receipt for a booking. */
export const getBookingMoney = (
  booking: AccountBooking,
  addresses: SavedAddress[],
  cards: SavedCard[],
): BookingMoney => {
  const stylist = getAccountStylist(booking.stylistId);
  const price = getPrice(booking);
  const fee = bookingFee(price);
  const deposit = Math.round(price * 20) / 100;
  const home = addresses.find(({ isDefault }) => isDefault) ?? addresses[0];
  const isMobile = stylist.businessType === "mobile";
  const homeText = home ? getAddressLine(home) : "your address";

  const where = isMobile
    ? `${stylist.name} will come to ${homeText}`
    : `${stylist.name}, ${stylist.addressFull || stylist.area}`;

  const cardText = (id: string) => {
    const card = cards.find((item) => item.id === id) ?? {
      brand: "Visa",
      last4: "4242",
    };

    return `${card.brand} •••• ${card.last4}`;
  };

  let paid = "";
  let due = "";

  let lines: ReceiptLine[] = [
    {
      label: booking.service,
      subtitle: booking.customisation,
      amount: formatMoney(price),
    },
    { label: "Booking fee", subtitle: "", amount: formatMoney(fee) },
  ];

  let payments: BookingMoney["payments"] = [];
  let total = price + fee;

  switch (booking.status) {
    case "confirmed":
      paid = `${formatMoney(deposit + fee)} paid`;
      due = ` · ${formatMoney(price - deposit)} to pay at your appointment`;
      break;
    case "awaiting":
      paid = `${formatMoney(fee)} booking fee paid`;
      due = ` · ${formatMoney(price)} to pay at your appointment`;
      break;

    case "completed": {
      paid = `${formatMoney(price + fee)} paid`;
      const paidDate = formatAccountDate(booking.at - DAY_MS * 9);
      const paidCard = cardText(booking.card);

      payments = [
        {
          label: `Paid ${paidDate} · ${paidCard}`,
          amount: formatMoney(price + fee),
        },
      ];

      break;
    }

    case "cancelled":
      paid = `Deposit of ${formatMoney(deposit)} refunded`;

      lines = [
        {
          label: `Deposit for ${booking.service}`,
          subtitle: booking.customisation,
          amount: formatMoney(deposit),
        },
        {
          label: "Booking fee",
          subtitle: "Not refundable",
          amount: formatMoney(fee),
        },
      ];

      total = deposit + fee;

      payments = [
        {
          label: `Paid · ${cardText(booking.card)}`,
          amount: formatMoney(deposit + fee),
        },
        {
          label: `Refunded ${formatAccountDate(booking.at - DAY_MS * 3)}`,
          amount: `−${formatMoney(deposit)}`,
        },
      ];

      break;
    case "noshow":
      paid = `${formatMoney(deposit + fee)} paid`;
      due = " · deposit kept as a no-show fee";

      lines = [
        {
          label: `Deposit for ${booking.service}`,
          subtitle: "Kept as a no-show fee",
          amount: formatMoney(deposit),
        },
        { label: "Booking fee", subtitle: "", amount: formatMoney(fee) },
      ];

      total = deposit + fee;

      payments = [
        {
          label: `Paid · ${cardText(booking.card)}`,
          amount: formatMoney(deposit + fee),
        },
      ];

      break;
  }

  return {
    stylist,
    where,
    whereShort: isMobile
      ? "At your address"
      : stylist.areaShort || stylist.area,
    tag: STATUS_TAGS[booking.status],
    paid,
    due,
    lines,
    payments,
    total,
  };
};

export type EditKey = "name" | "email" | "mobile";

/** An .ics calendar event for the booking. */
export const getBookingCalendarFile = (
  booking: AccountBooking,
  { stylist, where }: BookingMoney,
) =>
  getCalendarFile({
    ref: booking.id,
    title: `${booking.service} with ${stylist.name}`,
    startsAt: new Date(booking.at).toISOString(),
    endsAt: new Date(booking.at + booking.minutes * 6e4).toISOString(),
    location: where,
    description: `Booking ${booking.id}`,
  });

interface ReceiptView {
  ref: string;
  date: string;
  stylist: string;
  where: string;
  total: string;
  lines: ReceiptLine[];
  payments: { label: string; amount: string }[];
}

export const getReceiptHtml = (
  receipt: ReceiptView,
  profile: Profile,
): string => {
  const rows =
    receipt.lines
      .map(({ label, subtitle, amount }) => {
        const subtitleLine = subtitle ? `<br><small>${subtitle}</small>` : "";

        return `<tr><td>${label}${subtitleLine}</td><td align="right">${amount}</td></tr>`;
      })
      .join("") +
    receipt.payments
      .map(
        ({ label, amount }) =>
          `<tr><td><small>${label}</small></td><td align="right"><small>${amount}</small></td></tr>`,
      )
      .join("");

  const { ref, date, stylist, where, total } = receipt;
  const { first, last } = profile;

  return `<!doctype html><meta charset="utf-8"><title>Receipt ${ref}</title><body style="font-family:sans-serif;max-width:480px;margin:40px auto;color:#1a1714"><h1>Tiwára’s House receipt</h1><p>${ref} · ${date}<br>${stylist}<br>${where}<br>Billed to ${first} ${last}</p><table width="100%" cellpadding="8">${rows}<tr><th align="left">Total</th><th align="right">${total}</th></tr></table></body>`;
};

/** "4242 4242 4242 4242" (16 digits max). */
export const formatCardDigits = (value: string): string =>
  value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");

/** "MM / YY" */
export const formatCardExpiry = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 4);

  return digits.length > 2
    ? `${digits.slice(0, 2)} / ${digits.slice(2)}`
    : digits;
};
