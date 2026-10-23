import type { Appearance } from "@stripe/stripe-js";
import type { CheckoutRequest } from "../../../lib/booking-api";
import type { LatLng } from "../../../lib/google-maps";
import type { BookingState } from "./types";

export const PAY_ERRORS = {
  network: "Something went wrong and you haven't been charged. Try again.",
  human: "We couldn't check this browser. Try again.",
  busy: "Too many tries. Wait a few minutes, then try again.",
  address: "We can't book this address. Check it on Your details.",
  stylist:
    "This stylist can't take payments online yet, so you haven't been charged. Try another stylist.",
  unpaidFee:
    "You have an unpaid fee with this stylist, so you haven't been charged. Pay it from the link we emailed you, then book again.",
  pending:
    "Your payment went through and we're confirming your booking. We'll email you as soon as it's done.",
};

export const getRefundedError = (time: string | null) => ({
  payKind: "taken",
  payError: `Sorry, ${time ?? "that time"} was booked by someone else while you paid. We've refunded you in full.`,
});

interface StylistContact {
  name: string;
  email?: string;
}

const getBlockedError = ({ name, email }: StylistContact) =>
  `${name} isn’t taking online bookings for this contact. Please get in touch with them directly${email ? ` at ${email}` : ""}. You haven't been charged.`;

export const getCheckoutError = (
  code: string,
  time: string | null,
  stylist?: StylistContact,
) => {
  if (code === "hold_not_found")
    return {
      payKind: "taken",
      payError: `Sorry, ${time ?? "that time"} is no longer held for you. You haven't been charged.`,
    };

  if (code === "outside_area" || code === "address_required")
    return { payKind: "address", payError: PAY_ERRORS.address };

  if (code === "turnstile_failed")
    return { payKind: "network", payError: PAY_ERRORS.human };

  if (code === "stylist_not_ready")
    return { payKind: "network", payError: PAY_ERRORS.stylist };

  if (code === "rate_limited")
    return { payKind: "network", payError: PAY_ERRORS.busy };

  if (code === "unpaid_fee")
    return { payKind: "network", payError: PAY_ERRORS.unpaidFee };

  if (code === "not_bookable_contact" && stylist)
    return { payKind: "network", payError: getBlockedError(stylist) };

  return { payKind: "network", payError: PAY_ERRORS.network };
};

export const getCheckoutRequest = (
  state: BookingState,
  point: LatLng | null,
  turnstileToken: string,
): CheckoutRequest | null => {
  const { hold, details, appointmentAddress, loggedIn, keepCard, allergy } =
    state;

  if (!hold) return null;

  const { notes, ...contact } = details;
  const { line1, line2, town, postcode } = appointmentAddress;
  const addressNotes = appointmentAddress.notes;

  return {
    hold: { id: hold.id, secret: hold.secret },
    contact,
    notes,
    allergies: allergy.on ? allergy.text.trim() : "",
    ...(point && line1
      ? {
          address: {
            line1,
            line2,
            town,
            postcode,
            notes: addressNotes,
            ...point,
          },
        }
      : {}),
    keepCard: loggedIn && keepCard,
    turnstileToken,
  };
};

export const toPence = (pounds: number) => Math.round(pounds * 100);

export const WALLET_BUTTON_HEIGHT = 48;

export const getPaymentAppearance = (): Appearance => ({
  theme: "stripe",
  variables: {
    fontFamily: '"Hanken Grotesk", sans-serif',
    fontSizeBase: "15px",
    colorPrimary: "#8f1112",
    colorText: "#1a1714",
    colorTextSecondary: "#7d7465",
    colorDanger: "#8f1112",
    colorBackground: "#fffefb",
    borderRadius: `${WALLET_BUTTON_HEIGHT / 2}px`,
  },
  rules: {
    ".Input": {
      border: "1px solid #d4cbb9",
      boxShadow: "none",
      borderRadius: "12px",
    },
  },
});

export const getPaymentFonts = () => [
  {
    family: "Hanken Grotesk",
    src: `url(${window.location.origin}/fonts/hanken-grotesk-latin-v12.woff2)`,
    weight: "300 800",
  },
];
