// Step 4 (Your details) validation and the address / where copy, plus Step 6 card formatting and checks
// (prototype Booking renderVals: E / fe, postcode travel check, whereRow, TYPO, pNum / pExp / payNow).
import { postcodes } from "../../data";
import type { Stylist } from "../../types/stylist";
import { isAddressValid } from "../../utils/address";
import { miles } from "../../utils/availability";
import type { BookingAddress, Details, FieldKey } from "./booking-state";

export const FIELD_KEYS: FieldKey[] = [
  "address",
  "first",
  "last",
  "email",
  "phone",
];

export interface AddressCheck {
  postcodeLabel: string;
  isValid: boolean;
  inArea: boolean;
  outBlock: boolean;
  clientAddress: string;
}

/** Mobile stylists: is the client's postcode a known district within the stylist's travelMiles? */
export const getAddressCheck = (
  stylist: Stylist,
  address: BookingAddress,
): AddressCheck => {
  const isMobile = stylist.businessType === "mobile";
  const raw = (address.postcode || "").toUpperCase().replace(/\s+/g, "");
  const match = raw.match(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/);

  const postcodeLabel = match
    ? `${match[1]} ${match[2]}`
    : (address.postcode || "").toUpperCase().trim();

  const district = match?.[1];
  const info = district ? (postcodes[district] ?? null) : null;

  const distance = info
    ? miles(stylist.lat, stylist.lng, info.lat, info.lng)
    : null;

  const isValid = isAddressValid(address);
  const checked = isMobile && !!info && isValid;

  const inArea =
    checked &&
    distance != null &&
    stylist.travelMiles != null &&
    distance <= stylist.travelMiles;

  const clientAddress = address.line1.trim()
    ? [address.line1, address.line2, address.town]
        .filter((part) => part && part.trim())
        .join(", ") + (postcodeLabel ? ` ${postcodeLabel}` : "")
    : "";

  return {
    postcodeLabel,
    isValid,
    inArea,
    outBlock: checked && !inArea,
    clientAddress,
  };
};

export type FieldErrors = Partial<Record<FieldKey, string>>;

export const getFieldErrors = (
  details: Details,
  isMobile: boolean,
  addressValid: boolean,
): FieldErrors => {
  const errors: FieldErrors = {};
  const digits = (details.phone || "").replace(/\D/g, "").replace(/^44/, "");

  if (isMobile && !addressValid) errors.address = "Enter your address";

  if (!details.first.trim()) errors.first = "Enter your first name";

  if (!details.last.trim()) errors.last = "Enter your last name";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(details.email.trim()))
    errors.email = "Enter an email address";

  if (!/^0?7\d{9}$/.test(digits)) errors.phone = "Enter a UK mobile number";

  return errors;
};

/** The element to focus after a failed Continue: "@address" for the address finder, else the input id. */
export const getFirstErrorTarget = (
  errors: FieldErrors,
  outBlock: boolean,
): string | null => {
  const [first] = FIELD_KEYS.filter((key) => errors[key]);

  if (first) return first === "address" ? "@address" : `bk-${first}`;

  return outBlock ? "@address" : null;
};

const EMAIL_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gamil.com": "gmail.com",
  "hotmial.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "yaho.com": "yahoo.com",
  "icloud.co": "icloud.com",
};

/** "nia@gmial.com" → "nia@gmail.com"; empty when the domain looks fine. */
export const getEmailFix = (email: string): string => {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  const fix = at > 0 ? EMAIL_TYPOS[trimmed.slice(at + 1).toLowerCase()] : "";

  return fix ? trimmed.slice(0, at + 1) + fix : "";
};

/** Where wording by business type: [row value, row sub-line]. */
export const getWhereRow = (
  stylist: Stylist,
  clientAddress: string,
): [string, string] => {
  const { businessType, name, areaShort, addressFull } = stylist;

  if (businessType === "mobile")
    return [clientAddress || "Address not added yet", `${name} comes to you`];

  if (businessType === "homeBased")
    return [areaShort, "Full address shared once you've booked"];

  return [name, addressFull];
};

export const getSummaryWhere = (
  stylist: Stylist,
  clientAddress: string,
): string => {
  const { businessType, name, areaShort, addressFull } = stylist;

  if (businessType === "mobile") return clientAddress || `${name} comes to you`;

  if (businessType === "homeBased")
    return `${areaShort} — full address shared once you've booked`;

  return `${name}, ${addressFull}`;
};

const isAmex = (digits: string): boolean => /^3[47]/.test(digits);

export const getCardBrand = (cardNumber: string): string => {
  const digits = cardNumber.replace(/\D/g, "");

  if (/^4/.test(digits)) return "Visa";

  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";

  if (isAmex(digits)) return "Amex";

  if (/^(6011|65)/.test(digits)) return "Discover";

  return "";
};

export const getCvcLabel = (cardNumber: string): string =>
  isAmex(cardNumber.replace(/\D/g, "")) ? "CVC (4 digits)" : "CVC";

/** Groups card digits 4-4-4-4 (Amex 4-6-5). */
export const formatCardNumber = (value: string): string => {
  const all = value.replace(/\D/g, "");
  const digits = all.slice(0, isAmex(all) ? 15 : 16);
  const groups = isAmex(digits) ? [4, 6, 5] : [4, 4, 4, 4];
  const out: string[] = [];
  let start = 0;

  for (const size of groups) {
    if (start < digits.length) out.push(digits.slice(start, start + size));

    start += size;
  }

  return out.join(" ");
};

/** "MM / YY"; a first digit above 1 becomes "0x". */
export const formatExpiry = (value: string): string => {
  let digits = value.replace(/\D/g, "").slice(0, 4);

  if (digits.length >= 1 && Number(digits[0]) > 1)
    digits = `0${digits.slice(0, 3)}`;

  return digits.length > 2
    ? `${digits.slice(0, 2)} / ${digits.slice(2)}`
    : digits;
};

interface CardFields {
  number: string;
  expiry: string;
  cvc: string;
  name: string;
  postcode: string;
}

/** The first card problem, or "" when the card can be sent. */
export const getCardError = ({
  number,
  expiry,
  cvc,
  name,
  postcode,
}: CardFields): string => {
  const digits = number.replace(/\D/g, "");
  const amex = isAmex(digits);

  const [month = NaN, year = NaN] = expiry
    .split("/")
    .map((part) => parseInt(part, 10));

  if (digits.length < (amex ? 15 : 16))
    return "Check the card number — it looks incomplete.";

  if (!(month >= 1 && month <= 12 && year >= 0))
    return "Check the expiry date.";

  if (cvc.length < (amex ? 4 : 3))
    return "Check the security code on the back of your card.";

  if (!name.trim()) return "Add the name printed on the card.";

  if (postcode.replace(/\s/g, "").length < 5)
    return "Add your billing postcode.";

  return "";
};
