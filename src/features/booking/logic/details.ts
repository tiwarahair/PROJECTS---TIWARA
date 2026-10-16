// Step 4 (Your details) error focus and the address / where copy, plus Step 6 card formatting and checks.
import type { Stylist } from "../../../types/stylist";
import {
  formatPostcode,
  isAddressValid,
  isPostcodeValid,
} from "../../../utils/address";
import type { BookingAddress, Details, FieldKey } from "./types";

const FIELD_KEYS: FieldKey[] = ["address", "first", "last", "email", "phone"];

/** The client's address for mobile stylists: complete?, "M14 5AB", and the one-line address. */
export const getAddressCheck = (address: BookingAddress) => {
  const { postcode } = address;

  const postcodeLabel = isPostcodeValid(postcode)
    ? formatPostcode(postcode)
    : postcode.toUpperCase().trim();

  const clientAddress = address.line1.trim()
    ? [address.line1, address.line2, address.town]
        .filter((part) => part && part.trim())
        .join(", ") + (postcodeLabel ? ` ${postcodeLabel}` : "")
    : "";

  return {
    postcodeLabel,
    isValid: isAddressValid(address),
    clientAddress,
  };
};

type FieldErrors = Partial<Record<FieldKey, unknown>>;

/** The element to focus after a failed Continue: "@address" for the address finder, else the input id. */
export const getFirstErrorTarget = (
  errors: FieldErrors,
  outBlock: boolean,
): string | null => {
  const first = FIELD_KEYS.find((key) => errors[key]);

  if (first) return first === "address" ? "@address" : `bk-${first}`;

  return outBlock ? "@address" : null;
};

interface ContactProfile {
  first: string;
  last: string;
  mobile: string;
}

export const getContactChanges = (
  { first, last, phone }: Details,
  profile: ContactProfile,
) => ({
  ...(first.trim() !== profile.first && { first: first.trim() }),
  ...(last.trim() !== profile.last && { last: last.trim() }),
  ...(phone.trim() !== profile.mobile && { mobile: phone.trim() }),
});

export const formatMobile = (value: string) => {
  const digits = value.replace(/\D/g, "").replace(/^44/, "").replace(/^0/, "");

  return /^7\d{9}$/.test(digits)
    ? `0${digits.slice(0, 4)} ${digits.slice(4)}`
    : value;
};

const EMAIL_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gamil.com": "gmail.com",
  "hotmial.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "yaho.com": "yahoo.com",
  "icloud.co": "icloud.com",
};

const ENDING_TYPOS: [RegExp, string][] = [
  [/\.com[a-z]{1,2}$/, ".com"],
  [/\.(con|cmo|ocm|cpm|vom|xom|coom)$/, ".com"],
  [/\.co\.uk[a-z]+$/, ".co.uk"],
  [/\.(co\.uj|co\.ul|co\.yk)$/, ".co.uk"],
];

/** "nia@gmial.com" → "nia@gmail.com", "nia@gmail.comss" → "nia@gmail.com"; empty when the domain looks fine. */
export const getEmailFix = (email: string): string => {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");

  if (at <= 0) return "";

  const typed = trimmed.slice(at + 1).toLowerCase();

  const [pattern, ending = ""] =
    ENDING_TYPOS.find(([typo]) => typo.test(typed)) ?? [];

  const domain = pattern ? typed.replace(pattern, ending) : typed;
  const fix = EMAIL_TYPOS[domain] ?? domain;

  return fix === typed ? "" : trimmed.slice(0, at + 1) + fix;
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
