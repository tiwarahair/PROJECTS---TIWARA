// Demo address finder + UK postcode helpers.
// Real version: an address lookup API with the back end.
import { demoAddresses, postcodes } from "../data";
import type { AddressValue, DemoAddress } from "../types/address";

const MAX_RESULTS = 5;

const normalise = (value: unknown): string =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const compact = (value: unknown): string =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

/** Levenshtein distance, capped: anything more than one length apart counts as 2. */
const getEditDistance = (left: string, right: string): number => {
  const leftLength = left.length;
  const rightLength = right.length;

  if (Math.abs(leftLength - rightLength) > 1) return 2;

  let previous = Array.from(
    { length: rightLength + 1 },
    (_value, index) => index,
  );

  for (let row = 1; row <= leftLength; row++) {
    const current = [row];

    for (let column = 1; column <= rightLength; column++)
      current[column] = Math.min(
        (previous[column] ?? 0) + 1,
        (current[column - 1] ?? 0) + 1,
        (previous[column - 1] ?? 0) +
          (left[row - 1] === right[column - 1] ? 0 : 1),
      );

    previous = current;
  }

  return previous[rightLength] ?? 0;
};

/** True when `token` is within one edit of the start of `word` (small-typo matching). */
const isNearPrefix = (
  token: string,
  word: string,
  minPrefix: number,
): boolean =>
  getEditDistance(token, word.slice(0, token.length)) <= 1 ||
  getEditDistance(token, word.slice(0, token.length + 1)) <= 1 ||
  getEditDistance(
    token,
    word.slice(0, Math.max(minPrefix, token.length - 1)),
  ) <= 1;

export const formatPostcode = (value: unknown): string => {
  const code = compact(value);

  return code.length > 3 ? `${code.slice(0, -3)} ${code.slice(-3)}` : code;
};

export const isPostcodeValid = (value: unknown): boolean =>
  /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(compact(value));

export const getDistrict = (value: unknown): string => {
  const code = compact(value);

  return isPostcodeValid(code) ? code.slice(0, -3) : "";
};

export interface HighlightSegment {
  key: string;
  text: string;
  highlighted: boolean;
}

/** Split text into [{text, highlighted}] given matched [start, end) ranges. */
const toSegments = (
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

const getWordRanges = (
  text: string,
  token: string,
  length: number,
): [number, number][] => {
  const ranges: [number, number][] = [];
  const wordPattern = /[A-Za-z0-9]+/g;
  let match: RegExpExecArray | null;

  while ((match = wordPattern.exec(text))) {
    const word = match[0].toLowerCase();

    if (
      word.startsWith(token) ||
      (token.length >= 4 && isNearPrefix(token, word, 1))
    )
      ranges.push([match.index, match.index + Math.min(length, word.length)]);
  }

  return ranges;
};

export interface AddressSuggestion {
  address: DemoAddress;
  line: HighlightSegment[];
  secondaryLine: HighlightSegment[];
  typo: boolean;
}

export const searchAddresses = (query: string): AddressSuggestion[] => {
  const raw = String(query || "").trim();

  if (raw.length < 3) return [];

  const queryCode = compact(raw);

  // postcode mode: "M14 5", "M4 6AJ", "WA14"
  if (
    /^[A-Z]{1,2}\d[A-Z\d]?(\d[A-Z]{0,2})?$/.test(queryCode) &&
    /\d/.test(queryCode)
  ) {
    const parts = raw.toUpperCase().split(/\s+/);

    let hits = demoAddresses.filter(({ postcode }) => {
      const addressCode = compact(postcode);
      const outward = addressCode.slice(0, -3);

      if (parts.length > 1)
        return (
          outward === compact(parts[0]) &&
          addressCode
            .slice(outward.length)
            .startsWith(compact(parts.slice(1).join("")))
        );

      return (
        outward === queryCode ||
        (addressCode.startsWith(queryCode) && queryCode.length > outward.length)
      );
    });

    if (!hits.length && !/\s/.test(raw))
      hits = demoAddresses.filter(({ postcode }) =>
        compact(postcode).startsWith(queryCode),
      );

    if (hits.length)
      return hits.slice(0, MAX_RESULTS).map((address) => {
        const { line1, line2, town, postcode } = address;
        const secondaryText = `${town}, ${postcode}`;
        const postcodeStart = secondaryText.length - postcode.length;
        let matched = 0;
        let end = postcodeStart;

        for (
          let index = postcodeStart;
          index < secondaryText.length && matched < queryCode.length;
          index++
        ) {
          if (secondaryText[index] !== " ") matched++;

          end = index + 1;
        }

        return {
          address,
          line: toSegments(line1 + (line2 ? `, ${line2}` : ""), []),
          secondaryLine: toSegments(secondaryText, [[postcodeStart, end]]),
          typo: false,
        };
      });
  }

  const tokens = normalise(raw).split(" ").filter(Boolean);

  if (!tokens.length) return [];

  const scored: { address: DemoAddress; score: number; typo: boolean }[] = [];

  demoAddresses.forEach((address) => {
    const { line1, line2, town, postcode } = address;

    const haystack = normalise([line1, line2, town, postcode].join(" ")).split(
      " ",
    );

    let score = 0;
    let typo = false;

    for (const token of tokens) {
      let best = 0;

      for (const word of haystack) {
        if (word.startsWith(token))
          best = Math.max(best, word === token ? 3 : 2);
        else if (
          !/^\d+$/.test(token) &&
          token.length >= 4 &&
          isNearPrefix(token, word, 0)
        )
          best = Math.max(best, 1);
      }

      if (!best) return;

      if (best === 1) typo = true;

      score += best;
    }

    scored.push({ address, score, typo });
  });

  scored.sort(
    (left, right) =>
      right.score - left.score ||
      left.address.line1.localeCompare(right.address.line1, "en", {
        numeric: true,
      }),
  );

  return scored.slice(0, MAX_RESULTS).map(({ address, typo }) => {
    const { line1, line2, town, postcode } = address;
    const line = line1 + (line2 ? `, ${line2}` : "");
    const secondaryText = `${town}, ${postcode}`;
    const lineRanges: [number, number][] = [];
    const secondaryRanges: [number, number][] = [];

    tokens.forEach((token) => {
      lineRanges.push(...getWordRanges(line, token, token.length));

      secondaryRanges.push(
        ...getWordRanges(secondaryText, token, token.length),
      );
    });

    return {
      address,
      line: toSegments(line, lineRanges),
      secondaryLine: toSegments(secondaryText, secondaryRanges),
      typo,
    };
  });
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

export interface PostcodeGeo {
  district: string;
  lat: number | null;
  lng: number | null;
}

export const getPostcodeGeo = (postcode: unknown): PostcodeGeo => {
  const district = getDistrict(postcode);
  const known = district ? postcodes[district] : undefined;

  return known
    ? { district, lat: known.lat, lng: known.lng }
    : { district, lat: null, lng: null };
};

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
