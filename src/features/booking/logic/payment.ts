import type { Appearance } from "@stripe/stripe-js";
import type { CheckoutRequest } from "../../../lib/booking-api";
import type { LatLng } from "../../../lib/google-maps";
import type { BookingState } from "./types";

export const PAY_ERRORS = {
  network: "Something went wrong and you haven't been charged. Try again.",
  human: "We couldn't check this browser. Try again.",
  busy: "Too many tries. Wait a few minutes, then try again.",
  address: "We can't book this address. Check it on Your details.",
  pending:
    "Your payment went through and we're confirming your booking. We'll email you as soon as it's done.",
};

/** The checkout's refusal as the Pay step shows it: its kind and message. */
export const getCheckoutError = (code: string, time: string | null) => {
  if (code === "hold_not_found")
    return {
      payKind: "taken",
      payError: `Sorry, ${time ?? "that time"} is no longer held for you. You haven't been charged.`,
    };

  if (code === "outside_area" || code === "address_required")
    return { payKind: "address", payError: PAY_ERRORS.address };

  if (code === "turnstile_failed")
    return { payKind: "network", payError: PAY_ERRORS.human };

  if (code === "rate_limited")
    return { payKind: "network", payError: PAY_ERRORS.busy };

  return { payKind: "network", payError: PAY_ERRORS.network };
};

export const getCheckoutRequest = (
  state: BookingState,
  point: LatLng | null,
  turnstileToken: string,
): CheckoutRequest | null => {
  const { hold, details, appointmentAddress, loggedIn, keepCard } = state;

  if (!hold) return null;

  const { notes, ...contact } = details;
  const { line1, line2, town, postcode } = appointmentAddress;
  const addressNotes = appointmentAddress.notes;

  return {
    hold: { id: hold.id, secret: hold.secret },
    contact,
    notes,
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

/** The Payment Element in the booking's fonts and colours (it can't read the page's CSS). */
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
    borderRadius: "12px",
  },
  rules: {
    ".Input": { border: "1px solid #d4cbb9", boxShadow: "none" },
  },
});

export const getPaymentFonts = () => [
  {
    family: "Hanken Grotesk",
    src: `url(${window.location.origin}/fonts/hanken-grotesk-latin-v12.woff2)`,
    weight: "300 800",
  },
];
