import type { Stylist } from "../../../types/stylist";
import {
  formatPostcode,
  isAddressValid,
  isPostcodeValid,
} from "../../../utils/address";
import type { BookingAddress, Details, FieldKey } from "./types";

const FIELD_KEYS: FieldKey[] = ["address", "first", "last", "email", "phone"];

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
