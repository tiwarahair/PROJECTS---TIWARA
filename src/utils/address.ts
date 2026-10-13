// UK postcode and address helpers (suggestions come from Google Places).
import type { AddressValue } from "../types/address";

const compact = (value = ""): string =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, "");

export const formatPostcode = (value?: string): string => {
  const code = compact(value);

  return code.length > 3 ? `${code.slice(0, -3)} ${code.slice(-3)}` : code;
};

export const isPostcodeValid = (value?: string): boolean =>
  /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(compact(value));

export const getDistrict = (value: string): string => {
  const code = compact(value);

  return isPostcodeValid(code) ? code.slice(0, -3) : "";
};

export interface HighlightSegment {
  key: string;
  text: string;
  highlighted: boolean;
}

/** Split text into [{text, highlighted}] given matched [start, end) ranges. */
export const toSegments = (
  text: string,
  ranges: [number, number][],
): HighlightSegment[] => {
  const segments: Omit<HighlightSegment, "key">[] = [];
  let cursor = 0;

  ranges
    .sort((left, right) => left[0] - right[0])
    .forEach(([rangeStart, end]) => {
      const start = rangeStart < cursor ? cursor : rangeStart;

      if (end <= start) return;

      if (start > cursor)
        segments.push({ text: text.slice(cursor, start), highlighted: false });

      segments.push({ text: text.slice(start, end), highlighted: true });
      cursor = end;
    });

  if (cursor < text.length)
    segments.push({ text: text.slice(cursor), highlighted: false });

  return segments.map((segment, index) => ({ key: `s${index}`, ...segment }));
};

export const isAddressValid = (
  address: AddressValue | null | undefined,
): boolean =>
  !!(
    address &&
    String(address.line1 || "").trim() &&
    String(address.town || "").trim() &&
    isPostcodeValid(address.postcode)
  );

export const getAddressLines = (
  address: AddressValue | null | undefined,
): string[] =>
  address
    ? [
        address.line1,
        address.line2,
        address.town,
        formatPostcode(address.postcode),
      ].filter((part): part is string => !!String(part || "").trim())
    : [];

export const getAddressOneLine = (
  address: AddressValue | null | undefined,
): string => getAddressLines(address).join(", ");
