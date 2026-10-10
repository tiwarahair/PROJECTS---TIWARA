// Account derived values (prototype Account.dc.html: priceOf, fee, fmtDate, addrLine, calc, validate, ics, download).
import { stylists } from "../../data";
import type { SavedAddress } from "../../types/address";
import type { Stylist } from "../../types/stylist";
import { getAddressOneLine } from "../../utils/address";
import { bookingFee, money } from "../../utils/pricing";
import { findService } from "../../utils/services";
import { TAKEN_EMAILS } from "./account-data";
import type { AccountBooking, Profile, SavedCard } from "./account-data";

const DAY_MS = 864e5;

type StylistLike = Pick<
  Stylist,
  "id" | "name" | "area" | "addressFull" | "businessType" | "cover"
> &
  Partial<Stylist>;

/** The stylist, or a placeholder like the prototype's st(). */
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
  let price = booking.fb;
  const stylist = getAccountStylist(booking.sid);
  const service = stylist.services
    ? findService(stylist as Stylist, booking.svc)
    : null;
  if (service && service.price) price = service.price;
  return price + (booking.extra || 0);
};

/** "Wed 14 Oct" or "Wed 14 Oct, 10:30". */
export const formatAccountDate = (time: number, withTime = false): string => {
  const date = new Date(time);
  const day = date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return withTime
    ? day +
        ", " +
        String(date.getHours()).padStart(2, "0") +
        ":" +
        String(date.getMinutes()).padStart(2, "0")
    : day;
};

export const getAddressLine = (address: SavedAddress | undefined): string =>
  address ? getAddressOneLine(address) : "";

export interface ReceiptLine {
  label: string;
  sub: string;
  amt: string;
}

export interface BookingMoney {
  stylist: StylistLike;
  where: string;
  whereShort: string;
  tag: [string, string, string];
  paid: string;
  due: string;
  lines: ReceiptLine[];
  pays: { label: string; amt: string }[];
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

/** Where, status tag, paid / due copy and the receipt for a booking (prototype calc()). */
export const getBookingMoney = (
  booking: AccountBooking,
  addresses: SavedAddress[],
  cards: SavedCard[],
): BookingMoney => {
  const stylist = getAccountStylist(booking.sid);
  const price = getPrice(booking);
  const fee = bookingFee(price);
  const deposit = Math.round(price * 20) / 100;
  const home = addresses.find(({ def }) => def) ?? addresses[0];
  const isMobile = stylist.businessType === "mobile";
  const where = isMobile
    ? stylist.name +
      " will come to " +
      (home ? getAddressLine(home) : "your address")
    : stylist.name + ", " + (stylist.addressFull || stylist.area);
  const cardText = (id: string) => {
    const card = cards.find((item) => item.id === id) ?? {
      brand: "Visa",
      last4: "4242",
    };
    return card.brand + " •••• " + card.last4;
  };
  let paid = "";
  let due = "";
  let lines: ReceiptLine[] = [
    { label: booking.svc, sub: booking.cust, amt: money(price) },
    { label: "Booking fee", sub: "", amt: money(fee) },
  ];
  let pays: BookingMoney["pays"] = [];
  let total = price + fee;
  switch (booking.status) {
    case "confirmed":
      paid = money(deposit + fee) + " paid";
      due = " · " + money(price - deposit) + " to pay at your appointment";
      break;
    case "awaiting":
      paid = money(fee) + " booking fee paid";
      due = " · " + money(price) + " to pay at your appointment";
      break;
    case "completed":
      paid = money(price + fee) + " paid";
      pays = [
        {
          label:
            "Paid " +
            formatAccountDate(booking.at - DAY_MS * 9) +
            " · " +
            cardText(booking.card),
          amt: money(price + fee),
        },
      ];
      break;
    case "cancelled":
      paid = "Deposit of " + money(deposit) + " refunded";
      lines = [
        {
          label: "Deposit for " + booking.svc,
          sub: booking.cust,
          amt: money(deposit),
        },
        { label: "Booking fee", sub: "Not refundable", amt: money(fee) },
      ];
      total = deposit + fee;
      pays = [
        {
          label: "Paid · " + cardText(booking.card),
          amt: money(deposit + fee),
        },
        {
          label: "Refunded " + formatAccountDate(booking.at - DAY_MS * 3),
          amt: "−" + money(deposit),
        },
      ];
      break;
    case "noshow":
      paid = money(deposit + fee) + " paid";
      due = " · deposit kept as a no-show fee";
      lines = [
        {
          label: "Deposit for " + booking.svc,
          sub: "Kept as a no-show fee",
          amt: money(deposit),
        },
        { label: "Booking fee", sub: "", amt: money(fee) },
      ];
      total = deposit + fee;
      pays = [
        {
          label: "Paid · " + cardText(booking.card),
          amt: money(deposit + fee),
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
    pays,
    total,
  };
};

export type EditKey = "name" | "email" | "mob";

export const validateEdit = (
  key: EditKey,
  draft: Profile,
  currentEmail: string,
): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (key === "name") {
    if (!draft.first.trim()) errors.first = "Enter your first name";
    if (!draft.last.trim()) errors.last = "Enter your last name";
  }
  if (key === "email") {
    const value = draft.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value))
      errors.email = "Enter an email address like name@example.com";
    else if (value === currentEmail) errors.email = "That’s already your email";
    else if (TAKEN_EMAILS.includes(value))
      errors.email = "This email is already used by another account";
  }
  if (key === "mob") {
    const value = draft.mob.replace(/\D/g, "").replace(/^0/, "");
    if (!/^7\d{9}$/.test(value))
      errors.mob = "Enter a UK mobile number, like 07700 900123";
  }
  return errors;
};

/** Saves text as a file download. */
export const downloadFile = (name: string, text: string, type: string) => {
  try {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    // downloads unavailable
  }
};

/** An .ics calendar event for the booking. */
export const getCalendarFile = (
  booking: AccountBooking,
  { stylist, where }: BookingMoney,
): string => {
  const pad = (value: number) => String(value).padStart(2, "0");
  const format = (time: number) => {
    const date = new Date(time);
    return (
      date.getUTCFullYear() +
      pad(date.getUTCMonth() + 1) +
      pad(date.getUTCDate()) +
      "T" +
      pad(date.getUTCHours()) +
      pad(date.getUTCMinutes()) +
      "00Z"
    );
  };
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tiwaras House//Bookings//EN",
    "BEGIN:VEVENT",
    "UID:" + booking.id + "@tiwarashouse.co.uk",
    "DTSTAMP:" + format(Date.now()),
    "DTSTART:" + format(booking.at),
    "DTEND:" + format(booking.at + booking.mins * 6e4),
    "SUMMARY:" + booking.svc + " with " + stylist.name,
    "LOCATION:" + where.replace(/,/g, "\\,"),
    "DESCRIPTION:Booking " + booking.id,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
};

export interface ReceiptView {
  ref: string;
  date: string;
  stylist: string;
  where: string;
  total: string;
  lines: ReceiptLine[];
  pays: { label: string; amt: string }[];
}

export const getReceiptHtml = (receipt: ReceiptView, me: Profile): string => {
  const rows =
    receipt.lines
      .map(
        ({ label, sub, amt }) =>
          "<tr><td>" +
          label +
          (sub ? "<br><small>" + sub + "</small>" : "") +
          '</td><td align="right">' +
          amt +
          "</td></tr>",
      )
      .join("") +
    receipt.pays
      .map(
        ({ label, amt }) =>
          "<tr><td><small>" +
          label +
          '</small></td><td align="right"><small>' +
          amt +
          "</small></td></tr>",
      )
      .join("");
  return (
    '<!doctype html><meta charset="utf-8"><title>Receipt ' +
    receipt.ref +
    '</title><body style="font-family:sans-serif;max-width:480px;margin:40px auto;color:#1a1714"><h1>Tiwára’s House receipt</h1><p>' +
    receipt.ref +
    " · " +
    receipt.date +
    "<br>" +
    receipt.stylist +
    "<br>" +
    receipt.where +
    "<br>Billed to " +
    me.first +
    " " +
    me.last +
    '</p><table width="100%" cellpadding="8">' +
    rows +
    '<tr><th align="left">Total</th><th align="right">' +
    receipt.total +
    "</th></tr></table></body>"
  );
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
    ? digits.slice(0, 2) + " / " + digits.slice(2)
    : digits;
};

export const getCardErrors = (form: {
  num: string;
  exp: string;
  cvc: string;
}): Record<string, string> => {
  const errors: Record<string, string> = {};
  const number = form.num.replace(/\D/g, "");
  const expiry = form.exp.replace(/\D/g, "");
  if (number.length < 15) errors.num = "Enter your card number";
  const month = Number(expiry.slice(0, 2));
  const year = Number(expiry.slice(2, 4));
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  if (expiry.length < 4 || month < 1 || month > 12)
    errors.exp = "Enter the expiry date";
  else if (
    year < currentYear ||
    (year === currentYear && month < now.getMonth() + 1)
  )
    errors.exp = "This card has expired";
  if (!/^\d{3,4}$/.test(form.cvc)) errors.cvc = "Enter the 3 or 4-digit code";
  return errors;
};
