import { parseNumber } from "../../core/format";
import type { OwnOption, VariationRow, WizardDraft } from "../../core/types";

const SIGN_ADD = "Adds to the base price and time. Click to take off instead.";
const SIGN_OFF = "Takes off the base price and time. Click to add instead.";

/** "−5", "05" → "5". */
export const getAbsolute = (value: string) => {
  const clean = value.replace(/[^0-9.]/g, "").replace(/^0+(?=\d)/, "");

  return clean === "" ? "0" : clean;
};

/** Whether a row takes off rather than adds. */
export const isNegative = (row: {
  negative?: boolean;
  priceDelta?: string;
  hoursDelta?: string;
  minutesDelta?: string;
}) =>
  row.negative != null
    ? !!row.negative
    : [row.priceDelta, row.hoursDelta, row.minutesDelta].some(
        (value) =>
          /^\s*[-−]/.test(value ?? "") &&
          parseFloat((value ?? "").replace(/[^0-9.]/g, "")) > 0,
      );

export const isOwnNegative = (option: OwnOption) =>
  !!option.negative ||
  /^\s*-/.test(option.priceDelta) ||
  /^\s*-/.test(option.minutesDelta);

export const getSigned = (value: string, isNegativeValue: boolean) => {
  const absoluteValue = getAbsolute(value);

  return (
    (isNegativeValue && parseFloat(absoluteValue) > 0 ? "-" : "") +
    absoluteValue
  );
};

export const getSign = (isNegativeValue: boolean) => ({
  signText: isNegativeValue ? "−" : "+",
  isNegativeValue,
  signAria: isNegativeValue
    ? "Take off price and time"
    : "Add to price and time",
});

export const getSignTip = (isNegativeValue: boolean) =>
  isNegativeValue ? SIGN_OFF : SIGN_ADD;

/** Takes off more than the base allows. */
const getAdjustErrors = (
  isNegativeValue: boolean,
  price: string,
  minutes: number,
  basePrice: number,
  baseMinutes: number,
) => ({
  priceError:
    isNegativeValue && basePrice - (parseFloat(price) || 0) < 0
      ? "This would make the price less than £0."
      : "",
  timeError:
    isNegativeValue && baseMinutes - minutes < 0
      ? "This would make the time less than 0."
      : "",
});

export interface WizardBase {
  basePrice: number;
  baseHours: number;
  baseMinutes: number;
  totalMinutes: number;
}

export const getWizardBase = (draft: WizardDraft): WizardBase => {
  const basePrice = parseNumber(draft.price);
  const baseHours = parseNumber(draft.durationHours);
  const baseMinutes = parseNumber(draft.durationMinutes);

  return {
    basePrice,
    baseHours,
    baseMinutes,
    totalMinutes: baseHours * 60 + baseMinutes,
  };
};

export const getVariationErrors = (row: VariationRow, base: WizardBase) => {
  if (!row.on) return { priceError: "", timeError: "" };

  return getAdjustErrors(
    isNegative(row),
    getAbsolute(row.priceDelta),
    (parseFloat(getAbsolute(row.hoursDelta)) || 0) * 60 +
      (parseFloat(getAbsolute(row.minutesDelta)) || 0),
    base.basePrice,
    base.totalMinutes,
  );
};

export const getOwnErrors = (option: OwnOption, base: WizardBase) =>
  getAdjustErrors(
    isOwnNegative(option),
    getAbsolute(option.priceDelta),
    parseFloat(getAbsolute(option.minutesDelta)) || 0,
    base.basePrice,
    base.totalMinutes,
  );

export const hasErrors = ({
  priceError,
  timeError,
}: ReturnType<typeof getAdjustErrors>) => !!(priceError || timeError);
